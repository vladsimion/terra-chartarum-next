import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

export const FIXTURE = fileURLToPath(new URL('../fixtures/registry', import.meta.url));
export const IMPORT_SAMPLES = fileURLToPath(new URL('../fixtures/import', import.meta.url));

/** A copy of the bibliography fixture registry that a test may change without touching the original. */
export function copyFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'bib-variant-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

/** Change one YAML record of a registry copy. */
export function editRecord(root: string, file: string, change: (data: Record<string, unknown>) => void): void {
  const full = path.join(root, file);
  const data = parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
  change(data);
  writeFileSync(full, stringify(data));
}

export const removeFile = (root: string, file: string): void => rmSync(path.join(root, file));
export const entryFile = (n: number, extension = 'yaml'): string => `content/bibliography_entry/bibliography_entry-${String(n).padStart(6, '0')}.${extension}`;
export const entryId = (n: number): string => `tc:tc:bibliography_entry:bibliography_entry-${String(n).padStart(6, '0')}`;
