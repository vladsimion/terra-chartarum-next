import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/*
 * The import snapshot (spec 008 FR-011): a pinned checkout of the legacy repository. Its commit is
 * recorded in the manifest that is committed with the imported records, so an import can be repeated
 * and audited. The importer reads files from it and fetches nothing.
 */
export const LEGACY_REPOSITORY = 'github.com/vladsimion/terra-chartarum';
export const IMPORTER_VERSION = '1';

export interface Snapshot {
  root: string;
  repository: string;
  sha: string;
  date: string;
}

export interface Manifest {
  profile: string;
  snapshot: { repository: string; sha: string; date: string };
  importer_version: string;
  counts: Record<string, number>;
  created_by: string;
}

async function git(root: string, ...args: string[]): Promise<string | null> {
  try {
    return (await run('git', ['-C', root, ...args])).stdout.trim();
  } catch {
    return null;
  }
}

/** A checkout at `root`, with its commit and date from the options (a checkout without git) or from git. */
export async function readSnapshot(root: string, options: { sha?: string; date?: string }): Promise<Snapshot> {
  const resolved = path.resolve(root);
  if (!(await stat(resolved).then((s) => s.isDirectory(), () => false))) throw new Error(`the snapshot ${root} is not a folder`);
  if (!(await stat(path.join(resolved, 'src/lib')).then((s) => s.isDirectory(), () => false))) throw new Error(`${root} is not a checkout of the legacy repository: it has no src/lib`);
  const sha = options.sha ?? (await git(resolved, 'rev-parse', 'HEAD'));
  if (sha === null) throw new Error(`the snapshot ${root} has no commit to record: give one, or pin a checkout made with git`);
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`the snapshot commit must be a full 40-character SHA, not "${sha}"`);
  const date = options.date ?? (await git(resolved, 'show', '-s', '--format=%cI', sha)) ?? '';
  if (date === '') throw new Error(`the snapshot ${root} has no commit date to record`);
  return { root: resolved, repository: LEGACY_REPOSITORY, sha, date };
}

/** The manifest committed with an import; counts are sorted by family so the file is stable. */
export function buildManifest(snapshot: Snapshot, profile: string, counts: Record<string, number>): Manifest {
  return {
    profile,
    snapshot: { repository: snapshot.repository, sha: snapshot.sha, date: snapshot.date },
    importer_version: IMPORTER_VERSION,
    counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
    created_by: 'registry import-legacy',
  };
}
