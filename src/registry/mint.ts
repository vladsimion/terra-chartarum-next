import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { isFamily } from './families.js';
import { counterOf, formatCounterLocalId } from './ids.js';

const run = promisify(execFile);

/**
 * Next unused local-id for a family: the highest counter among `existing` local-ids, plus one.
 * Other families and local-ids that are not in counter form (legacy ids) are ignored.
 */
export function nextLocalId(family: string, existing: readonly string[]): string {
  if (!isFamily(family)) throw new Error(`unknown family: ${family}`);
  let highest = 0;
  for (const localId of existing) {
    const counter = counterOf(family, localId);
    if (counter !== null && counter > highest) highest = counter;
  }
  return formatCounterLocalId(family, highest + 1);
}

async function localIdsInWorkingTree(rootDir: string, family: string): Promise<string[]> {
  const dir = path.join(rootDir, 'content', family);
  const names = await readdir(dir).catch(() => [] as string[]);
  return names.filter((n) => n.endsWith('.yaml')).map((n) => n.slice(0, -'.yaml'.length));
}

async function localIdsOnRef(rootDir: string, family: string, ref: string): Promise<string[]> {
  try {
    const { stdout } = await run('git', ['-C', rootDir, 'ls-tree', '-r', '--name-only', ref, '--', `content/${family}/`]);
    return stdout
      .split('\n')
      .filter((n) => n.endsWith('.yaml'))
      .map((n) => path.posix.basename(n, '.yaml'));
  } catch {
    return [];
  }
}

/**
 * The highest number across the working tree and `main` (and `origin/main`), plus one. When git
 * is unavailable it uses the working tree alone. Collisions between branches are caught later by
 * `ID-DUPLICATE`, and the later branch re-mints before merge (ADR 0006 item 1).
 */
export async function mintNext(family: string, rootDir: string): Promise<string> {
  if (!isFamily(family)) throw new Error(`unknown family: ${family}`);
  const existing = [
    ...(await localIdsInWorkingTree(rootDir, family)),
    ...(await localIdsOnRef(rootDir, family, 'main')),
    ...(await localIdsOnRef(rootDir, family, 'origin/main')),
  ];
  return nextLocalId(family, existing);
}
