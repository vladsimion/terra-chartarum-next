import { describe, expect, it } from 'vitest';
import type { AtlasIndex, AtlasState, FacetSelection, IndexLayer } from '../../../src/atlas/types.js';
import { resolveFacets, parseView, serialiseView, viewUrl, type SlugTable } from '../../../src/atlas/view-url.js';
import { defaultYear, initialState } from '../../../src/atlas/view-state.js';

/*
 * Spec 005 T044 (US4, FR-012, contracts/view-address.md, SC-003): the view address. One module
 * reads and writes it; defaults are left out; the same state is always the same address; retired
 * slugs resolve through history; anything that does not resolve is skipped and reported without
 * saying whether it was held or never existed.
 */
const layer = (slug: string, from: string, to: string): IndexLayer => ({
  slug,
  title: slug,
  role: 'historical',
  theme: 'territories-boundaries',
  provenance: 'source_geometry',
  collections: [],
  rooms: [],
  tags: [],
  synonyms: [],
  envelope: { from, to },
  time_mode: 'envelope_only',
  description: '',
});

const INDEX: AtlasIndex = {
  layers: [layer('frontier-line', '0106', '0271'), layer('roads', '0106', '0271'), layer('settlements', '0090', '0271'), layer('old-maps', '1500', '1700')],
  collections: [
    { slug: 'dacia', title: 'Dacia', description: '', members: ['frontier-line', 'roads'], default_layers: ['frontier-line'] },
    { slug: 'empty', title: 'Empty', description: '', members: [], default_layers: [] },
  ],
};
const SLUGS: SlugTable = {
  layers: [
    { slug: 'frontier-line', history: [] },
    { slug: 'roads', history: ['via-traiana'] },
    { slug: 'settlements', history: ['old-settlements'] },
    { slug: 'old-maps', history: [] },
  ],
  collections: [
    { slug: 'dacia', history: ['roman-dacia'] },
    { slug: 'empty', history: [] },
  ],
};
const DEFAULT_YEAR = defaultYear(INDEX);
const parse = (search: string) => parseView(search, INDEX, SLUGS);
const base = (): AtlasState => initialState(INDEX);
const cat = (...values: string[]): FacetSelection => ({ kind: 'category', values });

describe('serialiseView', () => {
  it('writes nothing for the opening state', () => {
    expect(serialiseView(base(), INDEX)).toBe('');
  });

  it('writes the parameters in the contract order, and leaves each default out', () => {
    const state: AtlasState = { ...base(), year: 150, lens: 'collection', collection: 'dacia', active: ['roads', 'frontier-line'], focused: 'roads', relevantOnly: true };
    expect(serialiseView(state, INDEX)).toBe('y=150&l=roads,frontier-line&f=roads&lens=collection&c=dacia&rel=1');
    expect(serialiseView({ ...base(), year: DEFAULT_YEAR, lens: 'theme' }, INDEX)).toBe('');
  });

  it('writes a negative year as it is', () => {
    expect(serialiseView({ ...base(), year: -106 }, INDEX)).toBe('y=-106');
  });

  it('writes a category and a range facet, properties in a fixed order, values encoded', () => {
    const state: AtlasState = {
      ...base(),
      active: ['frontier-line'],
      facets: { 'frontier-line': { width_m: { kind: 'range', min: 8, max: 20 }, status: cat('proposed', 'at|ested', 'a;b:c', '1..2') } },
    };
    expect(serialiseView(state, INDEX)).toBe('l=frontier-line&facet.frontier-line=status:proposed%7Cat%257Cested%7Ca%253Bb%253Ac%7C1%252E%252E2;width_m:8..20');
  });

  it('writes an open side of a range as an empty bound', () => {
    const state: AtlasState = { ...base(), active: ['roads'], facets: { roads: { w: { kind: 'range', min: 5, max: Number.POSITIVE_INFINITY } } } };
    expect(serialiseView(state, INDEX)).toBe('l=roads&facet.roads=w:5..');
  });

  it('does not write the collection context without the collection lens, or a focus that is not active', () => {
    expect(serialiseView({ ...base(), collection: 'dacia' }, INDEX)).toBe('');
    expect(serialiseView({ ...base(), focused: 'roads' }, INDEX)).toBe('');
  });
});

describe('viewUrl', () => {
  it('puts the address on /atlas/, and /atlas/ alone for the opening state', () => {
    expect(viewUrl(base(), INDEX)).toBe('/atlas/');
    expect(viewUrl({ ...base(), active: ['roads'] }, INDEX)).toBe('/atlas/?l=roads');
  });
});

