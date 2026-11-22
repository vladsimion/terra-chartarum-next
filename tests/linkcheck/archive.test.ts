import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { proposeArchivedCopies, type Wayback } from '../../src/linkcheck/archive.js';
import { openArchivePullRequest, withArchivedCopy, type GitHubClient } from '../../src/linkcheck/pull-request.js';
import { evidence } from '../registry/support/builders.js';

/*
 * Spec 010 T048 (FR-018, contracts/link-check.md "Archived-copy pull request"): only verified
 * locators with a consulted-copy URL and no archived copy are proposed; a snapshot adds exactly two
 * fields; all of a run's changes go in one pull request on its own branch; nothing reaches main.
 */
const VERIFIED = { value: 'p. 1', state: 'verified', proposed_by: 'person', verified_by: 'V. Simion', verified_on: '2026-10-01', consulted_copy: 'Venice 1548, scan https://example.org/scan/1' };

function fakeWayback(snapshots: Record<string, string | null>) {
  const saved: string[] = [];
  const wayback: Wayback = {
    save: async (url) => void saved.push(url),
    available: async (url) => {
      const timestamp = snapshots[url];
      return timestamp ? { url: `https://web.archive.org/web/${timestamp}/${url}`, timestamp } : null;
    },
  };
  return { wayback, saved };
}

describe('proposeArchivedCopies', () => {
  const records = [
    evidence(1, { locator: VERIFIED }),
    evidence(2, { locator: { ...VERIFIED, state: 'pending' } }),
    evidence(3, { locator: { ...VERIFIED, consulted_copy: 'Shelfmark BCU Cluj Ms 1234' } }),
    evidence(4, { locator: { ...VERIFIED, consulted_copy: 'https://example.org/scan/4', archived_copy: 'https://web.archive.org/web/2025/x', archived_on: '2025-01-01' } }),
  ];

  it('proposes only verified locators with a URL and no archived copy', async () => {
    const { wayback, saved } = fakeWayback({ 'https://example.org/scan/1': '20261122093000' });
    const proposals = await proposeArchivedCopies(records, wayback);
    expect(saved).toEqual(['https://example.org/scan/1']);
    expect(proposals).toEqual([
      {
        id: 'tc:tc:evidence:evidence-000001',
        file: 'content/evidence/evidence-000001.yaml',
        url: 'https://example.org/scan/1',
        archived_copy: 'https://web.archive.org/web/20261122093000/https://example.org/scan/1',
        archived_on: '2026-11-22',
      },
    ]);
  });

  it('proposes nothing when no snapshot is found', async () => {
    const { wayback } = fakeWayback({});
    expect(await proposeArchivedCopies(records, wayback)).toEqual([]);
  });

  it('goes on when saving one URL fails', async () => {
    const wayback: Wayback = { save: async () => Promise.reject(new Error('429')), available: async (url) => ({ url: `https://web.archive.org/web/20261101000000/${url}`, timestamp: '20261101000000' }) };
    expect(await proposeArchivedCopies(records, wayback)).toHaveLength(1);
  });
});

describe('withArchivedCopy', () => {
  const original = [
    'id: tc:tc:evidence:evidence-000001',
    'family: evidence',
    '# the claim, kept as written',
    'locator:',
    '  value: p. 1',
    '  state: verified   # read by a person',
    '  verified_by: V. Simion',
    '  verified_on: 2026-10-01',
    '  consulted_copy: Venice 1548, scan https://example.org/scan/1',
    'confidence: probable',
    '',
  ].join('\n');

  it('adds exactly locator.archived_copy and locator.archived_on, keeping comments and order', () => {
    const changed = withArchivedCopy(original, 'https://web.archive.org/web/20261122093000/https://example.org/scan/1', '2026-11-22');
    const before = parse(original) as Record<string, Record<string, unknown>>;
    const after = parse(changed) as Record<string, Record<string, unknown>>;
    expect(after).toEqual({ ...before, locator: { ...before.locator, archived_copy: 'https://web.archive.org/web/20261122093000/https://example.org/scan/1', archived_on: '2026-11-22' } });
    expect(changed).toContain('# the claim, kept as written');
    expect(changed).toContain('# read by a person');
    expect(changed.indexOf('confidence: probable')).toBeGreaterThan(changed.indexOf('archived_on'));
    // every original line is still there, in order
    const lines = changed.split('\n');
    let at = -1;
    for (const line of original.split('\n').filter(Boolean)) {
      const next = lines.indexOf(line, at + 1);
      expect(next, line).toBeGreaterThan(at);
      at = next;
    }
  });
});

