import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadRegistry } from '../registry/load.js';
import { waybackOver } from './archive.js';
import { collectUrls } from './collect.js';
import { createJiraReporter, type JiraHttp } from './jira.js';
import { createProber } from './probe.js';
import { gitHubOver } from './pull-request.js';
import { emptyState, runLinkCheck, type LinkState } from './run.js';

/*
 * The link checker's entry point (spec 010 US4, contracts/link-check.md), run weekly by
 * `.github/workflows/link-check.yml` through `scripts/link-check.ts`. Never imported by the
 * registry CLI, the Astro config or a page (SC-008). The secrets are checked before any request;
 * `--dry-run` reads the registry and makes no request at all.
 *
 * Exit codes: 0 the run finished (dead links are reported, not failures); 1 the run failed; 2 usage
 * or a missing secret.
 */

export interface Io {
  stdout(text: string): void;
  stderr(text: string): void;
}

const REQUIRED = ['JIRA_USER', 'JIRA_API_TOKEN', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY'] as const;
const DEFAULT_JIRA = 'https://vladsimion.atlassian.net';

function jiraOver(fetchImpl: typeof fetch, base: string, user: string, token: string): JiraHttp {
  const auth = `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`;
  return async (method, path, body) => {
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers: { authorization: auth, accept: 'application/json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? (JSON.parse(text) as unknown) : null };
  };
}

export async function main(argv: string[], env: Record<string, string | undefined>, io: Io, fetchImpl: typeof fetch = fetch): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { dir: { type: 'string', default: '.' }, state: { type: 'string', default: 'linkcheck-state.json' }, 'dry-run': { type: 'boolean', default: false } } }));
  } catch (error) {
    io.stderr(`link-check: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
  const root = values.dir as string;
  const statePath = values.state as string;

  if (values['dry-run']) {
    const { records } = await loadRegistry(root);
    const collected = collectUrls(records);
    const hosts = new Set(collected.map((c) => new URL(c.url).host));
    io.stdout(`link-check (dry run): ${collected.length} URLs on ${hosts.size} hosts, ${collected.filter((c) => c.manifest).length} IIIF manifests; no request made, nothing written\n`);
    return 0;
  }

  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    io.stderr(`link-check: missing ${missing.join(', ')}; set them as Actions secrets (spec 010 T061). No request was made.\n`);
    return 2;
  }

  try {
    const state: LinkState = existsSync(statePath) ? (JSON.parse(await readFile(statePath, 'utf8')) as LinkState) : emptyState();
    const prober = createProber({ fetch: fetchImpl });
    const today = new Date().toISOString().slice(0, 10);
    const { state: next, summary } = await runLinkCheck({
      root,
      state,
      today,
      probe: (url) => prober.probe(url),
      fetchManifest: async (url) => (await fetchImpl(url, { signal: AbortSignal.timeout(30_000) })).json(),
      jira: createJiraReporter(jiraOver(fetchImpl, env.JIRA_BASE_URL ?? DEFAULT_JIRA, env.JIRA_USER as string, env.JIRA_API_TOKEN as string)),
      wayback: waybackOver(fetchImpl),
      github: gitHubOver(fetchImpl, env.GITHUB_REPOSITORY as string, env.GITHUB_TOKEN as string),
    });
    await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`);
    io.stdout(
      `link-check: ${summary.urls} URLs on ${summary.hosts} hosts: ${summary.ok} ok, ${summary.dead} dead, ${summary.unreachable} unreachable; ${summary.reported} reported, ${summary.manifestsChanged} manifests changed, ${summary.archived} archived copies proposed${summary.pullRequest ? ` (${summary.pullRequest})` : ''}\n`,
    );
    return 0;
  } catch (error) {
    io.stderr(`link-check: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
