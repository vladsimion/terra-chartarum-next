import { describe, expect, it } from 'vitest';
import { normalise, rank } from '../../../src/atlas/rank.js';
import type { AtlasIndex, IndexLayer } from '../../../src/atlas/types.js';

/*
 * Spec 005 T036 (US2.3, FR-021): the catalogue search. Exact title, then title prefix, then tag or
 * synonym, then collection, theme or room, then description; ties by title; case and diacritics
 * ignored. A word at the start of a title counts as a prefix, so "frontier" finds "The frontier line".
 */
const layer = (slug: string, title: string, over: Partial<IndexLayer> = {}): IndexLayer => ({
  slug,
  title,
  role: 'historical',
  theme: 'territories-boundaries',
  provenance: 'source_geometry',
  collections: [],
  rooms: [],
  tags: [],
  synonyms: [],
  envelope: { from: '0100', to: '0200' },
  time_mode: 'envelope_only',
  description: '',
  ...over,
});

const INDEX: AtlasIndex = {
  layers: [
    layer('a', 'Roads'),
    layer('b', 'Roads of the province'),
    layer('c', 'Roman roads', { tags: ['cursus'] }),
    layer('d', 'Milestones', { synonyms: ['roads'] }),
    layer('e', 'Forts', { collections: ['dacia'] }),
    layer('f', 'Rivers', { rooms: ['road'], theme: 'networks-circulation' }),
    layer('g', 'Mines', { description: 'Mines served the roads of the province.' }),
    layer('h', 'Épée Sites', { tags: ['Zoë'] }),
  ],
  collections: [{ slug: 'dacia', title: 'Roads to Dacia', description: '', members: ['e'], default_layers: [] }],
};
const slugs = (query: string) => rank(INDEX, query).map((l) => l.slug);

describe('normalise', () => {
  it('lower-cases, folds diacritics and collapses space', () => {
    expect(normalise('  Épée   ZOË ')).toBe('epee zoe');
    expect(normalise('Șapte Țări')).toBe('sapte tari');
  });
});

describe('rank', () => {
  it('orders exact title, title prefix, tag or synonym, collection theme or room, then description', () => {
    // Roads (exact); Roads of the province and Roman roads (a title word); Milestones (synonym); Forts (collection "Roads to Dacia"); Mines (description)
    expect(slugs('roads')).toEqual(['a', 'b', 'c', 'd', 'e', 'g']);
  });

  it('puts an exact title before a longer title that starts with it', () => {
    expect(slugs('roads').slice(0, 2)).toEqual(['a', 'b']);
  });

  it('counts any word of a title that starts with the query as a title prefix', () => {
    expect(slugs('roman')).toEqual(['c']);
    expect(slugs('provinc')).toEqual(['b', 'g']);
    expect(slugs('road').slice(0, 3)).toEqual(['a', 'b', 'c']);
  });

  it('matches a tag or synonym by equality or prefix', () => {
    expect(slugs('curs')).toEqual(['c']);
    expect(slugs('cursus')).toEqual(['c']);
  });

  it('matches a layer through its collection title, its theme label or its room name', () => {
    expect(slugs('dacia')).toEqual(['e']);
    expect(slugs('circulation')).toEqual(['f']);
    // every layer of that theme, tied, so by title
    expect(slugs('territories')).toEqual(['h', 'e', 'd', 'g', 'a', 'b', 'c']);
  });

  it('breaks a tie by title, whatever the order of the index', () => {
    const reversed: AtlasIndex = { ...INDEX, layers: [...INDEX.layers].reverse() };
    expect(rank(reversed, 'roads').map((l) => l.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'g']);
  });

  it('ignores case and diacritics in the query and in the index', () => {
    expect(slugs('EPEE')).toEqual(['h']);
    expect(slugs('épée')).toEqual(['h']);
    expect(slugs('zoe')).toEqual(['h']);
    expect(slugs('ZOË')).toEqual(['h']);
  });

  it('returns an empty list for a query that matches nothing', () => {
    expect(slugs('zzz')).toEqual([]);
  });

  it('returns every layer, by title, for a blank query', () => {
    expect(slugs('   ')).toEqual(['h', 'e', 'd', 'g', 'f', 'a', 'b', 'c']);
    expect(slugs('')).toEqual(slugs('  '));
  });

  it('lists a layer once, at its best tier', () => {
    const found = slugs('roads');
    expect(new Set(found).size).toBe(found.length);
  });
});
