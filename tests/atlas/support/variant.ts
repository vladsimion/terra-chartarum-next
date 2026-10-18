import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

export const FIXTURE = fileURLToPath(new URL('../fixtures/registry', import.meta.url));

/** A copy of the Atlas fixture registry that a test may change without touching the original. */
export function copyFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'atlas-variant-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

export const tempDir = (name: string): string => mkdtempSync(path.join(tmpdir(), `${name}-`));

/** Change one YAML record of a registry copy. */
export function editRecord(root: string, file: string, change: (data: Record<string, unknown>) => void): void {
  const full = path.join(root, file);
  const data = parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
  change(data);
  writeFileSync(full, stringify(data));
}

/** Change the features of one GeoJSON source of a registry copy. */
export function editFeatures(root: string, file: string, change: (features: { properties: Record<string, unknown> }[]) => void): void {
  const full = path.join(root, file);
  const data = JSON.parse(readFileSync(full, 'utf8')) as { features: { properties: Record<string, unknown> }[] };
  change(data.features);
  writeFileSync(full, JSON.stringify(data));
}

/** Every file under a directory, relative, with its bytes. */
export function tree(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const e of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) files[path.relative(root, path.join(e.parentPath, e.name))] = readFileSync(path.join(e.parentPath, e.name)).toString('base64');
  }
  return files;
}
