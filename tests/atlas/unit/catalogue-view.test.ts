import { describe, expect, it } from 'vitest';
import { catalogueView } from '../../../src/atlas/catalogue-view.js';
import type { AtlasIndex, IndexLayer } from '../../../src/atlas/types.js';
import { activate, initialState, setLens, setYear, toggleRelevant } from '../../../src/atlas/view-state.js';

/*
 * Spec 005 T038 support (US2): what the catalogue lists under each lens, a search and the relevance
 * toggle. Discovery only reads the state; it never changes the active set.
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
  envelope: { from: '0100', to: '0300' },
  time_mode: 'envelope_only',
  description: '',
  ...over,
});

const INDEX: AtlasIndex = {
  layers: [
    layer('limes', 'Limes', { collections: ['dacia'], rooms: ['map', 'border'] }),
    layer('roads', 'Roads', { theme: 'networks-circulation', collections: ['dacia'], rooms: ['road'] }),
    layer('maps', 'Old maps', { theme: 'cartographic-evidence', envelope: { from: '1500', to: '1700' } }),
  ],
  collections: [
    { slug: 'dacia', title: 'Dacia', description: '', members: ['limes', 'roads'], default_layers: ['limes'] },
    { slug: 'empty', title: 'Empty', description: '', members: [], default_layers: [] },
  ],
};
const start = () => setYear(initialState(INDEX), 200);
const headings = (state = start(), query = '') => catalogueView(state, INDEX, query).groups.map((g) => g.heading);
const slugsOf = (state = start(), query = '') => catalogueView(state, INDEX, query).groups.map((g) => g.layers.map((l) => l.slug));

describe('the theme lens', () => {
  it('groups by the themes that have a layer, in the canonical order', () => {
    expect(headings()).toEqual(['Territories & Boundaries', 'Networks & Circulation', 'Cartographic Evidence']);
    expect(slugsOf()).toEqual([['limes'], ['roads'], ['maps']]);
  });
});

describe('the collection lens', () => {
  const state = () => setLens(start(), 'collection', undefined, INDEX);

  it('groups by collection, then the layers in none, and offers defaults only where there is one to activate', () => {
    const view = catalogueView(state(), INDEX, '');
    expect(view.groups.map((g) => g.heading)).toEqual(['Dacia', 'Empty', 'Not in a collection']);
    expect(view.groups.map((g) => g.canActivateDefaults)).toEqual([true, false, false]);
    expect(view.groups.map((g) => g.collection)).toEqual(['dacia', 'empty', undefined]);
    expect(slugsOf(state())).toEqual([['limes', 'roads'], [], ['maps']]);
  });

  it('shows only the chosen collection when one is the context', () => {
    expect(headings(setLens(start(), 'collection', 'dacia', INDEX))).toEqual(['Dacia']);
  });
});

describe('the room lens', () => {
  it('groups by the rooms that have a layer, in the canonical order, then the layers in no room', () => {
    const state = setLens(start(), 'room', undefined, INDEX);
    expect(headings(state)).toEqual(['Map', 'Border', 'Road', 'In no room']);
    expect(slugsOf(state)).toEqual([['limes'], ['limes'], ['roads'], ['maps']]);
  });
});

describe('search', () => {
  it('lists the ranked matches as one group, whatever the lens', () => {
    const view = catalogueView(setLens(start(), 'room', undefined, INDEX), INDEX, 'road');
    expect(view.mode).toBe('search');
    expect(view.groups.map((g) => g.heading)).toEqual(['Search results']);
    expect(view.groups[0]?.layers.map((l) => l.slug)).toEqual(['roads']);
    expect(view.count).toBe(1);
  });

  it('finds nothing without being an error', () => {
    const view = catalogueView(start(), INDEX, 'zzz');
    expect(view).toMatchObject({ mode: 'search', count: 0 });
    expect(view.groups.flatMap((g) => g.layers)).toEqual([]);
  });

  it('is browsing when the query is blank', () => {
    expect(catalogueView(start(), INDEX, '  ').mode).toBe('browse');
  });
});

describe('the relevance toggle', () => {
  it('narrows every lens and a search to layers whose envelope covers the year', () => {
    const narrowed = toggleRelevant(start());
    expect(slugsOf(narrowed)).toEqual([['limes'], ['roads']]);
    expect(catalogueView(narrowed, INDEX, 'maps').count).toBe(0);
    expect(catalogueView(start(), INDEX, 'maps').count).toBe(1);
  });
});

describe('discovery', () => {
  it('never changes the active set', () => {
    const state = activate(start(), 'maps', INDEX);
    catalogueView(setLens(state, 'room', undefined, INDEX), INDEX, 'road');
    expect(state.active).toEqual(['maps']);
  });

  it('counts the layers listed, once each in the theme lens', () => {
    expect(catalogueView(start(), INDEX, '').count).toBe(3);
  });
});

describe('discoverability over a 200-layer catalogue (SC-002)', () => {
  it('lists every public layer under its theme and finds it by its own title', async () => {
    const { projectPublic } = await import('../../../src/registry/project.js');
    const { generateAtlasRegistry, syntheticRooms } = await import('../../../src/registry/synthetic.js');
    const { buildIndex } = await import('../../../src/atlas/index-data.js');
    const big = buildIndex(projectPublic([...syntheticRooms(), ...generateAtlasRegistry(200, 3)]));
    const state = initialState(big);
    const listed = catalogueView(state, big, '').groups.flatMap((g) => g.layers.map((l) => l.slug));
    expect(new Set(listed).size).toBe(200);
    for (const layer of big.layers) {
      expect(catalogueView(state, big, layer.title).groups[0]?.layers.map((l) => l.slug), layer.title).toContain(layer.slug);
    }
  });
});
