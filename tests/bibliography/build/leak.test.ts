import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicEntries } from '../../../src/bibliography/entry-public.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { projectPublic } from '../../../src/registry/project.js';
import { scanOutput } from '../../../src/registry/leak-scan.js';
import { bibliographySite } from '../support/build.js';
import { FIXTURE } from '../support/variant.js';

/*
 * Spec 006 T040 (SC-003, ADR 0014): no id, slug or title of a held entry, an entry cited only by a
 * held essay, an uncited entry, a held essay or a held Source, and no private value, appears in any
 * Bibliography page, index, export or address. The scan is the registry's own (`leak-scan.ts`).
 *
 * One thing the registry cannot know: an entry that is published and released but cited by no public
 * record is not public (ADR 0014), yet looks public to the scan. So the scan is told those entries
 * are held; whatever the site derives as non-public is what must not appear.
 *
 * PRIV-LEAK is a scan of output, not a registry rule, so its mutations live here and not in the
 * registry's rule-by-rule mutation table (tests/registry/support/mutations.ts).
 */
const FAMILIES = ['bibliography_entry', 'source', 'essay', 'layer', 'place', 'collection', 'map', 'cartographer'] as const;
const PRIVATE_NOTE = 'Acquired from a dealer in Lyon';

/** The registry's records, with every entry the site does not show marked held. */
async function recordsAsSiteSeesThem() {
  const { records } = await loadRegistry(FIXTURE);
  const projected = projectPublic(records);
  const shown = new Set(publicEntries(projected).map((e) => e.id));
  return records.map((r) => (r.family === 'bibliography_entry' && !shown.has(r.id) ? { ...r, lifecycle: 'researching', release: 'held' } : r));
}
const scan = async (dir: string) => scanOutput(dir, await recordsAsSiteSeesThem(), { namedFamilies: FAMILIES });

/**
 * The Bibliography's own outputs, copied out of the whole site: its pages, its search index and every
 * citation file. `data/relations.json` is the registry's, not the Bibliography's, and is not here: it
 * lists the id of any published entry a public record points at, including one no public record
 * cites; whether that may stand is open (specs/006-bibliography/tasks.md, T040).
 */
function bibliographyOutputs(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'bib-outputs-'));
  const site = bibliographySite();
  for (const part of ['bibliography', 'data/cite']) {
    mkdirSync(path.join(dir, part), { recursive: true });
    cpSync(path.join(site, part), path.join(dir, part), { recursive: true });
  }
  mkdirSync(path.join(dir, 'data'), { recursive: true });
  cpSync(path.join(site, 'data/bibliography-index.json'), path.join(dir, 'data/bibliography-index.json'));
  return dir;
}

describe('the built Bibliography', () => {
  it('has none of what is held or not shown, and no private value, in any page, index, export or address', async () => {
    expect(await scan(bibliographyOutputs())).toEqual([]);
  });

  it('has the files it is checked over: the pages, the index and the exports of all three kinds', () => {
    const dir = bibliographyOutputs();
    for (const file of ['bibliography/index.html', 'bibliography/fixture-entry-1/cite.bib', 'bibliography/fixture-entry-1/cite.ris', 'bibliography/fixture-entry-1/cite.json', 'data/bibliography-index.json', 'data/cite/layer/roads.bib', 'data/cite/site.ris']) {
      expect(readFileSync(path.join(dir, file), 'utf8').length, file).toBeGreaterThan(0);
    }
  });

  it('is checked against real held content: the fixture has all of it', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const held = records.filter((r) => r.release === 'held');
    expect(held.map((r) => r.family).sort()).toEqual(expect.arrayContaining(['bibliography_entry', 'essay', 'source']));
    const shown = new Set(publicEntries(projectPublic(records)).map((e) => e.id));
    const notShown = records.filter((r) => r.family === 'bibliography_entry' && !shown.has(r.id));
    // entry 8: released, cited only by the held essay; entry 14: released, cited by nothing; entry 9: held outright
    expect(notShown.map((r) => r.slug).sort()).toEqual(['fixture-entry-14', 'fixture-entry-7', 'fixture-entry-8', 'fixture-entry-9']);
    expect(records.some((r) => (r.private as { editor_note?: string } | undefined)?.editor_note === PRIVATE_NOTE)).toBe(true);
  });
});

describe('named leaks in real output are seen, and reported without repeating the value', () => {
  /** A few real files, copied, so a mutation changes output and not the build. */
  function sample(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'bib-mutated-'));
    const site = bibliographySite();
    for (const file of [
      'bibliography/index.html',
      'bibliography/fixture-entry-1/index.html',
      'bibliography/fixture-entry-1/cite.bib',
      'bibliography/fixture-entry-4/cite.json',
      'data/bibliography-index.json',
      'data/cite/site.json',
    ]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      cpSync(path.join(site, file), path.join(dir, file));
    }
    return dir;
  }
  const append = (dir: string, file: string, text: string) => writeFileSync(path.join(dir, file), `${readFileSync(path.join(dir, file), 'utf8')}\n${text}\n`);

  const MUTATIONS: { name: string; file: string; text: string; secret: RegExp }[] = [
    { name: 'the title of an entry cited only by the held essay, in the index page', file: 'bibliography/index.html', text: '<li>A study only the held essay cites</li>', secret: /A study only the held essay cites/ },
    { name: 'the slug of an entry cited only by the held essay, in the search index', file: 'data/bibliography-index.json', text: '{"slug": "fixture-entry-8"}', secret: /fixture-entry-8/ },
    { name: 'the id of a held entry, in an entry page', file: 'bibliography/fixture-entry-1/index.html', text: 'tc:tc:bibliography_entry:bibliography_entry-000009', secret: /\x00never/ },
    { name: 'a link to the page of an entry nothing cites', file: 'bibliography/index.html', text: '<a href="/bibliography/fixture-entry-14/">read</a>', secret: /\x00never/ },
    { name: 'the title of a held entry, in an export', file: 'bibliography/fixture-entry-1/cite.bib', text: '@book{x, title = {A held draft entry}}', secret: /A held draft entry/ },
    { name: 'the title of the held essay, in an entry page', file: 'bibliography/fixture-entry-1/index.html', text: '<p>Zephyr Held Moraine Essay</p>', secret: /Zephyr Held Moraine Essay/ },
    { name: 'the title of a held Source, in an entry page', file: 'bibliography/fixture-entry-1/index.html', text: '<li>A held fixture source</li>', secret: /A held fixture source/ },
    { name: 'the slug of a held Source, in the search index', file: 'data/bibliography-index.json', text: '"held-fixture-source"', secret: /held-fixture-source/ },
    { name: 'a private value of a public entry, in its export', file: 'bibliography/fixture-entry-4/cite.json', text: `"note": "${PRIVATE_NOTE}"`, secret: /Lyon/ },
    { name: 'a private value, in the citation of the site', file: 'data/cite/site.json', text: PRIVATE_NOTE, secret: /Lyon/ },
  ];

  for (const mutation of MUTATIONS) {
    it(mutation.name, async () => {
      const dir = sample();
      expect(await scan(dir)).toEqual([]);
      append(dir, mutation.file, mutation.text);
      const violations = await scan(dir);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.every((v) => v.rule === 'PRIV-LEAK' && v.severity === 'error' && v.file === mutation.file)).toBe(true);
      // an id and an address are what the scan reports for a held entity; every other value is redacted
      expect(JSON.stringify(violations)).not.toMatch(mutation.secret);
    });
  }
});
