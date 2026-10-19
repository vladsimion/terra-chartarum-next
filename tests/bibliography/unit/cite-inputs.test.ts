import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import { describe, expect, it } from 'vitest';
import { citeFiles, datasetItem, entryItem, exportsOf, layerItem, siteItem } from '../../../src/bibliography/cite-inputs.js';
import { layer, record } from '../../registry/support/builders.js';
import { PUBLIC } from '../../registry/support/bibliography.js';
import { projectPublic } from '../../../src/registry/project.js';
import type { CslItem } from '../../../src/essays/citations.js';
import { E, cslFor, id } from '../support/world.js';

/*
 * Spec 006 T031 (FR-009, SC-002, contracts/cite-inputs.md): the CSL item for an entry, a dataset, a
 * layer and the site, with the stable URL on the site's origin and the access date given; and the
 * three export files made from an item, each of which its own format's parser reads back.
 */
const SITE = new URL('https://terra-chartarum.org');
const ACCESSED = '2026-10-17';
const accessedParts = { 'date-parts': [[2026, 10, 17]] };

const dataset = (over: Record<string, unknown> = {}) => record('dataset', 1, { ...PUBLIC, version: '1.2', rights: { licence: 'CC-BY-4.0', attribution: 'The Fixture Survey' }, ...over });
const theLayer = (over: Record<string, unknown> = {}) => layer(1, { ...PUBLIC, slug: 'roads', title: 'Roads of the province', dataset: id('dataset', 1), ...over });
const world = (records = [dataset({ slug: 'a-dataset', title: 'The dataset' }), theLayer()]) => projectPublic(records);

describe('entryItem', () => {
  const csl = cslFor(E(10));

  it('is the entry’s own CSL-JSON, with the page address as its URL and the access date added', () => {
    const item = entryItem(csl, 'fixture-entry-10', SITE, ACCESSED);
    expect(item).toMatchObject({ ...csl, URL: 'https://terra-chartarum.org/bibliography/fixture-entry-10/', accessed: accessedParts });
  });

  it('replaces a URL the item already has: the stable URL is the canonical page address (FR-009)', () => {
    const own = { ...csl, URL: 'https://example.org/the-work' } as CslItem;
    expect(entryItem(own, 'fixture-entry-10', SITE, ACCESSED).URL).toBe('https://terra-chartarum.org/bibliography/fixture-entry-10/');
  });

  it('does not change the item it was given', () => {
    const before = JSON.stringify(csl);
    entryItem(csl, 'fixture-entry-10', SITE, ACCESSED);
    expect(JSON.stringify(csl)).toBe(before);
  });
});

describe('datasetItem', () => {
  it('is a CSL dataset with its title, version, publisher, attribution and the Atlas view that shows it', () => {
    const records = world();
    const item = datasetItem(records.find((r) => r.family === 'dataset')!, records, SITE, ACCESSED)!;
    expect(item).toMatchObject({
      type: 'dataset',
      title: 'The dataset',
      version: '1.2',
      publisher: 'Terra Chartarum',
      author: [{ literal: 'The Fixture Survey' }],
      URL: 'https://terra-chartarum.org/atlas/?l=roads',
      accessed: accessedParts,
    });
  });

  it('has no author when the rights name none', () => {
    const records = world([dataset({ rights: { licence: 'CC-BY-4.0' } }), theLayer()]);
    expect(datasetItem(records.find((r) => r.family === 'dataset')!, records, SITE, ACCESSED)).not.toHaveProperty('author');
  });

  it('is nothing for a dataset no public layer shows: it has no address to cite', () => {
    const records = world([dataset(), theLayer({ lifecycle: 'researching', release: 'held' })]);
    expect(datasetItem(records.find((r) => r.family === 'dataset')!, records, SITE, ACCESSED)).toBeNull();
  });
});