describe('openArchivePullRequest', () => {
  function fakeGitHub() {
    const calls: { op: string; args: unknown }[] = [];
    const github: GitHubClient = {
      createBranch: async (name) => void calls.push({ op: 'createBranch', args: name }),
      commitFiles: async (branch, files, message) => void calls.push({ op: 'commitFiles', args: { branch, files, message } }),
      openPullRequest: async (pr) => {
        calls.push({ op: 'openPullRequest', args: pr });
        return { number: 999, url: 'https://github.com/o/r/pull/999' };
      },
      runGate: async (branch) => void calls.push({ op: 'runGate', args: branch }),
    };
    return { github, calls };
  }

  function root() {
    const dir = mkdtempSync(path.join(tmpdir(), 'archive-pr-'));
    mkdirSync(path.join(dir, 'content/evidence'), { recursive: true });
    for (const n of [1, 2]) {
      writeFileSync(path.join(dir, `content/evidence/evidence-00000${n}.yaml`), `id: tc:tc:evidence:evidence-00000${n}\nlocator:\n  state: verified\n  consulted_copy: https://example.org/${n}\n`);
    }
    return dir;
  }

  const proposals = [1, 2].map((n) => ({
    id: `tc:tc:evidence:evidence-00000${n}`,
    file: `content/evidence/evidence-00000${n}.yaml`,
    url: `https://example.org/${n}`,
    archived_copy: `https://web.archive.org/web/20261122000000/https://example.org/${n}`,
    archived_on: '2026-11-22',
  }));

  it('puts every change of the run on one dated branch, in one pull request against main', async () => {
    const dir = root();
    const { github, calls } = fakeGitHub();
    const pr = await openArchivePullRequest({ root: dir, proposals, github, date: '2026-11-23' });
    expect(pr?.number).toBe(999);
    expect(calls.map((c) => c.op)).toEqual(['createBranch', 'commitFiles', 'openPullRequest', 'runGate']);
    // a pull request opened with the workflow's token starts no workflow, so the gate is dispatched on the branch
    expect(calls[3]?.args).toBe('linkcheck/archived-copies-2026-11-23');
    expect(calls[0]?.args).toBe('linkcheck/archived-copies-2026-11-23');
    const commit = calls[1]?.args as { branch: string; files: { path: string; content: string }[] };
    expect(commit.branch).toBe('linkcheck/archived-copies-2026-11-23');
    expect(commit.files.map((f) => f.path)).toEqual(proposals.map((p) => p.file));
    const opened = calls[2]?.args as { head: string; base: string; body: string };
    expect(opened).toMatchObject({ head: 'linkcheck/archived-copies-2026-11-23', base: 'main' });
    for (const p of proposals) expect(opened.body).toContain(p.id);
  });

  it('never writes the working tree', async () => {
    const dir = root();
    const before = readFileSync(path.join(dir, 'content/evidence/evidence-000001.yaml'), 'utf8');
    await openArchivePullRequest({ root: dir, proposals, github: fakeGitHub().github, date: '2026-11-23' });
    expect(readFileSync(path.join(dir, 'content/evidence/evidence-000001.yaml'), 'utf8')).toBe(before);
  });

  it('does nothing when there is nothing to propose', async () => {
    const { github, calls } = fakeGitHub();
    expect(await openArchivePullRequest({ root: root(), proposals: [], github, date: '2026-11-23' })).toBeNull();
    expect(calls).toEqual([]);
  });
});
