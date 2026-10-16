import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { EntityBase } from './schemas/entity.js';
import type { RegistryRecord } from './types.js';

export interface LoadError {
  /** Path relative to the registry root, with forward slashes. */
  file: string;
  message: string;
}

export interface LoadResult {
  records: RegistryRecord[];
  loadErrors: LoadError[];
}

async function listYaml(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

/**
 * Seam 1: filesystem to records. Reads `<root>/content/**.yaml`, checks structure only, and
 * returns what it could not read as load errors instead of throwing.
 */
export async function loadRegistry(rootDir: string): Promise<LoadResult> {
  const contentDir = path.join(rootDir, 'content');
  const info = await stat(contentDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`No content directory found at ${contentDir}`);
  }

  const records: RegistryRecord[] = [];
  const loadErrors: LoadError[] = [];

  for (const file of await listYaml(contentDir)) {
    const rel = relative(rootDir, file);
    let data: unknown;
    try {
      data = parseYaml(await readFile(file, 'utf8'));
    } catch (error) {
      loadErrors.push({ file: rel, message: error instanceof Error ? error.message : String(error) });
      continue;
    }
    const parsed = EntityBase.safeParse(data);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
      loadErrors.push({ file: rel, message });
      continue;
    }
    records.push({ ...parsed.data, file: rel } as RegistryRecord);
  }

  return { records, loadErrors };
}
