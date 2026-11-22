import type { JiraHttp } from '../../../src/linkcheck/jira.js';

/*
 * In-memory stand-ins for the link checker's outside world (spec 010 seam 3). No test touches the
 * network: Jira, Wayback and GitHub are these objects, and each records what was asked of it.
 */

export interface FakeIssue {
  key: string;
  summary: string;
  labels: string[];
  priority: string | null;
  description: unknown;
  comments: unknown[];
  done: boolean;
}

/** Jira Cloud REST v3, as much of it as the checker uses: search by JQL, create, edit, comment. */
export function fakeJira() {
  const issues: FakeIssue[] = [];
  const requests: { method: string; path: string; body?: unknown }[] = [];
  const http: JiraHttp = async (method, path, body) => {
    requests.push({ method, path, body });
    if (method === 'POST' && path === '/rest/api/3/search/jql') {
      const jql = (body as { jql: string }).jql;
      const label = /labels = "([^"]+)"/.exec(jql)?.[1];
      const openOnly = jql.includes('statusCategory != Done');
      const found = issues.filter((i) => label !== undefined && i.labels.includes(label) && (!openOnly || !i.done));
      return { status: 200, json: { issues: found.map((i) => ({ key: i.key, fields: { summary: i.summary } })) } };
    }
    if (method === 'POST' && path === '/rest/api/3/issue') {
      const fields = (body as { fields: Record<string, unknown> }).fields;
      const issue: FakeIssue = {
        key: `TCX-${1000 + issues.length}`,
        summary: fields.summary as string,
        labels: fields.labels as string[],
        priority: ((fields.priority as { name?: string } | undefined)?.name ?? null),
        description: fields.description,
        comments: [],
        done: false,
      };
      if ((fields.project as { key: string }).key !== 'TCX' || (fields.issuetype as { name: string }).name !== 'Task') return { status: 400, json: {} };
      issues.push(issue);
      return { status: 201, json: { key: issue.key } };
    }
    const edit = /^\/rest\/api\/3\/issue\/([A-Z]+-\d+)$/.exec(path);
    if (method === 'PUT' && edit) {
      const issue = issues.find((i) => i.key === edit[1]);
      if (!issue) return { status: 404, json: {} };
      Object.assign(issue, { description: (body as { fields: { description: unknown } }).fields.description });
      return { status: 204, json: null };
    }
    const comment = /^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/comment$/.exec(path);
    if (method === 'POST' && comment) {
      issues.find((i) => i.key === comment[1])?.comments.push((body as { body: unknown }).body);
      return { status: 201, json: {} };
    }
    return { status: 404, json: {} };
  };
  return { http, issues, requests };
}

/** The plain text of an Atlassian Document Format body, for assertions. */
export function adfText(doc: unknown): string {
  if (doc === null || typeof doc !== 'object') return '';
  const node = doc as { text?: string; content?: unknown[] };
  return `${node.text ?? ''}${(node.content ?? []).map(adfText).join(' ')}`;
}
