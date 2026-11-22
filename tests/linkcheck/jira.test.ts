import { describe, expect, it } from 'vitest';
import { createJiraReporter, urlHash } from '../../src/linkcheck/jira.js';
import { adfText, fakeJira } from './support/fakes.js';

/*
 * Spec 010 T047 (FR-016, FR-017, SC-006, contracts/link-check.md "Jira issues"): one issue per URL,
 * found again by its label, so a rerun updates and never duplicates; recovery is a comment, never a
 * close; a changed manifest is its own lower-priority issue.
 */
const URL_A = 'https://example.org/scan/1?page=2';
const USES = [
  { id: 'tc:tc:evidence:evidence-000001', file: 'content/evidence/evidence-000001.yaml', field: 'locator.consulted_copy' },
  { id: 'tc:tc:map:map-000001', file: 'content/map/map-000001.yaml', field: 'images[0].url' },
];

describe('urlHash', () => {
  it('is the first 12 hex digits of SHA-256 of the URL', () => {
    // sha256("https://example.org") = 50d7a905e3046b88638362cc34a31a1ae534766ca55e3aa397951efe653b062b
    expect(urlHash('https://example.org')).toBe('50d7a905e304');
  });
});

describe('reportDead', () => {
  it('creates one Task in TCX, named by host and path, labelled for finding it again', async () => {
    const jira = fakeJira();
    const reporter = createJiraReporter(jira.http);
    const key = await reporter.reportDead(URL_A, USES, { status: 'dead', http: '404' });
    expect(jira.issues).toHaveLength(1);
    const issue = jira.issues[0];
    expect(issue?.key).toBe(key);
    expect(issue?.summary).toBe('Dead link: example.org/scan/1');
    expect(issue?.labels.sort()).toEqual(['linkcheck', `linkcheck-${urlHash(URL_A)}`].sort());
    const text = adfText(issue?.description);
    expect(text).toContain(URL_A);
    expect(text).toContain('404');
    for (const use of USES) expect(text).toContain(use.id);
  });

  it('updates the same issue when called again, and creates none', async () => {
    const jira = fakeJira();
    const reporter = createJiraReporter(jira.http);
    const first = await reporter.reportDead(URL_A, USES.slice(0, 1), { status: 'dead', http: '404' });
    const second = await reporter.reportDead(URL_A, USES, { status: 'dead', http: '410' });
    expect(second).toBe(first);
    expect(jira.issues).toHaveLength(1);
    expect(adfText(jira.issues[0]?.description)).toContain('410');
    expect(adfText(jira.issues[0]?.description)).toContain('tc:tc:map:map-000001');
  });

  it('opens a new issue if the earlier one was closed', async () => {
    const jira = fakeJira();
    const reporter = createJiraReporter(jira.http);
    await reporter.reportDead(URL_A, USES, { status: 'dead', http: '404' });
    (jira.issues[0] as { done: boolean }).done = true;
    await reporter.reportDead(URL_A, USES, { status: 'dead', http: '404' });
    expect(jira.issues).toHaveLength(2);
  });

  it('names an unreachable link as such', async () => {
    const jira = fakeJira();
    await createJiraReporter(jira.http).reportDead(URL_A, USES, { status: 'unreachable', http: '503' });
    expect(jira.issues[0]?.summary).toBe('Unreachable link: example.org/scan/1');
  });

  it('throws when Jira refuses', async () => {
    const reporter = createJiraReporter(async () => ({ status: 401, json: {} }));
    await expect(reporter.reportDead(URL_A, USES, { status: 'dead', http: '404' })).rejects.toThrow(/401/);
  });
});

describe('reportRecovered', () => {
  it('comments on the open issue and does not close it', async () => {
    const jira = fakeJira();
    const reporter = createJiraReporter(jira.http);
    await reporter.reportDead(URL_A, USES, { status: 'dead', http: '404' });
    await reporter.reportRecovered(URL_A, '2026-11-30');
    expect(jira.issues[0]?.comments).toHaveLength(1);
    expect(adfText(jira.issues[0]?.comments[0])).toContain('reachable again on 2026-11-30');
    expect(jira.issues[0]?.done).toBe(false);
    expect(jira.requests.some((r) => r.path.includes('transitions'))).toBe(false);
  });

  it('does nothing when no issue is open', async () => {
    const jira = fakeJira();
    await createJiraReporter(jira.http).reportRecovered(URL_A, '2026-11-30');
    expect(jira.issues).toHaveLength(0);
  });
});

describe('reportManifestChange', () => {
  it('creates a Low-priority issue labelled for the manifest, naming the maps and georeferences', async () => {
    const jira = fakeJira();
    const reporter = createJiraReporter(jira.http);
    const manifest = 'https://iiif.example.org/m/manifest.json';
    await reporter.reportManifestChange(
      manifest,
      { changed: true, added: ['c/3'], removed: ['c/2'], countBefore: 2, countAfter: 2 },
      { maps: [USES[1] as (typeof USES)[number]], georeferences: ['tc:tc:layer:layer-000004'] },
    );
    const issue = jira.issues[0];
    expect(issue?.summary).toBe('IIIF manifest changed: iiif.example.org/m/manifest.json');
    expect(issue?.priority).toBe('Low');
    expect(issue?.labels).toContain(`linkcheck-manifest-${urlHash(manifest)}`);
    const text = adfText(issue?.description);
    for (const s of ['c/3', 'c/2', 'tc:tc:map:map-000001', 'tc:tc:layer:layer-000004']) expect(text).toContain(s);
    await reporter.reportManifestChange(manifest, { changed: true, added: [], removed: ['c/1'], countBefore: 2, countAfter: 1 }, { maps: [], georeferences: [] });
    expect(jira.issues).toHaveLength(1);
  });
});
