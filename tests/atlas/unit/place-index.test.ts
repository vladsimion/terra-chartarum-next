import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPlaceIndex, searchPlaces, type PlaceIndex } from '../../../src/atlas/place-index.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { projectPublic } from '../../../src/registry/project.js';

/*
 * Spec 005 T048 (US7, FR-009, research R5): the place index and the search over it. Exact and
 * prefix match on the normalised form of every historic and modern name; an exact match first; a
 * name valid at the chosen year before one that is not; held places absent.
 */
const fixture = fileURLToPath(new URL('../fixtures/registry', import.meta.url));
const fixtureIndex = async () => buildPlaceIndex(projectPublic((await loadRegistry(fixture)).records));

const name = (n: string, kind: 'historic' | 'modern', over: Record<string, unknown> = {}) => ({ name: n, kind, language: 'la', ...over });
const place = (slug: string, title: string, names: ReturnType<typeof name>[]) => ({ id: `tc:tc:place:${slug}`, family: 'place', slug, title, location: { lon: 23, lat: 46 }, names });
const index = (...places: ReturnType<typeof place>[]): PlaceIndex => buildPlaceIndex(places as never);

describe('buildPlaceIndex over the fixture registry', () => {
  it('lists the public places by title and no held one', async () => {
    const { places } = await fixtureIndex();
    expect(places.map((p) => p.slug)).toEqual(['apulum', 'napoca']);
    expect(JSON.stringify(places)).not.toMatch(/Hiddenum|held-place/);
  });

  it('carries the contract fields and nothing else, with no id', async () => {
    const [first] = (await fixtureIndex()).places;
    expect(Object.keys(first ?? {}).sort()).toEqual(['location', 'names', 'slug', 'title']);
    expect(Object.keys(first?.names[0] ?? {}).sort()).toEqual(['kind', 'language', 'name', 'norm', 'valid_from', 'valid_to']);
    expect(JSON.stringify(await fixtureIndex())).not.toContain('tc:tc:place');
  });

  it('keeps every name, historic and modern, with the normalised form and the validity as authored', async () => {
    const apulum = (await fixtureIndex()).places.find((p) => p.slug === 'apulum')!;
    expect(apulum.location).toEqual({ lon: 23.57, lat: 46.07 });
    expect(apulum.names).toEqual([
      { name: 'Apulum', norm: 'apulum', kind: 'historic', language: 'la', valid_from: '0106', valid_to: '0271' },
      { name: 'Alba Iulia', norm: 'alba iulia', kind: 'modern', language: 'ro' },
    ]);
  });

  it('leaves out a place with no location, which the map could not mark', () => {
    const none = { ...place('x', 'X', [name('X', 'modern')]), location: undefined };
    expect(buildPlaceIndex([none] as never).places).toEqual([]);
  });
});

describe('searchPlaces', () => {
  const found = (idx: PlaceIndex, query: string, year = 150) => searchPlaces(idx, query, year).map((r) => [r.slug, r.name]);

  it('ignores case, diacritics and extra space', () => {
    const idx = index(place('sarmizegetusa', 'Sarmizegetusa', [name('Sarmizegetusa', 'historic'), name('Sărmizegetusa', 'modern', { language: 'ro' })]));
    expect(found(idx, '  SARMI  ')).toEqual([['sarmizegetusa', 'Sarmizegetusa']]);
    expect(found(idx, 'sarmizegetusa')).toHaveLength(1);
  });

  it('offers the place by a prefix of either a historic or a modern name, naming the name that matched', () => {
    const idx = index(place('apulum', 'Apulum', [name('Apulum', 'historic'), name('Alba Iulia', 'modern', { language: 'ro' })]));
    expect(found(idx, 'apu')).toEqual([['apulum', 'Apulum']]);
    expect(found(idx, 'alba')).toEqual([['apulum', 'Alba Iulia']]);
  });

  it('lists a place once, by its best name', () => {
    const idx = index(place('p', 'P', [name('Alba', 'historic'), name('Alba Iulia', 'modern')]));
    expect(found(idx, 'alba')).toEqual([['p', 'Alba']]);
  });

  it('puts an exact match before a prefix match', () => {
    const idx = index(place('a', 'Alba Iulia', [name('Alba Iulia', 'modern')]), place('b', 'Alba', [name('Alba', 'modern')]));
    expect(found(idx, 'alba').map(([slug]) => slug)).toEqual(['b', 'a']);
  });

  it('puts a name valid at the chosen year before one that is not, then orders by title', () => {
    const idx = index(
      place('later', 'Zeta', [name('Colonia', 'historic', { valid_from: '0300', valid_to: '0400' })]),
      place('now', 'Omega', [name('Colonia', 'historic', { valid_from: '0100', valid_to: '0200' })]),
      place('undated', 'Alpha', [name('Colonia', 'historic')]),
    );
    expect(found(idx, 'colonia', 150).map(([slug]) => slug)).toEqual(['now', 'undated', 'later']);
    expect(found(idx, 'colonia', 350).map(([slug]) => slug)).toEqual(['later', 'undated', 'now']);
  });

  it('reads a BCE year in a validity', () => {
    const idx = index(place('a', 'A', [name('Old', 'historic', { valid_from: '-0200', valid_to: '-0100' })]), place('b', 'B', [name('Old', 'historic')]));
    expect(found(idx, 'old', -150).map(([slug]) => slug)).toEqual(['a', 'b']);
    expect(found(idx, 'old', 50).map(([slug]) => slug)).toEqual(['b', 'a']);
  });

  it('finds nothing for a blank query or a query that matches no name', () => {
    const idx = index(place('a', 'A', [name('Apulum', 'historic')]));
    expect(found(idx, '   ')).toEqual([]);
    expect(found(idx, 'zzz')).toEqual([]);
  });

  it('does not match inside a name, only at its start (exact and prefix, FR-009)', () => {
    const idx = index(place('a', 'A', [name('Alba Iulia', 'modern')]));
    expect(found(idx, 'iulia')).toEqual([]);
  });
});
