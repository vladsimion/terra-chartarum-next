import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isMap, parseDocument } from 'yaml';
import type { ArchiveProposal } from './archive.js';

/*
 * The archived-copy pull request (spec 010 FR-018, contracts/link-check.md): every proposal of one
 * run on one branch, `linkcheck/archived-copies-<date>`, in one pull request against main, adding
 * only `locator.archived_copy` and `locator.archived_on`. The files are edited in memory and
 * committed through the injected GitHub client: the run's own working tree is never written, nothing
 * is pushed to main, and nothing is merged. A person reviews and merges, and the gate checks it.
 */

export interface GitHubClient {
  createBranch(name: string): Promise<void>;
  commitFiles(branch: string, files: { path: string; content: string }[], message: string): Promise<void>;
  openPullRequest(pr: { head: string; base: string; title: string; body: string }): Promise<{ number: number; url: string }>;
  /**
   * Start the `registry` workflow on the branch. A pull request opened with the workflow's own token
   * starts no other workflow (GitHub's rule against recursive runs), so without this the gate would
   * never run on it; `workflow_dispatch` is the exception GitHub allows.
   */
  runGate(branch: string): Promise<void>;
}

/**
 * The record's YAML with the two locator fields added at the end of its locator block. The lines
 * are inserted as text, so every other byte of the file, comments and spacing included, is kept;
 * the result is parsed back to prove only the two fields changed.
 */
export function withArchivedCopy(yamlText: string, archivedCopy: string, archivedOn: string): string {
  const before = parseDocument(yamlText);
  if (!isMap(before.get('locator'))) throw new Error('the record has no locator to add an archived copy to');
  const lines = yamlText.split('\n');
  const start = lines.findIndex((line) => /^locator:\s*(#.*)?$/.test(line));
  if (start === -1) throw new Error('the locator is not a block mapping, so it cannot be edited in place');
  let last = start;
  let indent = '  ';
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (line.trim() === '') continue;
    const lead = /^(\s+)\S/.exec(line);
    if (!lead) break;
    if (last === start) indent = lead[1] as string;
    last = i;
  }
  const added = [`${indent}archived_copy: ${JSON.stringify(archivedCopy)}`, `${indent}archived_on: '${archivedOn}'`];
  const result = [...lines.slice(0, last + 1), ...added, ...lines.slice(last + 1)].join('\n');
  const expected = before.toJS() as Record<string, Record<string, unknown>>;
  expected.locator = { ...expected.locator, archived_copy: archivedCopy, archived_on: archivedOn };
  if (JSON.stringify(parseDocument(result).toJS()) !== JSON.stringify(expected)) throw new Error('adding the archived copy would change more than the two locator fields');
  return result;
}

export async function openArchivePullRequest(options: {
  root: string;
  proposals: ArchiveProposal[];
  github: GitHubClient;
  date: string;
}): Promise<{ number: number; url: string } | null> {
  const { root, proposals, github, date } = options;
  if (proposals.length === 0) return null;
  const files = await Promise.all(
    proposals.map(async (p) => ({ path: p.file, content: withArchivedCopy(await readFile(path.join(root, p.file), 'utf8'), p.archived_copy, p.archived_on) })),
  );
  const branch = `linkcheck/archived-copies-${date}`;
  await github.createBranch(branch);
  await github.commitFiles(branch, files, `Archived copies of ${proposals.length} consulted ${proposals.length === 1 ? 'copy' : 'copies'} (link check ${date})`);
  const body = [
    `The weekly link check (spec 010 US4) found a web-archive snapshot for ${proposals.length} verified ${proposals.length === 1 ? 'locator' : 'locators'} with no archived copy. Each change adds only \`locator.archived_copy\` and \`locator.archived_on\`; the verification is untouched.`,
    '',
    '| Record | Consulted copy | Archived copy |',
    '|---|---|---|',
    ...proposals.map((p) => `| \`${p.id}\` | ${p.url} | ${p.archived_copy} (${p.archived_on}) |`),
    '',
    'Check that each snapshot shows the copy the locator was read against, then merge. The gate runs on this pull request as on any other.',
  ].join('\n');
  const pr = await github.openPullRequest({ head: branch, base: 'main', title: `Archived copies from the link check of ${date}`, body });
  await github.runGate(branch);
  return pr;
}

/** The real client over the GitHub REST API (git data endpoints), with the workflow's token. */
export function gitHubOver(fetchImpl: typeof fetch, repository: string, token: string, base = 'main'): GitHubClient {
  const api = async (method: string, route: string, body?: unknown) => {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}${route}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${route} answered ${response.status}`);
    return response.json() as Promise<Record<string, unknown>>;
  };
  return {
    async createBranch(name) {
      const ref = await api('GET', `/git/ref/heads/${base}`);
      await api('POST', '/git/refs', { ref: `refs/heads/${name}`, sha: (ref.object as { sha: string }).sha });
    },
    async commitFiles(branch, files, message) {
      const ref = await api('GET', `/git/ref/heads/${branch}`);
      const parent = (ref.object as { sha: string }).sha;
      const commit = await api('GET', `/git/commits/${parent}`);
      const tree = await api('POST', '/git/trees', {
        base_tree: (commit.tree as { sha: string }).sha,
        tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
      });
      const created = await api('POST', '/git/commits', { message, tree: tree.sha, parents: [parent] });
      await api('PATCH', `/git/refs/heads/${branch}`, { sha: created.sha });
    },
    async openPullRequest(pr) {
      const json = await api('POST', '/pulls', pr);
      return { number: json.number as number, url: json.html_url as string };
    },
    async runGate(branch) {
      const response = await fetchImpl(`https://api.github.com/repos/${repository}/actions/workflows/registry.yml/dispatches`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
        body: JSON.stringify({ ref: branch }),
      });
      if (!response.ok) throw new Error(`GitHub could not start the registry workflow on ${branch}: ${response.status}`);
    },
  };
}
