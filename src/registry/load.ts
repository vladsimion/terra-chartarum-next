import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { parseAllDocuments } from 'yaml';

/** One parsed registry record and the file it came from (path relative to the loaded directory). */
export interface LoadedRecord {
  file: string;
  record: Record<string, unknown>;
}

/** A file that could not be turned into a record. `line` is 1-based when known. */
export interface LoadError {
  file: string;
  line?: number;
  message: string;
}

export interface LoadResult {
  records: LoadedRecord[];
  errors: LoadError[];
}

/**
 * Read every `*.yaml` file under `dir` (recursively) as one registry record.
 * Never throws: unreadable input is reported in `errors`, so the integrity gate
 * can report every problem in one run. Output is sorted by file path, so it is
 * deterministic.
 */
export async function loadRecords(dir: string): Promise<LoadResult> {
  const records: LoadedRecord[] = [];
  const errors: LoadError[] = [];

  let files: string[];
  try {
    files = await listYamlFiles(dir);
  } catch (error) {
    return { records, errors: [{ file: dir, message: `cannot read directory: ${describe(error)}` }] };
  }

  for (const full of files) {
    const file = relative(dir, full).split(sep).join('/');
    const text = await readFile(full, 'utf8');
    const docs = parseAllDocuments(text);

    if (!Array.isArray(docs)) {
      errors.push({ file, message: 'file contains no YAML document' });
      continue;
    }
    if (docs.length !== 1) {
      errors.push({ file, message: `expected exactly one document per file, found ${docs.length}` });
      continue;
    }

    const doc = docs[0]!;
    const syntaxError = doc.errors[0];
    if (syntaxError) {
      const line = syntaxError.linePos?.[0]?.line;
      errors.push(line === undefined ? { file, message: syntaxError.message } : { file, line, message: syntaxError.message });
      continue;
    }

    const value: unknown = doc.toJS();
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push({ file, message: 'a record must be a YAML mapping (key: value pairs)' });
      continue;
    }

    records.push({ file, record: value as Record<string, unknown> });
  }

  return { records, errors };
}

async function listYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
