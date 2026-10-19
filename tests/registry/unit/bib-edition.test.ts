import { describe, expect, it } from 'vitest';
import { entry, hitsOf } from '../support/bibliography.js';

/* Spec 006 T011 (FR-010): edition_of and translation_of point at other entries and never come back round. */
describe('BIB-EDITION', () => {
  const id = (n: number) => entry(n).id;

  it('passes entries with no relation, and a chain', () => {
    expect(hitsOf('BIB-EDITION', [entry(1), entry(2)])).toEqual([]);
    expect(hitsOf('BIB-EDITION', [entry(1), entry(2, { edition_of: id(1) }), entry(3, { translation_of: id(2) })])).toEqual([]);
  });

  it('flags a reference to an entry that is not there, or to another family', () => {
    expect(hitsOf('BIB-EDITION', [entry(1, { edition_of: id(9) })]).map((v) => v.field)).toEqual(['edition_of']);
    expect(hitsOf('BIB-EDITION', [entry(1, { translation_of: 'tc:tc:place:place-000001' })]).map((v) => v.field)).toEqual(['translation_of']);
  });

  it('flags an entry that is its own edition or translation, once', () => {
    expect(hitsOf('BIB-EDITION', [entry(1, { edition_of: id(1) })]).map((v) => v.field)).toEqual(['edition_of']);
    expect(hitsOf('BIB-EDITION', [entry(1, { translation_of: id(1) })])).toHaveLength(1);
  });

  it('flags every entry in a cycle of two, through one field or both', () => {
    const viaEdition = [entry(1, { edition_of: id(2) }), entry(2, { edition_of: id(1) })];
    expect(hitsOf('BIB-EDITION', viaEdition).map((v) => v.entity).sort()).toEqual([id(1), id(2)]);
    const mixed = [entry(1, { edition_of: id(2) }), entry(2, { translation_of: id(1) })];
    expect(hitsOf('BIB-EDITION', mixed)).toHaveLength(2);
  });

  it('flags a longer cycle, and not the entry that only leads into it', () => {
    const records = [entry(1, { edition_of: id(2) }), entry(2, { translation_of: id(3) }), entry(3, { edition_of: id(1) }), entry(4, { edition_of: id(1) })];
    expect(hitsOf('BIB-EDITION', records).map((v) => v.entity).sort()).toEqual([id(1), id(2), id(3)]);
  });

  it('is an error at every lifecycle', () => {
    expect(hitsOf('BIB-EDITION', [entry(1, { lifecycle: 'proposed', edition_of: id(1) })]).map((v) => v.severity)).toEqual(['error']);
  });
});