describe('parseView', () => {
  it('reads the contract grammar', () => {
    const { state, report } = parse('?y=-106&l=roads,frontier-line&f=roads&lens=collection&c=dacia&rel=1');
    expect(state).toMatchObject({ year: -106, active: ['roads', 'frontier-line'], focused: 'roads', lens: 'collection', collection: 'dacia', relevantOnly: true });
    expect(report).toEqual({ renamed: [], skipped: [], dropped: [] });
  });

  it('gives the opening state for an empty address', () => {
    expect(parse('').state).toEqual(base());
    expect(parse('?').state).toEqual(base());
  });

  it('resolves a retired layer slug through history and reports it as renamed', () => {
    const { state, report } = parse('?l=via-traiana,settlements&f=old-settlements');
    expect(state.active).toEqual(['roads', 'settlements']);
    expect(report.renamed).toEqual([{ from: 'via-traiana', to: 'roads' }, { from: 'old-settlements', to: 'settlements' }]);
    expect(state.focused).toBe('settlements');
  });

  it('resolves a retired collection slug', () => {
    const { state, report } = parse('?lens=collection&c=roman-dacia');
    expect(state.collection).toBe('dacia');
    expect(report.renamed).toEqual([{ from: 'roman-dacia', to: 'dacia' }]);
  });

  it('skips a slug that resolves to nothing, keeps the rest, and says only that it is not in the Atlas', () => {
    const { state, report } = parse('?l=roads,held-secret,frontier-line');
    expect(state.active).toEqual(['roads', 'frontier-line']);
    expect(report.skipped).toEqual(['held-secret']);
    expect(JSON.stringify(report)).not.toMatch(/held (layer|entity)|exists|private/i);
  });

  it('lists a repeated layer once, at its first place', () => {
    expect(parse('?l=roads,frontier-line,roads').state.active).toEqual(['roads', 'frontier-line']);
  });

  it('drops a focused layer that is not active, and reports it', () => {
    const { state, report } = parse('?l=roads&f=frontier-line');
    expect(state.focused).toBeUndefined();
    expect(report.dropped).toHaveLength(1);
  });

  it('falls back to the opening year for a year it cannot read, and reports it', () => {
    for (const bad of ['abc', '12.5', '1e3', '']) {
      const { state, report } = parse(`?y=${bad}`);
      expect(state.year, bad).toBe(DEFAULT_YEAR);
      expect(report.dropped.length, bad).toBe(1);
    }
  });

  it('falls back to the theme lens for a lens it does not know, and ignores a collection without the collection lens', () => {
    expect(parse('?lens=galaxy').state.lens).toBe('theme');
    expect(parse('?lens=galaxy').report.dropped).toHaveLength(1);
    expect(parse('?c=dacia').state.collection).toBeUndefined();
  });

  it('skips a collection that resolves to nothing', () => {
    const { state, report } = parse('?lens=collection&c=nope');
    expect(state.collection).toBeUndefined();
    expect(report.skipped).toEqual(['nope']);
  });

  it('reads facets structurally and keeps only those of active layers', () => {
    const { state, report } = parse('?l=frontier-line&facet.frontier-line=status:attested%7Cproposed;width_m:8..20&facet.roads=w:1..2');
    expect(state.facets).toEqual({ 'frontier-line': { status: cat('attested', 'proposed'), width_m: { kind: 'range', min: 8, max: 20 } } });
    expect(report.dropped).toHaveLength(1);
  });

  it('reads an open range, a retired layer slug in a facet key, and an encoded value', () => {
    const { state } = parse('?l=roads&facet.via-traiana=w:5..;s:a%257Cb');
    expect(state.facets).toEqual({ roads: { w: { kind: 'range', min: 5, max: Number.POSITIVE_INFINITY }, s: cat('a|b') } });
  });

  it('drops a facet it cannot read', () => {
    const { state, report } = parse('?l=roads&facet.roads=nonsense;w:x..y');
    expect(state.facets).toEqual({});
    expect(report.dropped).toHaveLength(2);
  });

  it('ignores a parameter it does not know', () => {
    expect(parse('?utm_source=x&l=roads').state.active).toEqual(['roads']);
  });
});

describe('hidden layers (the visibility toggle)', () => {
  it('writes them after the active layers, and reads them back', () => {
    const state: AtlasState = { ...base(), active: ['roads', 'frontier-line'], hidden: ['frontier-line'] };
    const written = serialiseView(state, INDEX);
    expect(written).toBe('l=roads,frontier-line&hide=frontier-line');
    expect(parse(`?${written}`).state.hidden).toEqual(['frontier-line']);
  });

  it('writes nothing when none is hidden', () => {
    expect(serialiseView({ ...base(), active: ['roads'] }, INDEX)).toBe('l=roads');
  });

  it('drops a hidden layer that is not on the map and says so, without saying whether it exists', () => {
    const { state, report } = parse('?l=roads&hide=frontier-line,ghost');
    expect(state.hidden).toBeUndefined();
    expect(report.dropped).toHaveLength(1);
    expect(report.skipped).toEqual(['ghost']);
    expect(JSON.stringify(report)).not.toMatch(/held|exist/i);
  });

  it('follows a retired slug', () => {
    const { state, report } = parseView('?l=old-settlements&hide=old-settlements', INDEX, SLUGS);
    expect(state.hidden).toEqual(state.active);
    expect(report.renamed.length).toBe(2);
  });
});

