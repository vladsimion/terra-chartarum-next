import { beforeAll, describe, expect, it } from 'vitest';
import { bibliographySite, hasFile, readHtml, readPage, textOf } from '../support/build.js';

/*
 * Spec 006 T024 (FR-008, FR-007, contracts/bibliography-pages.md "Index page"): the built
 * /bibliography/ lists the public entries under the seven section headings in order, hides an empty
 * section, has a filter form that works as a GET without scripts, and lists nothing that is held or
 * uncited. Built from the bibliography fixture registry.
 */
let dir = '';
beforeAll(() => {
  dir = bibliographySite();
});
const page = () => readPage(dir, 'bibliography/index.html');

describe('the index page', () => {
  it('has one h1 and an orientation', () => {
    expect(page().querySelectorAll('h1').map((h) => textOf(h))).toEqual(['Bibliography']);
  });

  it('groups the public entries under the section headings, in the constitution’s order, and hides an empty section', () => {
    const headings = page().querySelectorAll('section.bibliography-section h2').map((h) => textOf(h));
    expect(headings).toEqual(['Primary sources', 'Historical maps', 'Reference works', 'Specialised studies', 'Digital resources', 'Datasets and licences']);
    expect(headings).not.toContain('Further reading');
  });

  it('lists each public entry once, as its Chicago form linking to its page', () => {
    const links = page().querySelectorAll('section.bibliography-section li a').map((a) => a.getAttribute('href'));
    expect(links.sort()).toEqual([1, 2, 3, 4, 5, 6, 10, 11, 12, 13].map((n) => `/bibliography/fixture-entry-${n}/`).sort());
    const first = page().querySelector('li[data-slug="fixture-entry-1"]');
    expect(textOf(first)).toMatch(/Doe/);
    expect(textOf(first)).toMatch(/a fixture chronicle/i); // the Chicago style capitalises the title
  });

  it('does not list an entry that is held, cited only by a held essay, or cited by nothing', () => {
    const html = readHtml(dir, 'bibliography/index.html');
    for (const n of [7, 8, 9, 14]) expect(html, `entry ${n}`).not.toContain(`fixture-entry-${n}`);
    expect(html).not.toMatch(/A study only the held essay cites|A held draft entry|A work nobody cites|zephyr/i);
  });

  it('marks each entry with its section and the essays that cite it, for the filters', () => {
    const entry = page().querySelector('li[data-slug="fixture-entry-2"]')!;
    expect(entry.getAttribute('data-section')).toBe('historical_maps');
    expect(entry.getAttribute('data-essays')).toBe('fixture-frontier fixture-related');
  });
});

describe('the filter form', () => {
  const form = () => page().querySelector('form.filters')!;

  it('submits as a GET to the same page', () => {
    expect(form().getAttribute('method')).toBe('get');
    expect(form().getAttribute('action')).toBe('/bibliography/');
  });

  it('offers a search field and a checkbox for each section that has entries, and for each essay that cites one', () => {
    expect(form().querySelector('input[name="q"]')?.getAttribute('type')).toBe('search');
    expect(form().querySelectorAll('input[name="section"]').map((i) => i.getAttribute('value'))).toEqual([
      'primary_sources', 'historical_maps', 'reference_works', 'specialised_studies', 'digital_resources', 'datasets_licences',
    ]);
    expect(form().querySelectorAll('input[name="essay"]').map((i) => i.getAttribute('value'))).toEqual(['fixture-related', 'fixture-frontier']); // by the essay's title
  });

  it('labels every control, and names the essays by title, not by slug', () => {
    expect(textOf(form())).toMatch(/Fixture essay, how a frontier line was drawn/);
    for (const input of form().querySelectorAll('input')) {
      const id = input.getAttribute('id');
      const labelled = (id && form().querySelector(`label[for="${id}"]`)) || input.closest('label');
      expect(labelled, input.toString()).toBeTruthy();
    }
  });

  it('says how many entries it shows', () => {
    expect(textOf(page().querySelector('[data-result-count]'))).toBe('10 of 10 entries');
  });
});

describe('the search index', () => {
  it('is written, with the contract’s fields and public entries only', () => {
    expect(hasFile(dir, 'data/bibliography-index.json')).toBe(true);
    const index = JSON.parse(readHtml(dir, 'data/bibliography-index.json')) as Record<string, unknown>[];
    expect(index).toHaveLength(10);
    expect(Object.keys(index[0]!).sort()).toEqual(['author', 'authors', 'essays', 'keywords', 'section', 'slug', 'title', 'year']);
    expect(JSON.stringify(index)).not.toMatch(/fixture-entry-(7|8|9|14)"|zephyr/);
  });
});
