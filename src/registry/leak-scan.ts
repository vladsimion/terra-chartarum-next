import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isRetired } from './publication.js';
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
  kind: 'private' | 'held-id' | 'held-path' | 'held-title';
  /** What the report shows as the value; never the private value itself. */
  shown: string;
  find(text: string): boolean;
}

/**
 * The forms a value takes once a build has written it out: as is, HTML-escaped, JSON-escaped and
 * URL-encoded. A leak that survived escaping is still a leak.
 */
function variantsOf(text: string): string[] {
  const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return [
    ...new Set([
      text,
      html,
      html.replace(/'/g, '&#39;'),
      html.replace(/'/g, '&#x27;'),
      JSON.stringify(text).slice(1, -1),
      encodeURIComponent(text),
    ]),
  ];
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
          const forms = variantsOf(text);
          needles.push({
            entity: record.id,
            field,
            kind: 'private',
            shown: '[private value]',
            find: (haystack) => forms.some((form) => haystack.includes(form)),
          });
        }
      }
    }
    if (!publicIds.has(record.id)) {
      // not followed or preceded by an id character, so a longer public id is not mistaken for this one
      const pattern = new RegExp(`(?<![A-Za-z0-9._:-])${escapeRegExp(record.id)}(?![A-Za-z0-9._:-])`);
      needles.push({ entity: record.id, field: null, kind: 'held-id', shown: record.id, find: (haystack) => pattern.test(haystack) });
      // the address of the page it must not have, so a link or sitemap entry to it is caught too
      if (typeof record.slug === 'string' && record.slug !== '') {
        // the registry names a page `/<family>/<slug>/`; the site serves collections under the plural (`/essays/<slug>/`)
        for (const address of [`/${record.family}/${record.slug}`, `/${record.family}s/${record.slug}`]) {
          const onPath = new RegExp(`${escapeRegExp(address)}(?![A-Za-z0-9._-])`);
          needles.push({ entity: record.id, field: 'slug', kind: 'held-path', shown: address, find: (haystack) => onPath.test(haystack) });
        }
      }
      // a held essay's title is as good as its address: the page, a card, a search entry or a feed would all carry it (FR-006)
      if (record.family === 'essay' && !isRetired(record) && typeof record.title === 'string' && record.title.trim().length >= MIN_PRIVATE_LENGTH) {
        const forms = variantsOf(record.title.trim());
        needles.push({ entity: record.id, field: 'title', kind: 'held-title', shown: '[held title]', find: (haystack) => forms.some((form) => haystack.includes(form)) });
      }
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
        value: needle.shown,
        expected:
          needle.kind === 'private'
            ? 'output free of private values'
            : needle.kind === 'held-id'
              ? 'output free of ids of entities that are not public'
              : needle.kind === 'held-title'
                ? 'output free of the titles of essays that are not public'
                : 'output with no address of a page for an entity that is not public',
      });
    }
  }
  return violations;
}
