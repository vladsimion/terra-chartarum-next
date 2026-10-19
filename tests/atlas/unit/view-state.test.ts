import { describe, expect, it } from 'vitest';
import type { AtlasIndex, AtlasState, IndexLayer } from '../../../src/atlas/types.js';
import {
  activate as activateIn,
  activateDefaults,
  activeLayers,
  canActivateDefaults,
  catalogue,
  deactivate,
  defaultYear,
  focus,
  initialState,
  setLens as setLensIn,
  setVisible as setVisibleIn,
  setYear,
  toggleRelevant,
} from '../../../src/atlas/view-state.js';

/*
 * Spec 005 T025 (FR-003, FR-004, US2): the typed state and its reducers. No DOM. Discovery
 * (lens, relevance) never changes what is active, and the year never removes a layer.
 */
const layer = (slug: string, from: string, to: string, over: Partial<IndexLayer> = {}): IndexLayer => ({
  slug,
  title: slug.toUpperCase(),
  role: 'historical',
  theme: 'territories-boundaries',
  provenance: 'georeferenced_trace',
  collections: [],
  rooms: [],
  tags: [],
  synonyms: [],
  envelope: { from, to },
  time_mode: 'envelope_only',
  description: '',
  ...over,
});

const INDEX: AtlasIndex = {
  layers: [layer('roads', '0106', '0271'), layer('limes', '0106', '0271'), layer('maps', '1500', '1700'), layer('now', '-0500', '2026', { role: 'context' })],
  collections: [
    { slug: 'dacia', title: 'Dacia', description: '', members: ['roads', 'limes', 'now'], default_layers: ['roads', 'now'] },
    { slug: 'empty', title: 'Empty', description: '', members: [], default_layers: [] },
  ],
};

const start = () => initialState(INDEX);
const activate = (state: AtlasState, slug: string) => activateIn(state, slug, INDEX);
const setLens = (state: AtlasState, lens: 'theme' | 'collection' | 'room', collection?: string) => setLensIn(state, lens, collection, INDEX);

describe('initialState', () => {
  it('starts with nothing active, the theme lens and the relevance toggle off', () => {
    expect(start()).toMatchObject({ active: [], lens: 'theme', relevantOnly: false, facets: {} });
    expect(start().focused).toBeUndefined();
    expect(start().collection).toBeUndefined();
  });
});

describe('defaultYear (research R2)', () => {
  it('is the midpoint of the first collection with defaults, over its default layers', () => {
    // roads 0106/0271 and now -0500/2026 combine to -500..2026
    expect(defaultYear(INDEX)).toBe(763);
  });

  it('falls back to the midpoint of every layer, then to 1000', () => {
    expect(defaultYear({ ...INDEX, collections: [] })).toBe(763);
    expect(defaultYear({ layers: [layer('a', '0100', '0200')], collections: [] })).toBe(150);
    expect(defaultYear({ layers: [], collections: [] })).toBe(1000);
  });
});

describe('activate and deactivate', () => {
  it('keep activation order and ignore a repeat', () => {
    let state = activate(start(), 'limes');
    state = activate(state, 'roads');
    state = activate(state, 'limes');
    expect(state.active).toEqual(['limes', 'roads']);
  });

  it('does not activate a slug the index does not list', () => {
    expect(activate(start(), 'ghost').active).toEqual([]);
  });

  it('removes a layer, its focus and its facets, and leaves the others in order', () => {
    let state = activate(activate(activate(start(), 'roads'), 'limes'), 'maps');
    state = focus(state, 'limes');
    state = { ...state, facets: { limes: { status: { kind: 'category', values: ['a'] } }, roads: { status: { kind: 'category', values: ['b'] } } } };
    state = deactivate(state, 'limes');
    expect(state.active).toEqual(['roads', 'maps']);
    expect(state.focused).toBeUndefined();
    expect(state.facets).toEqual({ roads: { status: { kind: 'category', values: ['b'] } } });
  });

  it('keeps the focus on another layer when a different one is removed', () => {
    const state = deactivate(focus(activate(activate(start(), 'roads'), 'limes'), 'roads'), 'limes');
    expect(state.focused).toBe('roads');
  });
});

describe('focus', () => {
  it('only focuses an active layer', () => {
    expect(focus(start(), 'roads').focused).toBeUndefined();
    expect(focus(activate(start(), 'roads'), 'roads').focused).toBe('roads');
  });
});

describe('the year (FR-004)', () => {
  it('never deactivates a layer, and marks an active layer outside its envelope out of range', () => {
    let state = activate(activate(start(), 'roads'), 'maps');
    state = setYear(state, 1400);
    expect(state.active).toEqual(['roads', 'maps']);
    expect(activeLayers(state, INDEX).map((l) => [l.slug, l.range])).toEqual([
      ['roads', 'out_of_range'],
      ['maps', 'out_of_range'],
    ]);
    state = setYear(state, 150);
    expect(activeLayers(state, INDEX).map((l) => [l.slug, l.range])).toEqual([
      ['roads', 'in_range'],
      ['maps', 'out_of_range'],
    ]);
  });

  it('works with a BCE year', () => {
    const state = setYear(activate(start(), 'now'), -106);
    expect(activeLayers(state, INDEX)[0]?.range).toBe('in_range');
  });
});

