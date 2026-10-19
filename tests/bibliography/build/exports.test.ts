import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import { beforeAll, describe, expect, it } from 'vitest';
import { bibliographySite, hasFile, readHtml, readPage, textOf } from '../support/build.js';
import type { CslItem } from '../../../src/essays/citations.js';

/*
 * Spec 006 T033 (FR-009, SC-002, contracts/cite-inputs.md): every public entry has BibTeX, RIS and
 * CSL-JSON files, a dataset and a layer have theirs under /data/cite/, and so does the site; each
 * parses with its own format's parser and carries the canonical URL and the access date the build was
 * given (BUILD_DATE=2026-10-17); and a held or uncited input has no file.
 */
let dir = '';
beforeAll(() => {
  dir = bibliographySite();
});
const ORIGIN = 'https://terra-chartarum.org';
const PUBLIC_ENTRIES = [1, 2, 3, 4, 5, 6, 10, 11, 12, 13];
const parsed = (text: string): CslItem => (new Cite(text).data as CslItem[])[0]!;

describe('an entry’s files', () => {
  it('has BibTeX, RIS and CSL-JSON for each public entry', () => {
    for (const n of PUBLIC_ENTRIES) for (const ext of ['bib', 'ris', 'json']) expect(hasFile(dir, `bibliography/fixture-entry-${n}/cite.${ext}`), `entry ${n} .${ext}`).toBe(true);
  });

  it('has none for a held entry, one cited only by the held essay, or one cited by nothing', () => {
    for (const n of [7, 8, 9, 14]) for (const ext of ['bib', 'ris', 'json']) expect(hasFile(dir, `bibliography/fixture-entry-${n}/cite.${ext}`), `entry ${n} .${ext}`).toBe(false);
  });

  it('parses with each format’s own parser, to the entry’s work', () => {
    for (const n of PUBLIC_ENTRIES) {
      const base = `bibliography/fixture-entry-${n}/cite`;
      const json = JSON.parse(readHtml(dir, `${base}.json`)) as CslItem;
      for (const ext of ['bib', 'ris', 'json']) expect(parsed(readHtml(dir, `${base}.${ext}`)).title, `entry ${n} .${ext}`).toBe(json.title);
    }
  });

  it('carries the canonical URL when the item has none of its own, and the access date', () => {
    const base = 'bibliography/fixture-entry-1/cite';
    const url = `${ORIGIN}/bibliography/fixture-entry-1/`;
    expect(readHtml(dir, `${base}.bib`)).toContain(url);
    expect(readHtml(dir, `${base}.bib`)).toContain('2026-10-17');
    expect(readHtml(dir, `${base}.ris`)).toContain(`UR  - ${url}`);
    expect(readHtml(dir, `${base}.ris`)).toContain('Y2  - 2026/10/17');
    const json = JSON.parse(readHtml(dir, `${base}.json`)) as CslItem;
    expect(json).toMatchObject({ URL: url, accessed: { 'date-parts': [[2026, 10, 17]] } });
  });

  it('keeps the CSL-JSON the entry has: the same title, authors and date', () => {
    const json = JSON.parse(readHtml(dir, 'bibliography/fixture-entry-4/cite.json')) as CslItem;
    expect(json).toMatchObject({ title: 'A fixture study of frontiers', DOI: '10.1000/fixture.4', author: [{ family: 'Moe', given: 'Jane' }] });
  });
});

describe('a dataset’s and a layer’s files', () => {
  it('has all three for the dataset and the layer', () => {
    for (const ext of ['bib', 'ris', 'json']) {
      expect(hasFile(dir, `data/cite/dataset/bibliography-fixture-data.${ext}`), `dataset .${ext}`).toBe(true);
      expect(hasFile(dir, `data/cite/layer/roads.${ext}`), `layer .${ext}`).toBe(true);
    }
  });

  it('cites each at the Atlas view that shows the layer, with the access date, as a CSL dataset', () => {
    for (const file of ['data/cite/dataset/bibliography-fixture-data.json', 'data/cite/layer/roads.json']) {
      expect(JSON.parse(readHtml(dir, file)), file).toMatchObject({ type: 'dataset', publisher: 'Terra Chartarum', URL: `${ORIGIN}/atlas/?l=roads`, accessed: { 'date-parts': [[2026, 10, 17]] } });
    }
    expect(JSON.parse(readHtml(dir, 'data/cite/layer/roads.json'))).toMatchObject({ title: 'Roads of the province', 'container-title': 'Bibliography fixture data', version: '1.0.0' });
  });

  it('parses with each format’s own parser', () => {
    for (const file of ['data/cite/dataset/bibliography-fixture-data', 'data/cite/layer/roads']) {
      for (const ext of ['bib', 'ris', 'json']) expect(parsed(readHtml(dir, `${file}.${ext}`)).title, `${file}.${ext}`).toBeTruthy();
    }
  });
});

describe('the site’s files', () => {
  it('has all three, and they cite the site at its own address', () => {
    for (const ext of ['bib', 'ris', 'json']) expect(parsed(readHtml(dir, `data/cite/site.${ext}`)).title, ext).toBe('Terra Chartarum');
    expect(JSON.parse(readHtml(dir, 'data/cite/site.json'))).toMatchObject({ type: 'webpage', URL: `${ORIGIN}/`, accessed: { 'date-parts': [[2026, 10, 17]] } });
  });
});

describe('the pages that offer them', () => {
  it('shows an entry the three downloads, beside the Chicago form', () => {
    const links = readPage(dir, 'bibliography/fixture-entry-1/index.html').querySelectorAll('nav.citation-export a').map((a) => [textOf(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['BibTeX', '/bibliography/fixture-entry-1/cite.bib'],
      ['RIS', '/bibliography/fixture-entry-1/cite.ris'],
      ['CSL-JSON', '/bibliography/fixture-entry-1/cite.json'],
    ]);
  });

  it('puts a “Cite this site” statement at the foot of the index, with its downloads', () => {
    const section = readPage(dir, 'bibliography/index.html').querySelector('section.cite-site')!;
    expect(textOf(section.querySelector('h2'))).toBe('Cite this site');
    expect(textOf(section.querySelector('.chicago'))).toMatch(/Terra Chartarum/);
    expect(textOf(section.querySelector('.chicago'))).toMatch(/terra-chartarum\.org/);
    expect(section.querySelectorAll('a').map((a) => a.getAttribute('href'))).toEqual(['/data/cite/site.bib', '/data/cite/site.ris', '/data/cite/site.json']);
  });

  it('has a link only to files that exist', () => {
    for (const file of ['bibliography/index.html', ...PUBLIC_ENTRIES.map((n) => `bibliography/fixture-entry-${n}/index.html`)]) {
      for (const a of readPage(dir, file).querySelectorAll('nav.citation-export a')) expect(hasFile(dir, (a.getAttribute('href') ?? '').replace(/^\//, '')), `${file} -> ${a.getAttribute('href')}`).toBe(true);
    }
  });
});