describe('layerItem', () => {
  it('is a CSL dataset titled by the layer, naming its dataset, at the layer’s Atlas view', () => {
    const records = world();
    const item = layerItem(records.find((r) => r.family === 'layer')!, records, SITE, ACCESSED);
    expect(item).toMatchObject({
      type: 'dataset',
      title: 'Roads of the province',
      'container-title': 'The dataset',
      version: '1.2',
      publisher: 'Terra Chartarum',
      author: [{ literal: 'The Fixture Survey' }],
      URL: 'https://terra-chartarum.org/atlas/?l=roads',
      accessed: accessedParts,
    });
  });

  it('falls back to the layer’s own attribution when its dataset names none', () => {
    const records = world([dataset({ rights: { licence: 'CC-BY-4.0' } }), theLayer({ rights: { licence: 'CC-BY-4.0', attribution: 'The Layer Authors' } })]);
    const item = layerItem(records.find((r) => r.family === 'layer')!, records, SITE, ACCESSED);
    expect(item).toMatchObject({ author: [{ literal: 'The Layer Authors' }] });
  });

  it('names no dataset, version or author when its dataset is not public', () => {
    const records = world([dataset({ lifecycle: 'researching', release: 'held' }), theLayer()]);
    const item = layerItem(records.find((r) => r.family === 'layer')!, records, SITE, ACCESSED)!;
    expect(item).not.toHaveProperty('container-title');
    expect(item).not.toHaveProperty('version');
    expect(item).not.toHaveProperty('author');
  });
});

describe('siteItem', () => {
  it('is a web page at the site’s own address', () => {
    expect(siteItem(SITE, ACCESSED)).toEqual({ id: 'terra-chartarum', type: 'webpage', title: 'Terra Chartarum', publisher: 'Terra Chartarum', URL: 'https://terra-chartarum.org/', accessed: accessedParts });
  });
});

describe('citeFiles', () => {
  it('gives the three addresses of each kind of input, in one place', () => {
    expect(citeFiles('entry', 'fixture-entry-1')).toEqual({ bibtex: '/bibliography/fixture-entry-1/cite.bib', ris: '/bibliography/fixture-entry-1/cite.ris', json: '/bibliography/fixture-entry-1/cite.json' });
    expect(citeFiles('layer', 'roads').bibtex).toBe('/data/cite/layer/roads.bib');
    expect(citeFiles('dataset', 'a-dataset').json).toBe('/data/cite/dataset/a-dataset.json');
    expect(citeFiles('site').ris).toBe('/data/cite/site.ris');
  });
});

describe('exportsOf (SC-002)', () => {
  const item = entryItem(cslFor(E(10)), 'fixture-entry-10', SITE, ACCESSED);
  const files = exportsOf(item);

  it('writes BibTeX that BibTeX parsing reads back to the same work', () => {
    const [back] = new Cite(files.bibtex).data as CslItem[];
    expect(back).toMatchObject({ type: 'book', title: 'The Roads of the Province' });
    expect(files.bibtex).toContain('https://terra-chartarum.org/bibliography/fixture-entry-10/');
    expect(files.bibtex).toContain('2026-10-17');
  });

  it('writes RIS that RIS parsing reads back to the same work, with the address and the access date', () => {
    const [back] = new Cite(files.ris).data as CslItem[];
    expect(back).toMatchObject({ type: 'book', title: 'The Roads of the Province' });
    expect(files.ris).toMatch(/UR {2}- https:\/\/terra-chartarum\.org\/bibliography\/fixture-entry-10\//);
    expect(files.ris).toMatch(/Y2 {2}- 2026\/10\/17/);
    expect(files.ris.endsWith('ER  - \r\n')).toBe(true);
  });

  it('writes CSL-JSON that is the item: one object a CSL parser reads', () => {
    expect(JSON.parse(files.csljson)).toEqual(item);
    const [back] = new Cite(files.csljson).data as CslItem[];
    expect(back).toMatchObject({ title: 'The Roads of the Province', URL: 'https://terra-chartarum.org/bibliography/fixture-entry-10/' });
  });

  it('is the same bytes for the same item', () => {
    expect(exportsOf(item)).toEqual(files);
  });

  it('works for a dataset and for the site, whose types are not books', () => {
    const records = world();
    const dataset = datasetItem(records.find((r) => r.family === 'dataset')!, records, SITE, ACCESSED)!;
    for (const input of [dataset, siteItem(SITE, ACCESSED)]) {
      const out = exportsOf(input);
      expect((new Cite(out.bibtex).data as CslItem[])[0]?.title).toBe(input.title);
      expect((new Cite(out.ris).data as CslItem[])[0]?.title).toBe(input.title);
    }
  });
});
