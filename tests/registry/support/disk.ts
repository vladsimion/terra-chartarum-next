import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { VALID_BODY } from './essays.js';

export interface DiskOptions {
  /** Hand-written YAML for a record, by its `file`, to keep comments and key order under test. */
  yamlByFile?: Record<string, string>;
  /** The `.mdx` source for an essay, by its id. Essays at Draft or later get `VALID_BODY` unless set. */
  bodies?: Record<string, string>;
}

/** The YAML of a record as the registry stores it: no path, no computed body. */
function storedFields(record: RegistryRecord): Record<string, unknown> {
  const { file: _file, body: _body, ...rest } = record;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

/**
 * Writes records to a temporary registry root (`content/<family>/<id>.yaml`, plus an `.mdx` beside
 * each essay that has a body) and returns the root, so the CLI and the loader run on real files.
 */
export function writeRegistry(records: readonly RegistryRecord[], options: DiskOptions = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), 'essay-registry-'));
  for (const record of records) {
    const target = path.join(root, record.file);
    mkdirSync(path.dirname(target), { recursive: true });
    // a layer's asset must exist for LIFE-AVAILABILITY once it is published
    if (typeof record.asset === 'string') {
      mkdirSync(path.dirname(path.join(root, record.asset)), { recursive: true });
      writeFileSync(path.join(root, record.asset), '');
    }
    writeFileSync(target, options.yamlByFile?.[record.file] ?? stringify(storedFields(record)));
    if (record.family === 'essay') {
      const body = options.bodies?.[record.id] ?? ((record.body as { exists?: boolean } | undefined)?.exists ? VALID_BODY : null);
      if (body !== null) writeFileSync(target.replace(/\.yaml$/, '.mdx'), body);
    }
  }
  return root;
}
