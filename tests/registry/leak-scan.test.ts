import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { loadRecords, type LoadedRecord } from '../../src/registry/load.ts';
import { isRoutable, pagePath } from '../../src/registry/routes.ts';

// Seam 3 at build level (spec 001 US4, FR-009, glossary "Held / released"):
// build the site from the shared valid fixture, then scan every file it
// produced. Nothing held and nothing private may appear anywhere in `dist/`.

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURE = resolve(import.meta.dirname, 'fixtures/valid');

/** Strings the fixture plants on purpose, so the scan can never pass vacuously. */
const SENTINELS = [
  'Terra Sigillata (fixture)', // title of a held essay
  'tc:tc:essay:terra-sigillata', // its qualified ID
  'Porolissum gate', // its private note
  'Fixture Antiquariat Sentinel', // private dealer on a released map
  'GBP 1,850', // private price on a released map
];

let work: string;
let fixture: LoadedRecord[];
let built: { path: string; text: string }[];

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'tc-leak-'));
  fixture = (await loadRecords(FIXTURE)).records;
  await run(join(ROOT, 'node_modules/.bin/astro'), ['build'], {
    cwd: ROOT,
    env: { ...process.env, TC_REGISTRY_DIR: FIXTURE, TC_OUT_DIR: join(work, 'dist'), TC_REPORT_DIR: join(work, 'reports') },
  });
  const files = await readdir(join(work, 'dist'), { recursive: true, withFileTypes: true });
  built = await Promise.all(
    files
      .filter((f) => f.isFile())
      .map(async (f) => ({ path: join(f.parentPath, f.name), text: await readFile(join(f.parentPath, f.name), 'utf8') })),
  );
}, 180_000);

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

/**
 * Held, judged independently of the code under test: an essay is released only
 * at stage Publish or Cross-link (ADR 0003 §2); anything else only when its
 * lifecycle is `published`. The fixture uses no specialist lifecycle terms.
 */
function held(record: Record<string, unknown>): boolean {
  if (record['family'] === 'essay') return !['publish', 'cross_link'].includes(String(record['stage']));
  return record['lifecycle'] !== 'published';
}

/** Every string a held record could leak by: title, qualified ID and every page path it ever had. */
function heldMarkers(record: Record<string, unknown>): string[] {
  const family = String(record['family']);
  const markers = [String(record['title']), `tc:${String(record['authority'] ?? 'tc')}:${family}:${String(record['id'])}`];
  if (isRoutable(family)) {
    for (const slug of [record['slug'], ...((record['previous_slugs'] as unknown[] | undefined) ?? [])]) {
      if (typeof slug === 'string') markers.push(pagePath(family, slug));
    }
  }
  return markers;
}

/** Every string value inside a `private` block, at any depth. */
function privateValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(privateValues);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(privateValues);
  return [];
}

function occurrences(markers: string[]): string[] {
  return built.flatMap(({ path, text }) =>
    markers.filter((m) => text.includes(m)).map((m) => `"${m}" in ${path.slice(work.length + 1)}`),
  );
}

describe('built site', () => {
  test('publishes the released-only relations index', async () => {
    const relations = JSON.parse(await readFile(join(work, 'dist/data/relations.json'), 'utf8'));

    expect(relations['tc:tc:map:ortelius-dacia']).toEqual({ cited_in: ['tc:tc:essay:frontier-lines'], used_by: [] });
  });

  test('writes the editor relations index, held content included, outside the site', async () => {
    const full = JSON.parse(await readFile(join(work, 'reports/relations.full.json'), 'utf8'));

    expect(full['tc:tc:map:ortelius-dacia'].cited_in).toEqual(['tc:tc:essay:frontier-lines', 'tc:tc:essay:terra-sigillata']);
  });

  test('the scan covers every planted sentinel', () => {
    const markers = [
      ...fixture.filter(({ record }) => held(record)).flatMap(({ record }) => heldMarkers(record)),
      ...fixture.flatMap(({ record }) => privateValues(record['private'])),
    ];

    expect(SENTINELS.filter((s) => !markers.some((m) => m.includes(s)))).toEqual([]);
  });

  test('no held title, ID or page path appears anywhere in the built site', () => {
    const markers = fixture.filter(({ record }) => held(record)).flatMap(({ record }) => heldMarkers(record));

    expect(occurrences(markers)).toEqual([]);
  });

  test('no private value appears anywhere in the built site', () => {
    const markers = fixture.flatMap(({ record }) => privateValues(record['private']));

    expect(markers.length).toBeGreaterThan(0);
    expect(occurrences(markers)).toEqual([]);
  });
});
