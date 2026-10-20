import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildManifest, readSnapshot } from '../../../src/migration/snapshot.js';

/* Spec 008 T014 (FR-011): the snapshot is a pinned checkout; its commit is written to the manifest the importer commits. */
const FIXTURE = 'tests/migration/fixtures/snapshot';
const SHA = 'e82afd990fd473a2cdf80896401bc64602a1bd29';

describe('readSnapshot', () => {
  it('takes the pinned commit and date it is given, for a checkout without git', async () => {
    const snapshot = await readSnapshot(FIXTURE, { sha: SHA, date: '2026-10-01T11:43:44Z' });
    expect(snapshot).toEqual({ root: expect.stringContaining('snapshot'), repository: 'github.com/vladsimion/terra-chartarum', sha: SHA, date: '2026-10-01T11:43:44Z' });
  });

  it('reads the commit from git when the checkout is a repository', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'snap-git-'));
    mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
    writeFileSync(path.join(dir, 'src/lib/corpus.ts'), 'const RAW = [];');
    const git = (...args: string[]) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.org', ...args], { encoding: 'utf8' }).trim();
    git('init', '-q');
    git('add', '.');
    git('commit', '-q', '-m', 'snapshot');
    const snapshot = await readSnapshot(dir, {});
    expect(snapshot.sha).toBe(git('rev-parse', 'HEAD'));
    expect(snapshot.date).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('refuses a snapshot with no commit it can record', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'snap-'));
    mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
    writeFileSync(path.join(dir, 'src/lib/corpus.ts'), 'const RAW = [];');
    await expect(readSnapshot(dir, {})).rejects.toThrow(/commit/);
  });

  it('refuses a folder that is not a checkout of the legacy repository', async () => {
    await expect(readSnapshot(mkdtempSync(path.join(tmpdir(), 'empty-')), { sha: SHA, date: '2026-10-01T00:00:00Z' })).rejects.toThrow(/src\/lib/);
    await expect(readSnapshot('does/not/exist', { sha: SHA })).rejects.toThrow(/does\/not\/exist/);
  });

  it('refuses a malformed commit', async () => {
    await expect(readSnapshot(FIXTURE, { sha: 'main', date: '2026-10-01T00:00:00Z' })).rejects.toThrow(/40/);
  });
});

describe('buildManifest', () => {
  it('records the profile, the snapshot, the importer version and the counts by family, sorted', async () => {
    const snapshot = await readSnapshot(FIXTURE, { sha: SHA, date: '2026-10-01T11:43:44Z' });
    const manifest = buildManifest(snapshot, 'v1', { place: 2, map: 5 });
    expect(manifest).toEqual({
      profile: 'v1',
      snapshot: { repository: 'github.com/vladsimion/terra-chartarum', sha: SHA, date: '2026-10-01T11:43:44Z' },
      importer_version: '1',
      counts: { map: 5, place: 2 },
      created_by: 'registry import-legacy',
    });
    expect(Object.keys(manifest.counts)).toEqual(['map', 'place']);
  });
});
