import { describe, expect, it } from 'vitest';
import { groupBibliography } from '../../../src/essays/bibliography.js';

/*
 * Spec 003 T028 (FR-005): an essay's bibliography entries group into the seven sections in the
 * constitution's order; an empty section is absent; an entry appears once.
 */
const entry = (id: string, section: string, text: string) => ({ id, section, text });

describe('groupBibliography', () => {
  it('orders the sections as the constitution does, whatever order the entries come in', () => {
    const groups = groupBibliography([
      entry('e1', 'further_reading', 'Zed, Z. Last.'),
      entry('e2', 'primary_sources', 'Alpha, A. First.'),
      entry('e3', 'reference_works', 'Mid, M. Middle.'),
    ]);
    expect(groups.map((g) => g.section)).toEqual(['primary_sources', 'reference_works', 'further_reading']);
  });

  it('gives each section its reader-facing heading', () => {
    const groups = groupBibliography([entry('e1', 'datasets_licences', 'D.'), entry('e2', 'historical_maps', 'H.')]);
    expect(groups.map((g) => g.label)).toEqual(['Historical maps', 'Datasets and licences']);
  });

  it('leaves out a section with no entries', () => {
    const groups = groupBibliography([entry('e1', 'primary_sources', 'A.')]);
    expect(groups).toHaveLength(1);
  });

  it('lists an entry once, even when the essay names it twice', () => {
    const groups = groupBibliography([entry('e1', 'primary_sources', 'A.'), entry('e1', 'primary_sources', 'A.')]);
    expect(groups[0]!.entries).toHaveLength(1);
  });

  it('sorts the entries within a section by their formatted text', () => {
    const groups = groupBibliography([
      entry('e1', 'specialised_studies', 'Smith, J. Later.'),
      entry('e2', 'specialised_studies', 'Adams, B. Earlier.'),
    ]);
    expect(groups[0]!.entries.map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('returns nothing for an essay with no bibliography', () => {
    expect(groupBibliography([])).toEqual([]);
  });

  it('rejects an entry whose section is not one of the seven, naming the entry', () => {
    expect(() => groupBibliography([entry('e9', 'miscellany', 'X.')])).toThrow(/e9.*miscellany/);
  });
});
