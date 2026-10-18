import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { collectionSite, readHtml, readPage } from '../support/build.js';

/*
 * Spec 004 T035 (US2, contracts/collection-pages.md "Collection list page"): the list is static HTML
 * of every public map and no held record, the filter form and sort control are present and submit
 * as GET, and the filter index holds only the contract's fields.
 */
let dir = '';
beforeAll(() => {
  dir = collectionSite();
});
const page = () => readPage(dir, 'collection/index.html');
const items = () => page().querySelectorAll('ol.map-list > li');
const slugOf = (li: { querySelector(s: string): { getAttribute(n: string): string | null | undefined } | null }) => li.querySelector('a.title')?.getAttribute('href');

describe('the list', () => {
  it('has one item for every public map, in the default order, and none for a held map', () => {
    expect(items().map(slugOf)).toEqual([
      '/collection/fixture-map-workshop/',
      '/collection/fixture-map-frontier/',
      '/collection/fixture-map-withheld/',
      '/collection/fixture-map-road/',
      '/collection/fixture-map-undated/',
    ]);
    expect(readHtml(dir, 'collection/index.html')).not.toContain('held-fixture-map-dealer');
  });

  it('shows each map’s title, maker, date and witness', () => {
    const first = items().find((li) => slugOf(li) === '/collection/fixture-map-frontier/')!;
    expect(first.querySelector('a.title')?.text.trim()).toBe('A fixture map of the frontier');
    expect(first.querySelector('.makers')?.text.trim()).toBe('A fixture cartographer');
    expect(first.querySelector('.date')?.text.trim()).toBe('1595');
    expect(first.querySelector('.witness')?.text.trim()).toBe('Held by this project');
  });

  it('says so when a map has no date', () => {
    const undated = items().find((li) => slugOf(li) === '/collection/fixture-map-undated/')!;
    expect(undated.querySelector('.date')?.text.trim()).toBe('Date unknown');
  });

  it('shows a thumbnail only for a cleared image, with its credit and licence beside it', () => {
    const withImage = items().find((li) => slugOf(li) === '/collection/fixture-map-road/')!;
    expect(withImage.querySelector('img')?.getAttribute('src')).toBe('https://example.org/iiif/road/full/800,/0/default.jpg');
    expect(withImage.querySelector('figcaption')?.text).toContain('Fixture Library');
    expect(withImage.querySelector('figcaption')?.text).toContain('CC BY 4.0');
    const withheld = items().find((li) => slugOf(li) === '/collection/fixture-map-withheld/')!;
    expect(withheld.querySelector('img')).toBeNull();
    expect(readHtml(dir, 'collection/index.html')).not.toContain('example.org/iiif/withheld');
  });

  it('gives every item its id, for the script that reorders the list', () => {
    for (const li of items()) expect(li.getAttribute('data-id')).toMatch(/^tc:tc:map:map-\d{6}$/);
  });
});

describe('the filter form', () => {
  const form = () => page().querySelector('form.filters')!;

  it('submits as GET to the same page', () => {
    expect(form().getAttribute('method')).toBe('get');
    expect(form().getAttribute('action')).toBe('/collection/');
  });

  it('has a checkbox for each cartographer with a public map, and none for a held one', () => {
    const boxes = form().querySelectorAll('input[name="cartographer"]');
    expect(boxes.map((b) => b.getAttribute('value')).sort()).toEqual(['tc:tc:cartographer:cartographer-000001', 'tc:tc:cartographer:cartographer-000002']);
    expect(form().text).not.toContain('A held fixture cartographer');
  });

  it('has a checkbox for each region or country a public map covers, and not for a settlement', () => {
    expect(form().querySelectorAll('input[name="region"]').map((b) => b.getAttribute('value')).sort()).toEqual(['tc:tc:place:place-000001', 'tc:tc:place:place-000002']);
  });

  it('has a checkbox for each room that has a public map', () => {
    expect(form().querySelectorAll('input[name="room"]').map((b) => b.getAttribute('value')).sort()).toEqual(['tc:tc:room:border', 'tc:tc:room:map']);
  });

  it('has from and to years, a witness choice and a sort control', () => {
    expect(form().querySelector('input[name="from"][type="number"]')).not.toBeNull();
    expect(form().querySelector('input[name="to"][type="number"]')).not.toBeNull();
    expect(form().querySelectorAll('select[name="witness"] option').map((o) => o.getAttribute('value'))).toEqual(['', 'held', 'institutional']);
    expect(form().querySelectorAll('select[name="sort"] option').map((o) => o.getAttribute('value'))).toEqual(['date', 'title', 'maker']);
  });

  it('labels every control and has a submit button and a way to clear', () => {
    for (const control of form().querySelectorAll('input, select')) {
      const id = control.getAttribute('id');
      const labelled = (id && form().querySelector(`label[for="${id}"]`)) || control.closest('label');
      expect(labelled, control.outerHTML.slice(0, 80)).toBeTruthy();
    }
    expect(form().querySelector('button[type="submit"]')?.text.trim()).toBe('Apply filters');
    expect(form().querySelector('a.clear')?.getAttribute('href')).toBe('/collection/');
  });

  it('has a status line that announces the count', () => {
    expect(page().querySelector('[role="status"]')?.text.trim()).toBe('5 of 5 maps');
  });
});

describe('the filter index (contracts/collection-pages.md)', () => {
  const index = () => JSON.parse(readFileSync(path.join(dir, 'data', 'collection-index.json'), 'utf8')) as Record<string, unknown>[];

  it('holds the public maps only, in the default order, with only the contract’s fields', () => {
    expect(index().map((e) => e.slug)).toEqual(['fixture-map-workshop', 'fixture-map-frontier', 'fixture-map-withheld', 'fixture-map-road', 'fixture-map-undated']);
    for (const e of index()) expect(Object.keys(e).sort()).toEqual(['date_label', 'from', 'id', 'makers', 'regions', 'rooms', 'slug', 'title', 'to', 'uncertain', 'witness']);
  });

  it('carries nothing about a held record', () => {
    const text = readFileSync(path.join(dir, 'data', 'collection-index.json'), 'utf8');
    for (const word of ['held-fixture', 'Zephyr', 'dealer', 'cartographer-000003']) expect(text).not.toContain(word);
  });
});