describe('the round trip (SC-003)', () => {
  const years = [-500, -106, 0, 150, 1400, DEFAULT_YEAR];
  const lenses = ['theme', 'collection', 'room'] as const;
  const subsets = [[], ['roads'], ['frontier-line', 'roads'], ['old-maps', 'settlements', 'frontier-line'], ['roads', 'frontier-line', 'settlements', 'old-maps']];

  function* states(): Generator<AtlasState> {
    for (const year of years) {
      for (const lens of lenses) {
        for (const active of subsets) {
          for (const relevantOnly of [false, true]) {
            const focused = active.length > 1 ? active[1] : undefined;
            const facets: AtlasState['facets'] = active[0] ? { [active[0]]: { status: cat('a b', 'ü', '1..2'), width_m: { kind: 'range', min: -3.5, max: 20 } } } : {};
            yield { year, lens, collection: lens === 'collection' ? 'dacia' : undefined, active, focused, relevantOnly, facets } as AtlasState;
            // and with the first and last of the active layers hidden
            if (active.length > 1) yield { year, lens, collection: lens === 'collection' ? 'dacia' : undefined, active, focused, relevantOnly, facets, hidden: [active[0], active[active.length - 1]] } as AtlasState;
          }
        }
      }
    }
  }
  const clean = (s: AtlasState): AtlasState => JSON.parse(JSON.stringify({ ...s, facets: s.facets }, (_k, v) => (v === Number.POSITIVE_INFINITY ? 'inf' : v)));

  it('reads back exactly the state it wrote, for every generated state', () => {
    let count = 0;
    for (const state of states()) {
      const written = serialiseView(state, INDEX);
      const { state: back, report } = parseView(`?${written}`, INDEX, SLUGS);
      expect(clean(back), written).toEqual(clean(state));
      expect(report, written).toEqual({ renamed: [], skipped: [], dropped: [] });
      count += 1;
    }
    expect(count).toBeGreaterThan(100);
  });

  it('writes the canonical form of any address it reads (serialise after parse is stable)', () => {
    for (const address of ['?l=roads,frontier-line&y=150', '?rel=1&lens=room&l=roads', '?f=roads&l=roads,frontier-line&facet.roads=w:1..2', '?l=via-traiana&lens=collection&c=roman-dacia']) {
      const once = serialiseView(parse(address).state, INDEX);
      expect(serialiseView(parse(`?${once}`).state, INDEX), address).toBe(once);
    }
  });
});

describe('resolveFacets', () => {
  const summaries = { 'frontier-line': [{ property: 'status', label: 'Status', kind: 'category' as const, values: [{ value: 'attested', count: 1 }, { value: 'proposed', count: 1 }] }, { property: 'width_m', label: 'Width', kind: 'range' as const, min: 8, max: 20 }] };
  const state = (facets: AtlasState['facets']): AtlasState => ({ ...base(), active: ['frontier-line'], facets });

  it('keeps a selection that names a property and values the layer has', () => {
    const { state: kept, dropped } = resolveFacets(state({ 'frontier-line': { status: cat('attested'), width_m: { kind: 'range', min: 9, max: 12 } } }), summaries);
    expect(kept.facets).toEqual({ 'frontier-line': { status: cat('attested'), width_m: { kind: 'range', min: 9, max: 12 } } });
    expect(dropped).toEqual([]);
  });

  it('drops a property the layer does not declare, a value it does not have, and a kind that does not fit', () => {
    const { state: kept, dropped } = resolveFacets(state({ 'frontier-line': { colour: cat('red'), status: cat('attested', 'ghost'), width_m: cat('x') } }), summaries);
    expect(kept.facets).toEqual({ 'frontier-line': { status: cat('attested') } });
    expect(dropped).toHaveLength(3);
  });

  it('drops the selections of a layer whose facets are not known', () => {
    const { state: kept, dropped } = resolveFacets(state({ 'frontier-line': { status: cat('attested') } }), {});
    expect(kept.facets).toEqual({});
    expect(dropped).toHaveLength(1);
  });
});

describe('storage', () => {
  it('touches no localStorage, sessionStorage or cookie', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/atlas/view-url.ts', 'utf8');
    expect(source).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});

describe('the legacy address (spec 008 FR-018)', () => {
  it('reads ?from=legacy as the usual view with a notice that the old address could not be restored', () => {
    const { state, report } = parseView('?from=legacy', INDEX, SLUGS);
    expect(state).toEqual(initialState(INDEX));
    expect(report).toEqual({ renamed: [], skipped: [], dropped: ['The Atlas address from the old site could not be restored, so the Atlas opened on its usual view.'] });
  });

  it('does not treat `from` as an unknown parameter when it carries anything else, and says nothing', () => {
    expect(parseView('?from=essay', INDEX, SLUGS).report).toEqual({ renamed: [], skipped: [], dropped: [] });
  });

  it('keeps the rest of the address: the notice is added to whatever else did not read', () => {
    const { state, report } = parseView('?from=legacy&l=frontier-line&y=oops', INDEX, SLUGS);
    expect(state.active).toEqual(['frontier-line']);
    expect(report.dropped).toHaveLength(2);
  });

  it('never writes `from` back: the address is the only saved state', () => {
    const { state } = parseView('?from=legacy&l=roads', INDEX, SLUGS);
    expect(viewUrl(state, INDEX)).toBe('/atlas/?l=roads');
  });
});
