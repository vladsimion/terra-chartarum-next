import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { collectionSite, readHtml, readPage } from '../support/build.js';

/*
 * Spec 004 T025 (US1, FR-005, SC-001): the record page of each public fixture map, read from the
 * built output of tests/collection/fixtures/registry. A held map has no page.
 */
const SLUGS = {
  held: 'fixture-map-frontier',
  iiif: 'fixture-map-road',
  workshop: 'fixture-map-workshop',
  withheld: 'fixture-map-withheld',
  undated: 'fixture-map-undated',
} as const;
const HELD_SLUG = 'held-fixture-map-dealer';

let dir = '';
beforeAll(() => {
  dir = collectionSite();
});
const page = (slug: string) => readPage(dir, `collection/${slug}/index.html`);
const field = (slug: string, name: string) => page(slug).querySelector(`[data-field="${name}"]`);

describe('record pages exist for public maps only', () => {
  it('builds a page for each public map', () => {
    for (const slug of Object.values(SLUGS)) expect(existsSync(path.join(dir, 'collection', slug, 'index.html')), slug).toBe(true);
  });

  it('builds none for a held map, and its title and slug are nowhere in the output', () => {
    expect(existsSync(path.join(dir, 'collection', HELD_SLUG))).toBe(false);
    const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && /\.(html|json|txt|xml)$/.test(e.name));
    for (const file of files) {
      const text = readFileSync(path.join(e(file)), 'utf8');
      expect(text, e(file)).not.toContain(HELD_SLUG);
      expect(text, e(file)).not.toContain('A held fixture map with dealer-only support');
    }
  });
});
const e = (entry: { parentPath: string; name: string }) => path.join(entry.parentPath, entry.name);

describe('the title and witness', () => {
  it('shows the title and the original title', () => {
    const p = page(SLUGS.held);
    expect(p.querySelector('main h1')?.text.trim()).toBe('A fixture map of the frontier');
    expect(p.querySelector('.original-title')?.text.trim()).toBe('Tabula Vallis Limitis');
  });

  it('labels the witness and the verification', () => {
    expect(page(SLUGS.held).querySelector('.witness')?.text.trim()).toBe('Held by this project');
    expect(page(SLUGS.iiif).querySelector('.witness')?.text.trim()).toBe('Institutional copy: Fixture Library');
    expect(page(SLUGS.held).querySelector('.verification')?.text.replace(/\s+/g, ' ').trim()).toContain('Inspected in person');
    expect(page(SLUGS.held).querySelector('.verification')?.text).toContain('2026-09-15');
  });
});

describe('the field list (scenarios 2 and 4)', () => {
  it('shows a recorded value', () => {
    expect(field(SLUGS.held, 'date_published')?.querySelector('dd')?.text.trim()).toBe('1595');
    expect(field(SLUGS.held, 'dimensions')?.querySelector('dd')?.text.trim()).toBe('420 × 540 mm');
  });

  it('shows an explicit status where a value is not established', () => {
    expect(field(SLUGS.undated, 'date_published')?.querySelector('dd')?.text.trim()).toBe('Unknown');
    expect(field(SLUGS.undated, 'images')?.querySelector('dd')?.text.trim()).toBe('Not yet verified');
  });

  it('has a non-empty value cell in every row of every page', () => {
    for (const slug of Object.values(SLUGS)) {
      for (const row of page(slug).querySelectorAll('[data-field]')) expect(row.querySelector('dd')?.text.trim(), `${slug} ${row.getAttribute('data-field')}`).not.toBe('');
    }
  });

  it('labels observed and inferred on a held witness, in words', () => {
    expect(field(SLUGS.held, 'provenance')?.text).toContain('Observed');
    expect(field(SLUGS.held, 'atlas_context')?.text).toContain('Inferred');
    expect(field(SLUGS.iiif, 'provenance')?.text).not.toMatch(/Observed|Inferred/);
  });
});

describe('attribution (scenarios 3 and 6)', () => {
  it('shows the evidence behind it', () => {
    const attribution = page(SLUGS.held).querySelector('section.attribution')!;
    expect(attribution.text).toContain('A fixture source 1');
    expect(attribution.text).toContain('p. 12');
    expect(attribution.querySelector('a')?.getAttribute('href')).toBe('/cartographers/fixture-cartographer/');
  });

  it('says the maker is not individually established, and names the workshop', () => {
    const text = page(SLUGS.workshop).querySelector('section.attribution')!.text.replace(/\s+/g, ' ');
    expect(text).toContain('Maker not individually established');
    expect(text).toContain('A fixture workshop');
  });
});

