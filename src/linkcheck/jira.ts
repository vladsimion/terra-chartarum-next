import { createHash } from 'node:crypto';
import type { UrlUse } from './collect.js';
import type { FingerprintDiff } from './manifest.js';
import type { ProbeResult } from './probe.js';

/*
 * Reporting to Jira (spec 010 FR-016, FR-017, SC-006, contracts/link-check.md "Jira issues"). One
 * issue per URL in project TCX, found again by a label made from the URL's hash, so a rerun updates
 * the open issue instead of opening another. Recovery adds a comment; nothing is ever closed here.
 * Jira Cloud REST v3 through an injected HTTP function; no test touches the network.
 */

export type JiraHttp = (method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) => Promise<{ status: number; json: unknown }>;

export const PROJECT = 'TCX';

/** The first 12 hex digits of SHA-256 of the URL: the URL's fingerprint label. */
export function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

/** `<host><path>`, as the issue summary names a URL. */
function hostPath(url: string): string {
  const u = new URL(url);
  return `${u.host}${u.pathname}`;
}

// Atlassian Document Format, as little of it as the issues need.
type Adf = Record<string, unknown>;
const text = (t: string): Adf => ({ type: 'text', text: t });
const paragraph = (t: string): Adf => ({ type: 'paragraph', content: [text(t)] });
const bullets = (items: string[]): Adf => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [paragraph(i)] })) });
const doc = (...content: Adf[]): Adf => ({ type: 'doc', version: 1, content });

export interface ManifestDependents {
  /** The map records whose image is this manifest. */
  maps: UrlUse[];
  /** Layers whose georeference points at one of those maps. */
  georeferences: string[];
}

export function createJiraReporter(http: JiraHttp, project = PROJECT) {
  async function call(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<unknown> {
    const { status, json } = await http(method, path, body);
    if (status < 200 || status >= 300) throw new Error(`Jira ${method} ${path} answered ${status}`);
    return json;
  }

  /** The open issue carrying a label, if any. */
  async function findOpen(label: string): Promise<string | null> {
    const json = (await call('POST', '/rest/api/3/search/jql', {
      jql: `project = ${project} AND labels = "${label}" AND statusCategory != Done ORDER BY created ASC`,
      fields: ['summary'],
      maxResults: 1,
    })) as { issues?: { key: string }[] };
    return json.issues?.[0]?.key ?? null;
  }

  /** Update the open issue with this label, or create one. Returns its key. */
  async function upsert(label: string, fields: { summary: string; description: Adf; priority?: string }): Promise<string> {
    const existing = await findOpen(label);
    if (existing) {
      await call('PUT', `/rest/api/3/issue/${existing}`, { fields: { description: fields.description } });
      return existing;
    }
    const created = (await call('POST', '/rest/api/3/issue', {
      fields: {
        project: { key: project },
        issuetype: { name: 'Task' },
        summary: fields.summary,
        labels: ['linkcheck', label],
        description: fields.description,
        ...(fields.priority ? { priority: { name: fields.priority } } : {}),
      },
    })) as { key: string };
    return created.key;
  }

  const useLine = (u: UrlUse) => `${u.id} (${u.file}, ${u.field})`;

  return {
    /** A dead URL, or one unreachable three runs running: one issue, updated on later runs. */
    async reportDead(url: string, uses: UrlUse[], result: Pick<ProbeResult, 'status' | 'http'>): Promise<string> {
      const kind = result.status === 'dead' ? 'Dead' : 'Unreachable';
      return upsert(`linkcheck-${urlHash(url)}`, {
        summary: `${kind} link: ${hostPath(url)}`,
        description: doc(
          paragraph(`URL: ${url}`),
          paragraph(`Last result: ${result.status} (${result.http}). Found by the weekly link check (spec 010 US4).`),
          paragraph(`Records using it (${uses.length}):`),
          bullets(uses.map(useLine)),
          paragraph('A dead link never changes a locator’s verification: the reading was made and stays recorded. Find the new address or an archived copy, and correct the record by hand.'),
        ),
      });
    },

    /** A URL that answers again: a comment on its open issue, which a person then closes. */
    async reportRecovered(url: string, date: string): Promise<void> {
      const key = await findOpen(`linkcheck-${urlHash(url)}`);
      if (!key) return;
      await call('POST', `/rest/api/3/issue/${key}/comment`, { body: doc(paragraph(`${url} is reachable again on ${date}. Check that it serves the same copy before closing this issue.`)) });
    },

    /** A manifest whose canvases changed: a separate, lower-priority review issue. */
    async reportManifestChange(url: string, diff: FingerprintDiff, dependents: ManifestDependents): Promise<string> {
      return upsert(`linkcheck-manifest-${urlHash(url)}`, {
        summary: `IIIF manifest changed: ${hostPath(url)}`,
        priority: 'Low',
        description: doc(
          paragraph(`Manifest: ${url}`),
          paragraph(`Canvases: ${diff.countBefore} before, ${diff.countAfter} now.`),
          paragraph(`Added: ${diff.added.join(', ') || 'none'}`),
          paragraph(`Removed: ${diff.removed.join(', ') || 'none'}`),
          paragraph('Maps using it:'),
          bullets(dependents.maps.length > 0 ? dependents.maps.map(useLine) : ['none']),
          paragraph('Layer georeferences on those maps:'),
          bullets(dependents.georeferences.length > 0 ? dependents.georeferences : ['none']),
        ),
      });
    },
  };
}

export type JiraReporter = ReturnType<typeof createJiraReporter>;
