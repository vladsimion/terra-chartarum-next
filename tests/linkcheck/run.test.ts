import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import type { Wayback } from '../../src/linkcheck/archive.js';
import { createJiraReporter } from '../../src/linkcheck/jira.js';
import { main } from '../../src/linkcheck/main.js';
import type { ProbeResult } from '../../src/linkcheck/probe.js';
import type { GitHubClient } from '../../src/linkcheck/pull-request.js';
import { emptyState, runLinkCheck, type LinkState } from '../../src/linkcheck/run.js';
import { fakeJira } from './support/fakes.js';

/*
 * Spec 010 T049 (US4 scenarios 2, 3 and 4; FR-015 to FR-018; SC-006): two consecutive runs with
 * every client stubbed. Issues are never duplicated, an unreachable link waits three runs, a dead
 * link never touches a record, a changed manifest opens one review issue, and the run refuses to
 * start without its secrets.
 */
const FIXTURE = fileURLToPath(new URL('../registry/fixtures/valid', import.meta.url));
const SCAN = 'https://scans.example.org/tabula/vii';
const MANIFEST = 'https://iiif.example.org/legacy-map/manifest.json';
const BOOK = 'https://books.example.org/b1';
const MAP_ID = 'tc:tc:map:plc-legacy-map';
const LAYER_ID = 'tc:tc:layer:layer-000001';

function edit(root: string, file: string, change: (doc: Record<string, unknown>) => void) {
  const full = path.join(root, file);
  const doc = parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
  change(doc);
  writeFileSync(full, stringify(doc));
}

/** The valid fixture, with a verified locator on a scan, an IIIF map, and a layer georeferenced on that map. */
function registry(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'linkcheck-run-'));
  cpSync(FIXTURE, root, { recursive: true });
  edit(root, 'content/evidence/evidence-000001.yaml', (d) => {
    d.locator = { value: 'segm. VII', state: 'verified', proposed_by: 'person', verified_by: 'V. Simion', verified_on: '2026-10-01', consulted_copy: `Vienna, ÖNB Cod. 324, scan ${SCAN}` };
  });
  edit(root, 'content/map/plc-legacy-map.yaml', (d) => {
    d.images = [{ type: 'iiif', url: MANIFEST }];
  });
  edit(root, 'content/layer/layer-000001.yaml', (d) => {
    d.georef = { map: MAP_ID };
  });
  edit(root, 'content/dataset/dataset-000001.yaml', (d) => {
    d.upstream = { url: BOOK, pin: 'tag:v1' };
  });
  return root;
}

function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const e of readdirSync(path.join(root, 'content'), { recursive: true, withFileTypes: true })) {
    if (e.isFile()) files.set(path.join(e.parentPath, e.name), readFileSync(path.join(e.parentPath, e.name), 'utf8'));
  }
  return files;
}

const manifestOf = (ids: string[]) => ({ '@context': 'http://iiif.io/api/presentation/3/context.json', id: MANIFEST, type: 'Manifest', items: ids.map((id) => ({ id, type: 'Canvas' })) });

function world(results: Record<string, ProbeResult>, manifests: unknown[] = [manifestOf(['c/1'])]) {
  const jira = fakeJira();
  const prs: unknown[] = [];
  const github: GitHubClient = {
    createBranch: async () => undefined,
    commitFiles: async () => undefined,
    openPullRequest: async (pr) => {
      prs.push(pr);
      return { number: 1, url: 'https://github.com/o/r/pull/1' };
    },
    runGate: async () => undefined,
  };
  const wayback: Wayback = { save: async () => undefined, available: async () => null };
  const queue = [...manifests];
  return {
    jira,
    prs,
    deps: {
      probe: async (url: string) => results[url] ?? { status: 'ok' as const, http: '200' },
      fetchManifest: async () => queue.shift() ?? manifestOf(['c/1']),
      jira: createJiraReporter(jira.http),
      wayback,
      github,
    },
  };
}

const dead: ProbeResult = { status: 'dead', http: '404' };
const unreachable: ProbeResult = { status: 'unreachable', http: '503' };

