import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatBibliographyItem, type CslItem } from '../../../src/essays/citations.js';
import { FIXTURE } from '../support/variant.js';
import { bibliographySite, hasFile, readHtml, readPage, textOf } from '../support/build.js';

/*
 * Spec 006 T024 (FR-002, FR-007, FR-010; scenarios 1, 2, 4, 5; contracts/bibliography-pages.md
 * "Entry page"): the built entry page shows the Chicago form, the identifiers, the external copy,
 * public editions and translations and "Cited in" by both routes, and a held-only or uncited entry
 * has no page. Built from the bibliography fixture registry.
 */
let dir = '';
beforeAll(() => {
  dir = bibliographySite();
});
const entry = (n: number) => `bibliography/fixture-entry-${n}/index.html`;
const page = (n: number) => readPage(dir, entry(n));
const chicago = (n: number): string => {
  const item = JSON.parse(readFileSync(`${FIXTURE}/content/bibliography_entry/bibliography_entry-${String(n).padStart(6, '0')}.csl.json`, 'utf8')) as CslItem;
  return formatBibliographyItem(item);
};

describe('which entries have a page', () => {
  it('gives a page to each public entry', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 10, 11, 12, 13]) expect(hasFile(dir, entry(n)), `entry ${n}`).toBe(true);
  });

  it('gives none to a held entry, one cited only by the held essay, or one cited by nothing', () => {
    for (const n of [7, 8, 9, 14]) expect(hasFile(dir, entry(n)), `entry ${n}`).toBe(false);
  });
});

describe('the entry itself', () => {
  it('shows the Chicago bibliography form, made by the shared generator', () => {
    expect(textOf(page(4).querySelector('.chicago'))).toBe(chicago(4).replace(/\s+/g, ' '));
  });

  it('has one h1, the title, and the section label', () => {
    expect(page(4).querySelectorAll('h1').map((h) => textOf(h))).toEqual(['A fixture study of frontiers']);
    expect(textOf(page(4).querySelector('.section-label'))).toBe('Specialised studies');
  });

  it('shows the identifiers of the CSL-JSON as links, and the external copy', () => {
    const doi = page(4).querySelector('a[href="https://doi.org/10.1000/fixture.4"]');
    expect(textOf(doi)).toBe('10.1000/fixture.4');
    expect(textOf(page(10).querySelector('[data-identifier="ISBN"]'))).toContain('978-0-306-40615-7');
    const copy = page(13).querySelector('a[href="https://archive.example.org/fa-12-3"]');
    expect(textOf(copy)).toMatch(/digital copy/i);
    expect(textOf(page(13).querySelector('[data-identifier="call-number"], [data-identifier="archive_location"]'))).toContain('FA 12/3');
  });

  it('shows no identifier block for an entry with none', () => {
    expect(page(1).querySelector('.identifiers')).toBeNull();
  });
});

describe('other editions and translations (scenario 5)', () => {
  const related = (n: number) => page(n).querySelectorAll('.editions li').map((li) => `${li.getAttribute('data-relation')}:${li.querySelector('a')?.getAttribute('href')}`);

  it('lists the public ones with their relation, in either direction', () => {
    expect(related(10)).toEqual(['has_edition:/bibliography/fixture-entry-11/']);
    expect(related(11)).toEqual(['edition_of:/bibliography/fixture-entry-10/', 'has_translation:/bibliography/fixture-entry-12/']);
    expect(related(12)).toEqual(['translation_of:/bibliography/fixture-entry-11/']);
  });

  it('says the relation in words', () => {
    expect(textOf(page(11).querySelector('.editions'))).toMatch(/Edition of/);
    expect(textOf(page(11).querySelector('.editions'))).toMatch(/Translation/);
  });

  it('has no section for an entry with none', () => {
    expect(page(1).querySelector('.editions')).toBeNull();
  });
});

