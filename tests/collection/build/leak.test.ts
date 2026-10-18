import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import { collectionSite } from '../support/build.js';
import { FIXTURE_ROOT } from '../support/fixture.js';

/*
 * Spec 004 T040 and T041 (SC-005, US4 scenario): nothing about a held record or a private acquisition
 * field appears in any file of the built output, the filter index included. The registry's own
 * output scan agrees, and it fails when a held title is put into a page (the mutation).
 */
const HELD = [
  // the held essay (cites maps 1 and 2)
  'Zephyr Held Moraine Essay', 'zephyr-held-moraine', 'essay-000003',
  // the held cartographer, used by no public map
  'A held fixture cartographer', 'held-fixture-cartographer', 'cartographer-000003', 'HELD-BIOGRAPHY-MARKER',
  // the held map with dealer-only support, its evidence and sources
  'A held fixture map with dealer-only support', 'held-fixture-map-dealer', 'map-000005', 'evidence-000005', 'A dealer catalogue', 'dealer-catalogue', 'source-000003', 'A finding aid', 'source-000004',
  // the held layer and the held place that relate to a public map
  'A held fixture layer', 'held-fixture-layer', 'layer-000002', 'A held fixture place', 'held-fixture-place', 'place-000004',
];
const PRIVATE_WORDS = /\b(price|invoice|receipt|negotiation|vendor|dealer_contact)\b/i;

function textFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(html|json|txt|xml|css|js|bib|ris)$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name));
}

let dir = '';
beforeAll(() => {
  dir = collectionSite();
});

describe('the built output of the collection fixtures', () => {
  it('has files to scan, among them the filter index and a record page', () => {
    const files = textFiles(dir).map((f) => path.relative(dir, f));
    expect(files).toContain('data/collection-index.json');
    expect(files).toContain('collection/fixture-map-road/index.html');
  });

  it('contains no title, slug or id of any held record', () => {
    const hits: string[] = [];
    for (const file of textFiles(dir)) {
      const text = readFileSync(file, 'utf8');
      for (const word of HELD) if (text.includes(word)) hits.push(`${path.relative(dir, file)} contains "${word}"`);
    }
    expect(hits).toEqual([]);
  });

  it('contains no private acquisition word', () => {
    const hits = textFiles(dir)
      .filter((file) => !file.includes(`${path.sep}_astro${path.sep}`))
      .filter((file) => PRIVATE_WORDS.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(dir, file));
    expect(hits).toEqual([]);
  });

  it('passes the registry output scan', async () => {
    let out = '';
    const code = await main(['scan', dir, '--dir', FIXTURE_ROOT], { stdout: (s) => (out += s), stderr: (s) => (out += s) });
    expect(out).not.toMatch(/PRIV-LEAK/);
    expect(code).toBe(0);
  });
});

describe('the mutation: a held essay’s title put into a map page', () => {
  let copy = '';
  beforeAll(() => {
    copy = mkdtempSync(path.join(tmpdir(), 'collection-leak-'));
    cpSync(dir, copy, { recursive: true });
  });
  afterAll(() => rmSync(copy, { recursive: true, force: true }));

  it('makes the output scan fail and name the held essay', async () => {
    const page = path.join(copy, 'collection', 'fixture-map-road', 'index.html');
    writeFileSync(page, readFileSync(page, 'utf8').replace('</main>', '<p>Zephyr Held Moraine Essay</p></main>'));
    let out = '';
    const code = await main(['scan', copy, '--dir', FIXTURE_ROOT], { stdout: (s) => (out += s), stderr: (s) => (out += s) });
    expect(code).toBe(1);
    expect(out).toMatch(/PRIV-LEAK/);
    expect(out).toContain('essay-000003');
  });
});