describe('runLinkCheck over consecutive runs', () => {
  it('opens one issue per dead URL and none again on the next run', async () => {
    const root = registry();
    const { jira, deps } = world({ [SCAN]: dead, [BOOK]: dead });
    let state: LinkState = emptyState();
    state = (await runLinkCheck({ root, state, today: '2026-11-23', ...deps })).state;
    state = (await runLinkCheck({ root, state, today: '2026-11-30', ...deps })).state;
    expect(jira.issues.map((i) => i.summary).sort()).toEqual(['Dead link: books.example.org/b1', 'Dead link: scans.example.org/tabula/vii']);
    expect(state.urls[SCAN]).toMatchObject({ status: 'dead', http: '404', checked_on: '2026-11-30' });
  });

  it('opens an issue for an unreachable URL only on its third consecutive unreachable run', async () => {
    const root = registry();
    const { jira, deps } = world({ [BOOK]: unreachable });
    let state = emptyState();
    for (const [i, today] of ['2026-11-23', '2026-11-30'].entries()) {
      state = (await runLinkCheck({ root, state, today, ...deps })).state;
      expect(state.urls[BOOK]?.unreachable_runs).toBe(i + 1);
      expect(jira.issues).toHaveLength(0);
    }
    state = (await runLinkCheck({ root, state, today: '2026-12-07', ...deps })).state;
    expect(jira.issues.map((i) => i.summary)).toEqual(['Unreachable link: books.example.org/b1']);
  });

  it('resets the streak when an unreachable URL answers', async () => {
    const root = registry();
    const first = world({ [BOOK]: unreachable });
    let state = (await runLinkCheck({ root, state: emptyState(), today: '2026-11-23', ...first.deps })).state;
    state = (await runLinkCheck({ root, state, today: '2026-11-30', ...world({}).deps })).state;
    expect(state.urls[BOOK]).toMatchObject({ status: 'ok', unreachable_runs: 0 });
  });

  it('comments, without closing, when a dead URL is reachable again', async () => {
    const root = registry();
    const w = world({ [SCAN]: dead });
    const state = (await runLinkCheck({ root, state: emptyState(), today: '2026-11-23', ...w.deps })).state;
    await runLinkCheck({ root, state, today: '2026-11-30', ...w.deps, probe: async () => ({ status: 'ok', http: '200' }) });
    expect(w.jira.issues[0]?.comments).toHaveLength(1);
    expect(w.jira.issues[0]?.done).toBe(false);
  });

  it('leaves every record file byte for byte as it was when a verified locator’s copy is dead', async () => {
    const root = registry();
    const before = snapshot(root);
    const { deps } = world({ [SCAN]: dead });
    await runLinkCheck({ root, state: emptyState(), today: '2026-11-23', ...deps, wayback: { save: async () => undefined, available: async (url) => ({ url: `https://web.archive.org/web/20261101000000/${url}`, timestamp: '20261101000000' }) } });
    expect(snapshot(root)).toEqual(before);
  });

  it('records a manifest seen for the first time, and opens one review issue when it changes', async () => {
    const root = registry();
    const { jira, deps } = world({}, [manifestOf(['c/1', 'c/2']), manifestOf(['c/1', 'c/2']), manifestOf(['c/1', 'c/3'])]);
    let state = (await runLinkCheck({ root, state: emptyState(), today: '2026-11-23', ...deps })).state;
    expect(state.manifests[MANIFEST]).toEqual({ canvases: ['c/1', 'c/2'], count: 2, seen_on: '2026-11-23' });
    state = (await runLinkCheck({ root, state, today: '2026-11-30', ...deps })).state;
    expect(jira.issues).toHaveLength(0);
    state = (await runLinkCheck({ root, state, today: '2026-12-07', ...deps })).state;
    expect(jira.issues).toHaveLength(1);
    expect(jira.issues[0]?.summary).toBe('IIIF manifest changed: iiif.example.org/legacy-map/manifest.json');
    expect(JSON.stringify(jira.issues[0]?.description)).toContain(LAYER_ID);
    expect(state.manifests[MANIFEST]?.canvases).toEqual(['c/1', 'c/3']);
  });

  it('opens one archived-copy pull request for the run', async () => {
    const root = registry();
    const { prs, deps } = world({});
    const result = await runLinkCheck({ root, state: emptyState(), today: '2026-11-23', ...deps, wayback: { save: async () => undefined, available: async (url) => ({ url: `https://web.archive.org/web/20261123000000/${url}`, timestamp: '20261123000000' }) } });
    expect(prs).toHaveLength(1);
    expect(result.summary.archived).toBe(1);
  });
});

describe('main (scripts/link-check.ts)', () => {
  function io() {
    let out = '';
    let err = '';
    return { io: { stdout: (s: string) => void (out += s), stderr: (s: string) => void (err += s) }, out: () => out, err: () => err };
  }

  it.each([
    ['JIRA_API_TOKEN', { JIRA_USER: 'me@example.org', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' }],
    ['JIRA_USER', { JIRA_API_TOKEN: 'x', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' }],
  ])('fails before any request when %s is missing', async (missing, env) => {
    let requests = 0;
    const out = io();
    const code = await main(['--dir', registry(), '--state', path.join(mkdtempSync(path.join(tmpdir(), 'st-')), 's.json')], env, out.io, async () => {
      requests += 1;
      return new Response(null, { status: 200 });
    });
    expect(code).toBe(2);
    expect(requests).toBe(0);
    expect(out.err()).toContain(missing);
  });

  it('with --dry-run makes no request and writes nothing, and says what it would check', async () => {
    let requests = 0;
    const statePath = path.join(mkdtempSync(path.join(tmpdir(), 'st-')), 's.json');
    const out = io();
    const code = await main(['--dir', registry(), '--state', statePath, '--dry-run'], {}, out.io, async () => {
      requests += 1;
      return new Response(null, { status: 200 });
    });
    expect(code).toBe(0);
    expect(requests).toBe(0);
    expect(existsSync(statePath)).toBe(false);
    expect(out.out()).toMatch(/3 URLs on 3 hosts/);
  });
});
