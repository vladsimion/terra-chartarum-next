import { describe, expect, it } from 'vitest';
import { applyFilters, buildIndex, normalise, parseQuery, serialise, type Filters } from '../../../src/bibliography/index-data.js';
import { citationIndex } from '../../../src/bibliography/cited-in.js';
import { publicEntries } from '../../../src/bibliography/entry-public.js';
import { E, cslFor, publicRecords } from '../support/world.js';

/*
 * Spec 006 T022 (FR-008, scenario 3, contracts/bibliography-pages.md "Search index entry" and
 * "Query string"): the index holds the contract's fields for public entries only, in section,
 * author, year order; search is a case- and diacritic-insensitive substring match; the filters combine.
 */
const records = publicRecords();
const index = buildIndex(records, cslFor);
const none: Filters = { sections: [], essays: [], q: '' };
const slugs = (filters: Partial<Filters>) => applyFilters(index, { ...none, ...filters }).map((e) => e.slug);

describe('buildIndex', () => {
  it('has an entry for each public entry, and none for a held, uncited or section-less one', () => {
    const wanted = publicEntries(records).map((e) => e.slug).sort();
    expect(index.map((e) => e.slug).sort()).toEqual(wanted);
    expect(index.map((e) => e.slug)).not.toContain('bibliography_entry-3');
    expect(index.map((e) => e.slug)).not.toContain('bibliography_entry-13');
  });

  it('holds exactly the contract’s fields', () => {
    expect(Object.keys(index[0]!).sort()).toEqual(['author', 'authors', 'essays', 'keywords', 'section', 'slug', 'title', 'year']);
  });

  it('shows the first author as a reader would, and every author normalised for search', () => {
    const roe = index.find((e) => e.slug === 'bibliography_entry-2')!;
    expect(roe.author).toBe('Roë');
    expect(roe.authors).toEqual(['roe rob', 'poe pat']);
    expect(roe.year).toBe('1992');
  });

  it('reads keywords from the CSL-JSON, split and normalised', () => {
    expect(index.find((e) => e.slug === 'bibliography_entry-1')!.keywords).toEqual(['frontiers', 'surveying']);
    expect(index.find((e) => e.slug === 'bibliography_entry-9')!.keywords).toEqual(['roads', 'dacia']);
  });

  it('names the public essays that cite each entry, by either route', () => {
    expect(index.find((e) => e.slug === 'bibliography_entry-1')!.essays).toEqual(['frontier', 'related']);
    expect(index.find((e) => e.slug === 'bibliography_entry-2')!.essays).toEqual(['frontier']);
    expect(index.find((e) => e.slug === 'bibliography_entry-9')!.essays).toEqual([]);
  });

  it('is ordered by section, then author, then year', () => {
    const order = index.map((e) => [e.section, e.author, e.year]);
    const sections = ['primary_sources', 'historical_maps', 'reference_works', 'specialised_studies', 'digital_resources', 'datasets_licences', 'further_reading'];
    const sorted = [...order].sort((a, b) => sections.indexOf(a[0]!) - sections.indexOf(b[0]!) || a[1]!.localeCompare(b[1]!, 'en') || a[2]!.localeCompare(b[2]!));
    expect(order).toEqual(sorted);
    const marsh = index.filter((e) => e.author === 'Marsh').map((e) => e.year);
    expect(marsh).toEqual(['1955', '1972', '1980']);
  });

  it('carries no field of a held record', () => {
    expect(JSON.stringify(index)).not.toMatch(/held-moraine|A held essay/);
  });
});

describe('normalise', () => {
  it('lower-cases and folds diacritics and punctuation spacing', () => {
    expect(normalise('  Roë, Rob ')).toBe('roe, rob');
    expect(normalise('NAPOCĂ')).toBe('napoca');
  });
});

describe('search', () => {
  it('matches a substring of the author, title, year or a keyword', () => {
    expect(slugs({ q: 'marsh' })).toEqual(['bibliography_entry-9', 'bibliography_entry-10', 'bibliography_entry-11']);
    expect(slugs({ q: 'chronicle' })).toEqual(['bibliography_entry-1']);
    expect(slugs({ q: '1992' })).toEqual(['bibliography_entry-2']);
    expect(slugs({ q: 'surveying' })).toEqual(['bibliography_entry-1']);
  });

  it('ignores case and diacritics, in the query and in the data', () => {
    expect(slugs({ q: 'ROE' })).toEqual(['bibliography_entry-2']);
    expect(slugs({ q: 'Roë' })).toEqual(['bibliography_entry-2']);
    expect(slugs({ q: 'LENOIR' })).toEqual([]);
  });

  it('matches any author of the entry, not just the first', () => {
    expect(slugs({ q: 'poe' })).toEqual(['bibliography_entry-2']);
  });

  it('needs every word to match something, in any field', () => {
    expect(slugs({ q: 'marsh 1972' })).toEqual(['bibliography_entry-10']);
    expect(slugs({ q: 'marsh 1992' })).toEqual([]);
  });

  it('matches everything when empty, and nothing for a word that is nowhere', () => {
    expect(slugs({})).toHaveLength(index.length);
    expect(slugs({ q: 'zzz' })).toEqual([]);
  });
});

describe('filters', () => {
  it('narrow by section, and by the essay that cites the entry', () => {
    expect(slugs({ sections: ['historical_maps'] })).toEqual(['bibliography_entry-2']);
    expect(slugs({ essays: ['related'] })).toEqual(['bibliography_entry-1']);
  });

  it('combine: any of the chosen sections, and the essays, and the search', () => {
    expect(slugs({ sections: ['primary_sources', 'historical_maps'], essays: ['frontier'] })).toEqual(['bibliography_entry-1', 'bibliography_entry-2']);
    expect(slugs({ sections: ['primary_sources', 'historical_maps'], essays: ['frontier'], q: 'roe' })).toEqual(['bibliography_entry-2']);
  });
});

describe('the query string', () => {
  const parse = (query: string) => parseQuery(new URLSearchParams(query), index);

  it('reads sections, essays and q, and ignores an unknown key or value', () => {
    expect(parse('section=historical_maps&section=nonsense&essay=frontier&essay=ghost&q=roe&utm=1')).toEqual({ sections: ['historical_maps'], essays: ['frontier'], q: 'roe' });
  });

  it('writes the canonical form: sections in section order, essays sorted, then q; nothing for nothing', () => {
    expect(serialise({ sections: ['datasets_licences', 'primary_sources'], essays: ['related', 'frontier'], q: 'a b' })).toBe('section=primary_sources&section=datasets_licences&essay=frontier&essay=related&q=a+b');
    expect(serialise(none)).toBe('');
  });

  it('gives the same view on a fresh load: parse after serialise is the same filters', () => {
    const filters: Filters = { sections: ['primary_sources'], essays: ['frontier'], q: 'doe' };
    expect(parse(serialise(filters))).toEqual(filters);
    expect(slugs(parse(serialise(filters)))).toEqual(slugs(filters));
  });
});

describe('citation counts do not leak into the index', () => {
  it('uses the same public records the citations do', () => {
    expect(citationIndex(records).has(E(4))).toBe(false);
  });
});
