import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { runProfile, type ProfileResult } from '../../../src/migration/profile.js';
import { readSnapshot } from '../../../src/migration/snapshot.js';

export const FIXTURE = 'tests/migration/fixtures/snapshot';
export const SHA = 'e82afd990fd473a2cdf80896401bc64602a1bd29';
export const DATE = '2026-10-01T11:43:44Z';

/** A registry root with only the vocabulary mapping the profile needs (and any extra files), so a run sees no entries yet. */
export function emptyRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'mig-root-'));
  mkdirSync(path.join(root, 'vocab-mappings'), { recursive: true });
  cpSync('vocab-mappings/cnd.yaml', path.join(root, 'vocab-mappings/cnd.yaml'));
  return root;
}

/** A copy of the snapshot fixture that a test may change. */
export function copyFixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'mig-snap-'));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

export const stage = async (snapshotDir = FIXTURE, root = emptyRoot()): Promise<ProfileResult> => runProfile(await readSnapshot(snapshotDir, { sha: SHA, date: DATE }), { root });

export const text = (result: ProfileResult, file: string): string => {
  const content = result.files.get(file);
  if (content === undefined) throw new Error(`the import did not write ${file}`);
  return typeof content === 'string' ? content : Buffer.from(content).toString('utf8');
};
export const record = (result: ProfileResult, family: string, local: string): Record<string, unknown> => parse(text(result, `content/${family}/${local}.yaml`)) as Record<string, unknown>;
export const edit = (dir: string, file: string, change: (text: string) => string): void => writeFileSync(path.join(dir, file), change(readFileSync(path.join(dir, file), 'utf8')));