describe('cited in (scenarios 1 and 4)', () => {
  const group = (n: number, name: 'evidence' | 'listed') => page(n).querySelector(`section.cited-${name}`);
  const items = (n: number, name: 'evidence' | 'listed') => group(n, name)?.querySelectorAll('li') ?? [];

  it('labels the two routes as separate groups', () => {
    expect(textOf(group(1, 'evidence')?.querySelector('h3'))).toBe('Cited as evidence');
    expect(textOf(group(1, 'listed')?.querySelector('h3'))).toBe('Listed in bibliography');
  });

  it('links each citing record: essays, a map; and sorts each group by title', () => {
    const listed = items(1, 'listed').map((li) => li.querySelector('a')?.getAttribute('href'));
    expect(listed).toEqual(['/collection/fixture-map-frontier/', '/essays/fixture-related/', '/essays/fixture-frontier/']);
  });

  it('shows the locator and marks a pending one as pending, in words', () => {
    const [item] = items(1, 'evidence');
    expect(textOf(item)).toContain('p. 12');
    expect(textOf(item)).toContain('Locator pending verification');
    expect(item?.getAttribute('data-verification')).toBe('pending');
  });

  it('shows who verified a verified locator, and when', () => {
    const found = items(2, 'evidence');
    expect(found).toHaveLength(2);
    expect(textOf(found[0])).toContain('Verified by A. Editor on 2026-10-10');
    expect(found[0]?.getAttribute('data-verification')).toBe('verified');
  });

  it('names a cartographer, a dataset with its layer, and a layer', () => {
    expect(items(4, 'listed').map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual(['/cartographers/fixture-cartographer/', '/essays/fixture-related/']);
    const five = items(5, 'listed');
    expect(five).toHaveLength(2);
    expect(textOf(group(5, 'listed'))).toMatch(/Bibliography fixture data/);
    expect(textOf(group(5, 'listed'))).toMatch(/Roads of the province/);
    // a layer has no page of its own: it opens in the Atlas, with the layer on the map (an address, not a file)
    expect([...new Set(group(5, 'listed')!.querySelectorAll('a').map((a) => a.getAttribute('href')))]).toEqual(['/atlas/?l=roads']);
  });

  it('hides a group that is empty', () => {
    expect(group(3, 'evidence')).toBeNull();
    expect(group(3, 'listed')).not.toBeNull();
  });

  it('never links a layer file or an Atlas binary', () => {
    for (const n of [1, 5, 6]) expect(readHtml(dir, entry(n))).not.toMatch(/\.fgb|\.pmtiles|\/data\/layers\//);
  });
});

describe('what is held', () => {
  it('is nowhere in any entry page', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 10, 11, 12, 13]) {
      expect(readHtml(dir, entry(n)), `entry ${n}`).not.toMatch(/zephyr|held essay|A held draft entry|only the held essay cites/i);
    }
  });
});

describe('sections and finding aids (US3)', () => {
  it('labels the seven sections as the data model does, on the entry page', () => {
    const labels: Record<number, string> = { 1: 'Primary sources', 2: 'Historical maps', 3: 'Reference works', 4: 'Specialised studies', 5: 'Digital resources', 6: 'Datasets and licences' };
    for (const [n, label] of Object.entries(labels)) expect(textOf(page(Number(n)).querySelector('.section-label')), `entry ${n}`).toBe(label);
  });

  it('never calls a section by the draft’s name for historical maps', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 10, 11, 12, 13]) expect(readHtml(dir, entry(n)), `entry ${n}`).not.toMatch(/cartographic witnesses/i);
    expect(readHtml(dir, 'bibliography/index.html')).not.toMatch(/cartographic witnesses/i);
  });

  it('badges a finding aid, in words', () => {
    const badge = page(13).querySelector('.badge-finding-aid');
    expect(textOf(badge)).toBe('Finding aid');
    expect(textOf(page(13).querySelector('.finding-aid-note'))).toMatch(/not itself cited as evidence/i);
  });

  it('badges nothing else', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 10, 11, 12]) expect(page(n).querySelector('.badge-finding-aid'), `entry ${n}`).toBeNull();
  });

  it('shows a finding aid under no "Cited as evidence" group', () => {
    expect(page(13).querySelector('section.cited-evidence')).toBeNull();
    expect(readHtml(dir, entry(13))).not.toContain('Cited as evidence');
  });
});