describe('images (scenario 5, FR-005, SC-001)', () => {
  it('shows a cleared image with its alt, attribution and licence beside it', () => {
    const block = page(SLUGS.iiif).querySelector('figure.image-block')!;
    const img = block.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.org/iiif/road/full/800,/0/default.jpg');
    expect(img.getAttribute('alt')).toBe('A road sheet showing a route through the valley');
    const caption = block.querySelector('figcaption')!.text;
    expect(caption).toContain('Fixture Library');
    expect(caption).toContain('CC BY 4.0');
  });

  it('puts attribution and licence next to every image on every page that shows one', () => {
    for (const slug of [SLUGS.held, SLUGS.iiif, SLUGS.workshop]) {
      for (const figure of page(slug).querySelectorAll('figure.image-block')) {
        expect(figure.querySelector('img'), slug).not.toBeNull();
        expect(figure.querySelector('figcaption')?.text, slug).toMatch(/CC BY 4\.0/);
      }
    }
  });

  it('has an Open viewer button for a deep-zoom source and none for a static image', () => {
    expect(page(SLUGS.iiif).querySelector('button[data-viewer]')?.text.trim()).toBe('Open viewer');
    expect(page(SLUGS.held).querySelector('button[data-viewer]')).toBeNull();
  });

  it('shows no image for an uncleared reproduction, says why, and leaves its address out of the page', () => {
    const html = readHtml(dir, `collection/${SLUGS.withheld}/index.html`);
    const p = page(SLUGS.withheld);
    expect(p.querySelector('main img')).toBeNull();
    expect(p.querySelector('.image-withheld')?.text).toContain('has not been cleared');
    expect(html).not.toContain('example.org/iiif/withheld');
    expect(p.querySelector('button[data-viewer]')).toBeNull();
  });

  it('says nothing about an image on a record that has none', () => {
    expect(page(SLUGS.undated).querySelector('figure.image-block, .image-withheld')).toBeNull();
  });
});

describe('the first load (FR-004)', () => {
  it('ships no viewer: scripts on the page are small and do not contain the library', () => {
    const p = page(SLUGS.iiif);
    for (const script of p.querySelectorAll('script')) {
      const src = script.getAttribute('src');
      const text = src ? readFileSync(path.join(dir, src.replace(/^\//, '')), 'utf8') : script.text;
      expect(text.length, src ?? 'inline').toBeLessThan(6_000);
      expect(text, src ?? 'inline').not.toMatch(/OpenSeadragon/);
    }
  });

  it('gives a no-JavaScript reader a plain link to the still image', () => {
    const link = page(SLUGS.iiif).querySelector('.image-block a.still-link');
    expect(link?.getAttribute('href')).toBe('https://example.org/iiif/road/full/800,/0/default.jpg');
  });
});

describe('citation and export (FR-006)', () => {
  it('offers a Chicago entry and the three export files', () => {
    const cite = page(SLUGS.held).querySelector('section.cite')!;
    // Chicago style capitalises the title
    expect(cite.text).toContain('A Fixture Map of the Frontier');
    expect(cite.text).toContain('https://terra-chartarum.org/collection/fixture-map-frontier/');
    const links = cite.querySelectorAll('nav a').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['BibTeX', '/collection/fixture-map-frontier/cite.bib'],
      ['RIS', '/collection/fixture-map-frontier/cite.ris'],
      ['CSL-JSON', '/collection/fixture-map-frontier/cite.json'],
    ]);
  });

  it('writes the three files, each carrying the stable URL and the access date', () => {
    for (const file of ['cite.bib', 'cite.ris', 'cite.json']) {
      const text = readFileSync(path.join(dir, 'collection', SLUGS.held, file), 'utf8');
      expect(text, file).toContain('https://terra-chartarum.org/collection/fixture-map-frontier/');
      expect(text, file).toContain('A fixture map of the frontier');
      expect(text, file).toMatch(file === 'cite.json' ? /"accessed"/ : /\d{4}[-/]\d{2}[-/]\d{2}/);
    }
  });

  it('writes no export files for a map that is not public', () => {
    expect(existsSync(path.join(dir, 'collection', HELD_SLUG))).toBe(false);
  });
});

describe('where used (US4)', () => {
  const used = (slug: string) => page(slug).querySelector('section.where-used');

  it('lists the public essays that cite the map, linked, in title order', () => {
    const links = used(SLUGS.iiif)!.querySelectorAll('.essays a').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['A related fixture essay', '/essays/fixture-related/'],
      ['Fixture essay, how a frontier line was drawn', '/essays/fixture-frontier/'],
    ]);
  });

  it('lists the public layers and the places', () => {
    expect(used(SLUGS.iiif)!.querySelectorAll('.layers li').map((li) => li.text.trim())).toEqual(['Fixture road network']);
    expect(used(SLUGS.iiif)!.querySelectorAll('.places li').map((li) => li.text.trim())).toEqual(['Fixture Town', 'Fixture Valley', 'Fixtureland']);
  });

  it('hides a list that is empty, and the whole section when all are', () => {
    expect(used(SLUGS.workshop)!.querySelector('.essays')).toBeNull();
    expect(used(SLUGS.workshop)!.querySelector('.layers')).toBeNull();
    expect(used(SLUGS.workshop)!.querySelector('.places')).not.toBeNull();
  });

  it('names nothing held: no held essay, layer or place appears on any page', () => {
    for (const slug of Object.values(SLUGS)) {
      const html = readHtml(dir, `collection/${slug}/index.html`);
      for (const word of ['Zephyr', 'zephyr-held-moraine', 'A held fixture layer', 'A held fixture place', 'essay-000003']) expect(html, `${slug} ${word}`).not.toContain(word);
    }
  });
});
