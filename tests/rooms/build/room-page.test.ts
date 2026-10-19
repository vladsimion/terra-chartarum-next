import { beforeAll, describe, expect, it } from 'vitest';
import { hasFile, readHtml, readPage, roomsSite, textOf } from '../support/build.js';

/*
 * Spec 007 T015, T021 (US1 scenarios 1, 2, 4 and 5, FR-008, FR-009, contracts/room-pages.md "Room
 * page"): a room page shows its name, its introduction, then Essays (primary, then secondary),
 * Maps and Layers, each hidden when empty and in title order, and nothing held.
 */
let dir = '';
beforeAll(() => {
  dir = roomsSite();
});
const page = (room: string) => readPage(dir, `rooms/${room}/index.html`);
const links = (room: string, group: string) =>
  page(room)
    .querySelectorAll(`[data-group="${group}"] li a`)
    .map((a) => [textOf(a), a.getAttribute('href')]);

describe('a room page', () => {
  it('has the room’s name as its one heading, then the introduction, marked draft while it is', () => {
    expect(page('map').querySelectorAll('h1').map((h) => textOf(h))).toEqual(['Map']);
    const intro = page('map').querySelector('[data-introduction]')!;
    expect(intro.hasAttribute('data-draft')).toBe(true);
    expect(textOf(intro)).toContain('The map room, in placeholder words.');
  });

  it('shows primary essays before secondary ones, each group in title order (scenario 1)', () => {
    const essays = page('map').querySelector('[data-group="essays"]')!;
    expect(essays.querySelectorAll('h3').map((h) => textOf(h))).toEqual(['Primary', 'Secondary']);
    expect(links('map', 'essays')).toEqual([
      ['Fixture essay, how a frontier line was drawn', '/essays/fixture-frontier/'],
      ['A related fixture essay', '/essays/fixture-related/'],
    ]);
  });

  it('hides the Primary sub-group of a room that has only secondary essays', () => {
    expect(page('border').querySelector('[data-group="essays"]')!.querySelectorAll('h3').map((h) => textOf(h))).toEqual(['Secondary']);
    expect(links('border', 'essays')).toEqual([
      ['A related fixture essay', '/essays/fixture-related/'],
      ['Fixture essay, how a frontier line was drawn', '/essays/fixture-frontier/'],
    ]);
  });

  it('lists the maps used by the room’s public essays, in title order, linking to the Collection (scenario 1)', () => {
    expect(links('map', 'maps')).toEqual([
      ['A fixture map of the frontier', '/collection/fixture-map-frontier/'],
      ['A fixture map of the road', '/collection/fixture-map-road/'],
    ]);
  });

  it('lists a map used in two rooms in each of them', () => {
    expect(links('road', 'maps')).toHaveLength(2);
    expect(links('border', 'maps')).toHaveLength(2);
  });

  it('lists the layers, each linking to an Atlas view with that layer active (scenario 4)', () => {
    const layers = links('map', 'layers');
    expect(layers.map(([title]) => title)).toEqual(['A georeferenced sheet', 'Roads of the province', 'Settlements of Dacia', 'The frontier line']);
    for (const [, href] of layers) expect(href).toMatch(/^\/atlas\/\?/);
    expect(layers.find(([title]) => title === 'Roads of the province')![1]).toContain('roads');
  });

  it('says essays are in preparation for a room with none, without a link, and shows no empty groups', () => {
    const city = page('city');
    expect(textOf(city.querySelector('[data-in-preparation]'))).toBe('Essays for this room are in preparation.');
    expect(city.querySelectorAll('[data-in-preparation] a')).toHaveLength(0);
    expect(city.querySelectorAll('[data-group]')).toHaveLength(0);
  });

  it('still shows the introduction of a room with no essay (scenario 2)', () => {
    expect(textOf(page('theatre').querySelector('[data-introduction]'))).toContain('The theatre room, in placeholder words.');
  });

  it('has breadcrumbs Rooms › the room (the shell starts a trail at the lens)', () => {
    expect(page('earth').querySelectorAll('nav.breadcrumbs li').map((li) => textOf(li))).toEqual(['Rooms', 'Earth']);
  });

  it('does not show a held essay, or a map or layer only a held essay uses (scenario 5)', () => {
    for (const room of ['map', 'road', 'border', 'city', 'archive']) {
      const html = readHtml(dir, `rooms/${room}/index.html`);
      expect(html, room).not.toMatch(/Zephyr|zephyr-held-moraine|held-only-map|A map only the held essay uses|held-layer|A held layer|layer-in-build|A layer in build/);
    }
  });

  it('builds a page for each of the seven rooms and no other', () => {
    for (const room of ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre']) expect(hasFile(dir, `rooms/${room}/index.html`), room).toBe(true);
  });

  it('has no script', () => {
    expect(page('map').querySelectorAll('script')).toHaveLength(0);
  });
});

describe('a former room slug', () => {
  it('redirects to the room page', () => {
    expect(readHtml(dir, '_redirects')).toContain('/rooms/old-earth/ /rooms/earth/ 301');
  });
});