describe('the lens', () => {
  it('leaves the active set, the focus and the year unchanged', () => {
    let state = focus(activate(activate(setYear(start(), 1400), 'roads'), 'limes'), 'limes');
    const before = { active: state.active, focused: state.focused, year: state.year };
    for (const lens of ['collection', 'room', 'theme'] as const) {
      state = setLens(state, lens);
      expect({ active: state.active, focused: state.focused, year: state.year }).toEqual(before);
      expect(state.lens).toBe(lens);
    }
  });

  it('keeps the collection context for the collection lens and drops it otherwise', () => {
    expect(setLens(start(), 'collection', 'dacia')).toMatchObject({ lens: 'collection', collection: 'dacia' });
    expect(setLens(setLens(start(), 'collection', 'dacia'), 'theme').collection).toBeUndefined();
    expect(setLens(start(), 'collection', 'ghost').collection).toBeUndefined();
  });
});

describe('activateDefaults (US2.1)', () => {
  it("adds the collection's default layers, in order, and no synthetic layer", () => {
    const state = activateDefaults(start(), 'dacia', INDEX);
    expect(state.active).toEqual(['roads', 'now']);
    expect(state.active.every((slug) => INDEX.layers.some((l) => l.slug === slug))).toBe(true);
  });

  it('keeps layers already active where they are and adds only the rest', () => {
    const state = activateDefaults(activate(start(), 'now'), 'dacia', INDEX);
    expect(state.active).toEqual(['now', 'roads']);
  });

  it('does nothing for a collection with no default, or one the index does not list', () => {
    expect(activateDefaults(start(), 'empty', INDEX).active).toEqual([]);
    expect(activateDefaults(start(), 'ghost', INDEX).active).toEqual([]);
  });

  it('offers the action only for a collection with a runnable public default', () => {
    expect(canActivateDefaults('dacia', INDEX)).toBe(true);
    expect(canActivateDefaults('empty', INDEX)).toBe(false);
    expect(canActivateDefaults('ghost', INDEX)).toBe(false);
  });
});

describe('the relevance toggle (US2.2)', () => {
  it('narrows the catalogue to layers whose envelope covers the year, and leaves the active set alone', () => {
    let state = activate(activate(setYear(start(), 150), 'maps'), 'roads');
    expect(catalogue(state, INDEX).map((l) => l.slug)).toEqual(['roads', 'limes', 'maps', 'now']);
    state = toggleRelevant(state);
    expect(state.relevantOnly).toBe(true);
    expect(catalogue(state, INDEX).map((l) => l.slug)).toEqual(['roads', 'limes', 'now']);
    expect(state.active).toEqual(['maps', 'roads']);
    expect(activeLayers(state, INDEX).find((l) => l.slug === 'maps')?.range).toBe('out_of_range');
  });

  it('toggles back', () => {
    expect(toggleRelevant(toggleRelevant(start())).relevantOnly).toBe(false);
  });
});

describe('immutability', () => {
  it('returns a new state and leaves the old one as it was', () => {
    const before = start();
    const after = activate(before, 'roads');
    expect(before.active).toEqual([]);
    expect(after).not.toBe(before);
  });
});

describe('setVisible (the contract’s visibility toggle)', () => {
  const setVisible = (state: AtlasState, slug: string, visible: boolean) => setVisibleIn(state, slug, visible);

  it('hides an active layer without deactivating it, and shows it again', () => {
    let state = activate(activate(start(), 'roads'), 'limes');
    state = setVisible(state, 'roads', false);
    expect(state.active).toEqual(['roads', 'limes']);
    expect(state.hidden).toEqual(['roads']);
    state = setVisible(state, 'roads', true);
    expect(state.hidden).toBeUndefined();
  });

  it('keeps the layer’s facets and focus while it is hidden', () => {
    let state = focus(activate(start(), 'roads'), 'roads');
    state = { ...state, facets: { roads: { status: { kind: 'category', values: ['a'] } } } };
    state = setVisible(state, 'roads', false);
    expect(state.focused).toBe('roads');
    expect(state.facets.roads).toBeDefined();
  });

  it('ignores a layer that is not active, and a repeat', () => {
    const state = activate(start(), 'roads');
    expect(setVisible(state, 'limes', false)).toBe(state);
    const hidden = setVisible(state, 'roads', false);
    expect(setVisible(hidden, 'roads', false)).toBe(hidden);
    expect(setVisible(state, 'roads', true)).toBe(state);
  });

  it('keeps hidden layers in activation order', () => {
    let state = activate(activate(activate(start(), 'roads'), 'limes'), 'maps');
    state = setVisible(setVisible(state, 'maps', false), 'roads', false);
    expect(state.hidden).toEqual(['roads', 'maps']);
  });

  it('forgets a layer that is removed, so adding it again shows it', () => {
    let state = setVisible(activate(start(), 'roads'), 'roads', false);
    state = activate(deactivate(state, 'roads'), 'roads');
    expect(state.hidden).toBeUndefined();
  });

  it('marks the layer in the active list', () => {
    const state = setVisible(activate(activate(start(), 'roads'), 'limes'), 'roads', false);
    expect(activeLayers(state, INDEX).map((a) => [a.slug, a.hidden])).toEqual([['roads', true], ['limes', false]]);
  });
});
