import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { loadRegistry } from '../registry/load.js';
import type { CommandResult } from '../registry/promote.js';
import { ImportError } from './context.js';
import { ExtractionError } from './extract-ts.js';
import { buildInventory, type InventoryEntry } from './inventory.js';
import { archiveRedirects } from './redirects.js';
import { readSnapshot } from './snapshot.js';

const run = promisify(execFile);

const INVENTORY = 'migration/redirect-inventory.json';
const RULES = 'archive/_redirects';

const fail = (command: string, message: string, code: 1 | 2 = 1): CommandResult => ({ code, stdout: '', stderr: `registry ${command}: ${message}\n` });

/** `registry inventory --snapshot <path> --dir <root> [--out <file>]` (spec 008 contracts/cli-additions.md). */
export async function inventoryCommand(root: string, options: { snapshot?: string; out?: string; sha?: string; date?: string }): Promise<CommandResult> {
  if (!options.snapshot) return fail('inventory', '--snapshot <path> is needed', 2);
  try {
    const snapshot = await readSnapshot(options.snapshot, { sha: options.sha, date: options.date });
    const { records } = await loadRegistry(root);
    const entries = await buildInventory(snapshot, records);
    const target = path.resolve(root, options.out ?? INVENTORY);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(entries, null, 2)}\n`);
    const moved = entries.filter((e) => e.outcome === 'rule').length;
    return { code: 0, stdout: `registry inventory: ${entries.length} old URLs (snapshot ${snapshot.sha.slice(0, 7)}): ${moved} with a rule, ${entries.length - moved} served in place; wrote ${path.relative(process.cwd(), target) || target}\n`, stderr: '' };
  } catch (error) {
    if (error instanceof ExtractionError || error instanceof ImportError || (error as Error).message.startsWith('the snapshot') || (error as Error).message.includes('is not a checkout')) return fail('inventory', (error as Error).message);
    throw error;
  }
}

async function commitOf(root: string): Promise<string> {
  try {
    return (await run('git', ['-C', root, 'rev-parse', 'HEAD'])).stdout.trim();
  } catch {
    return 'unknown';
  }
}

/** `registry archive-redirects --dir <root> [--out <file>]`: the rule file for the archive project, from the inventory and the registry. */
export async function archiveRedirectsCommand(root: string, options: { out?: string }): Promise<CommandResult> {
  try {
    const inventory = JSON.parse(await readFile(path.resolve(root, INVENTORY), 'utf8').catch(() => {
      throw new ImportError(`${INVENTORY} is missing: run registry inventory first`);
    })) as InventoryEntry[];
    const manifest = JSON.parse(await readFile(path.resolve(root, 'migration/import-manifest.json'), 'utf8').catch(() => {
      throw new ImportError('migration/import-manifest.json is missing: the snapshot the inventory came from is not recorded');
    })) as { snapshot: { sha: string } };
    const { records } = await loadRegistry(root);
    const text = archiveRedirects(inventory, records, { snapshot: manifest.snapshot.sha, commit: await commitOf(root) });
    const target = path.resolve(root, options.out ?? RULES);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text);
    const count = text.split('\n').filter((l) => l !== '' && !l.startsWith('#')).length;
    return { code: 0, stdout: `registry archive-redirects: ${count} rules written to ${path.relative(process.cwd(), target) || target}; apply them to the archive project by pull request\n`, stderr: '' };
  } catch (error) {
    if (error instanceof ImportError) return fail('archive-redirects', error.message);
    throw error;
  }
}
