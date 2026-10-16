import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectPublic } from './project.js';
import type { Violation } from './report.js';
import type { RegistryRecord } from './types.js';

/** Text formats a site build emits. Binary files (images, tiles, fonts) are skipped. */
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.json', '.js', '.mjs', '.css', '.txt', '.xml', '.csv', '.svg', '.map', '.webmanifest', '.md', '.yaml', '.yml', '.geojson',
]);
const TEXT_NAMES = new Set(['_redirects', '_headers']);

/** Private values shorter than this cannot be told apart from ordinary text, so they are not searched for. */
const MIN_PRIVATE_LENGTH = 5;

interface Needle {
  entity: string;
  field: string | null;
  kind: 'private' | 'held-id';
  find(text: string): boolean;
}

function leaves(value: unknown, prefix: string, out: { path: string; text: string }[]): void {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leaves(child, prefix ? `${prefix}.${key}` : key, out);
  } else if (value !== undefined && value !== null) {
    out.push({ path: prefix, text: String(value) });
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildNeedles(records: readonly RegistryRecord[]): Needle[] {
  const needles: Needle[] = [];
  const publicIds = new Set(projectPublic(records).map((r) => r.id));

  for (const record of records) {
    if (record.private && typeof record.private === 'object') {
      const found: { path: string; text: string }[] = [];
      leaves(record.private, 'private', found);
      for (const { path: field, text } of found) {
        if (text.trim().length >= MIN_PRIVATE_LENGTH) {
          needles.push({ entity: record.id, field, kind: 'private', find: (haystack) => haystack.includes(text) });
        }
      }
    }
    if (!publicIds.has(record.id)) {
      // not followed or preceded by an id character, so a longer public id is not mistaken for this one
      const pattern = new RegExp(`(?<![A-Za-z0-9._:-])${escapeRegExp(record.id)}(?![A-Za-z0-9._:-])`);
      needles.push({ entity: record.id, field: null, kind: 'held-id', find: (haystack) => pattern.test(haystack) });
    }
  }
  return needles;
}

async function textFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && (TEXT_EXTENSIONS.has(path.extname(e.name).toLowerCase()) || TEXT_NAMES.has(e.name)))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

/**
 * Post-build scan of the built output (FR-009, ADR 0006 item 15). Fails on any private value and on
 * any id of an entity that is not public. Private values are redacted in the report, so a CI
 * artefact never repeats what it reports.
 */
export async function scanOutput(distDir: string, records: readonly RegistryRecord[]): Promise<Violation[]> {
  const needles = buildNeedles(records);
  const violations: Violation[] = [];
  for (const file of await textFiles(distDir)) {
    const text = await readFile(file, 'utf8');
    const rel = path.relative(distDir, file).split(path.sep).join('/');
    for (const needle of needles) {
      if (!needle.find(text)) continue;
      violations.push({
        rule: 'PRIV-LEAK',
        severity: 'error',
        entity: needle.entity,
        file: rel,
        field: needle.field,
        value: needle.kind === 'private' ? '[private value]' : needle.entity,
        expected: needle.kind === 'private' ? 'output free of private values' : 'output free of ids of entities that are not public',
      });
    }
  }
  return violations;
}
