import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place } from '../support/builders.js';
import { validMap } from '../support/maps.js';

/* Spec 004 T018 (FR-010): acquisition details never enter the registry, in any family, at any depth. */
const hits = (...records: Parameters<typeof validateRegistry>[0]) => validateRegistry(records).violations.filter((v) => v.rule === 'MAP-PRIVATE-FIELD');

describe('MAP-PRIVATE-FIELD', () => {
  it('passes a record with no private word as a key', () => {
    expect(hits(validMap())).toEqual([]);
  });

  it('flags each private word as a key, as an error at any lifecycle', () => {
    for (const word of ['price', 'paid', 'cost', 'negotiation', 'vendor', 'dealer_contact', 'invoice', 'receipt']) {
      const found = hits(validMap({ lifecycle: 'proposed', [word]: 1 }));
      expect(found.map((v) => [v.field, v.severity]), word).toEqual([[word, 'error']]);
    }
  });

  it('finds the key at depth: in an image object, in private, in a list', () => {
    expect(hits(validMap({ images: [{ attribution: 'x', vendor: 'Y' }] })).map((v) => v.field)).toEqual(['images[0].vendor']);
    expect(hits(validMap({ private: { acquisition: { price: 10 } } })).map((v) => v.field)).toEqual(['private.acquisition.price']);
  });

  it('applies to every family', () => {
    expect(hits(place(1, { invoice: 'x' })).map((v) => v.entity)).toEqual(['tc:tc:place:place-000001']);
  });

  it('does not flag a value that contains a private word', () => {
    expect(hits(validMap({ provenance: 'Paid for by the Society; price unknown', significance: 'receipt of the sheet' }))).toEqual([]);
  });

  it('does not repeat the value, which is private', () => {
    expect(JSON.stringify(hits(validMap({ price: 1200 }))[0]!.value)).not.toContain('1200');
  });
});
