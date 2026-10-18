import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { collectionSite, readHtml, readPage } from '../support/build.js';

/*
 * Spec 004 T042 (US3, FR-011, FR-012, contracts/collection-pages.md "Cartographer pages"): the list
 * shows released cartographers only; a profile shows names, roles, dates, the biography, the public
 * maps attributed with certainty and the public essays that use them; a workshop lists its unresolved
 * maps apart; a held cartographer has no page and is not linked.
 */
let dir = '';
beforeAll(() => {
  dir = collectionSite();
});
const list = () => readPage(dir, 'cartographers/index.html');
const profile = (slug: string) => readPage(dir, `cartographers/${slug}/index.html`);
const PERSON = 'fixture-cartographer';
const WORKSHOP = 'fixture-workshop';
const NO_MAPS = 'fixture-cartographer-without-maps';

describe('the list', () => {
  it('shows released cartographers by name, each linked, and not the held one', () => {
    const links = list().querySelectorAll('ol.cartographers a.name').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['A fixture cartographer', '/cartographers/fixture-cartographer/'],
      ['A fixture cartographer without maps', '/cartographers/fixture-cartographer-without-maps/'],
      ['A fixture workshop', '/cartographers/fixture-workshop/'],
    ]);
    expect(readHtml(dir, 'cartographers/index.html')).not.toContain('A held fixture cartographer');
  });

  it('says what each has in the collection', () => {
    const lines = list().querySelectorAll('ol.cartographers li').map((li) => li.querySelector('.count')?.text.trim());
    expect(lines).toEqual(['4 maps', 'No public maps yet', '1 map attributed to the workshop']);
  });

  it('names kind and roles', () => {
    const first = list().querySelector('ol.cartographers li')!;
    expect(first.querySelector('.kind')?.text.trim()).toBe('Person · Cartographer');
  });
});

describe('a person’s profile', () => {
  const p = () => profile(PERSON);

  it('shows the name, variant names, roles and dates', () => {
    expect(p().querySelector('main h1')?.text.trim()).toBe('A fixture cartographer');
    expect(p().querySelector('.names')?.text).toContain('Fixture Cartographer');
    expect(p().querySelector('.roles')?.text.trim()).toBe('Cartographer');
    expect(p().querySelector('.dates')?.text.trim()).toBe('1527-1598');
  });

  it('shows the biography from the record’s own prose file', () => {
    expect(p().querySelector('.biography')?.text).toContain('surveyed the valley');
  });

  it('lists the public maps attributed with certainty, linked, in title order', () => {
    const maps = p().querySelectorAll('section.maps a').map((a) => [a.text.trim(), a.getAttribute('href')]);
    expect(maps).toEqual([
      ['A fixture map of the frontier', '/collection/fixture-map-frontier/'],
      ['A fixture map with a withheld image', '/collection/fixture-map-withheld/'],
      ['A fixture map with an unknown date', '/collection/fixture-map-undated/'],
      ['A second fixture map, a road sheet', '/collection/fixture-map-road/'],
    ]);
  });

  it('lists the public essays that use those maps and not the held one', () => {
    const essays = p().querySelectorAll('section.essays a').map((a) => a.getAttribute('href'));
    expect(essays).toEqual(['/essays/fixture-related/', '/essays/fixture-frontier/']);
  });

  it('lists the cartographer’s bibliography', () => {
    expect(p().querySelector('section.bibliography li')?.text.length).toBeGreaterThan(10);
  });

  it('has no unresolved section', () => {
    expect(p().querySelector('section.unresolved')).toBeNull();
  });
});

describe('a workshop’s profile', () => {
  const p = () => profile(WORKSHOP);

  it('shows its activity, not life dates', () => {
    expect(p().querySelector('.dates')?.text.trim()).toBe('Active 1600–1650');
    expect(p().querySelector('.roles')?.text.trim()).toBe('Publisher');
  });

  it('lists the maps attributed to the workshop apart, and says the makers are not individually established', () => {
    const section = p().querySelector('section.unresolved')!;
    expect(section.querySelectorAll('a').map((a) => a.getAttribute('href'))).toEqual(['/collection/fixture-map-workshop/']);
    expect(section.text).toContain('not individually established');
  });

  it('does not list an unresolved map as the work of the workshop in the exact list', () => {
    expect(p().querySelector('section.maps')).toBeNull();
  });
});

describe('a person with no public map', () => {
  it('says so', () => {
    const p = profile(NO_MAPS);
    expect(p.querySelector('section.maps')?.text).toContain('No maps by this cartographer are in the collection yet.');
    expect(p.querySelector('section.essays')).toBeNull();
  });
});

describe('the held cartographer (FR-012)', () => {
  it('has no page', () => {
    expect(existsSync(path.join(dir, 'cartographers', 'held-fixture-cartographer'))).toBe(false);
    expect(readdirSync(path.join(dir, 'cartographers')).sort()).toEqual([NO_MAPS, PERSON, WORKSHOP, 'index.html'].sort());
  });

  it('is not linked from any map page, and its biography is nowhere', () => {
    for (const slug of ['fixture-map-frontier', 'fixture-map-road', 'fixture-map-workshop', 'fixture-map-withheld', 'fixture-map-undated']) {
      const html = readHtml(dir, `collection/${slug}/index.html`);
      expect(html, slug).not.toContain('held-fixture-cartographer');
    }
    expect(readHtml(dir, 'cartographers/index.html')).not.toContain('HELD-BIOGRAPHY-MARKER');
  });
});

describe('maker links on record pages', () => {
  it('reach a profile that exists', () => {
    for (const slug of ['fixture-map-frontier', 'fixture-map-workshop']) {
      for (const a of readPage(dir, `collection/${slug}/index.html`).querySelectorAll('section.attribution a')) {
        const href = a.getAttribute('href')!;
        expect(existsSync(path.join(dir, href, 'index.html')), href).toBe(true);
      }
    }
  });
});
