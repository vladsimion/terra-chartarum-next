import { describe, expect, it } from 'vitest';
import { hitsOf } from '../support/maps.js';

/* Spec 004 T006 (FR-002): a held witness says whether its provenance and atlas context were observed or inferred. */
describe('MAP-BASIS', () => {
  const held = { witness_kind: 'held', verification: 'inspected', last_verified: '2026-10-01', images: [] };
  const basis = (lifecycle: string, over = {}) => hitsOf('MAP-BASIS', lifecycle, { ...held, ...over });

  it('passes a held witness with a basis for each filled field', () => {
    expect(basis('publishable', { basis: { provenance: 'observed', atlas_context: 'inferred' } })).toEqual([]);
  });

  it('flags a filled field with no basis: a warning at ready_for_build, an error at publishable', () => {
    expect(basis('ready_for_build', { basis: { provenance: 'observed' } }).map((v) => [v.field, v.severity])).toEqual([['basis.atlas_context', 'warning']]);
    expect(basis('publishable', { basis: {} }).map((v) => v.severity)).toEqual(['error', 'error']);
  });

  it('flags a basis that is neither observed nor inferred', () => {
    expect(basis('publishable', { basis: { provenance: 'guessed', atlas_context: 'observed' } }).map((v) => v.value)).toEqual(['guessed']);
  });

  it('does not ask for a basis on an empty field', () => {
    expect(basis('publishable', { provenance: undefined, atlas_context: undefined })).toEqual([]);
  });

  it('flags a basis on an institutional witness', () => {
    expect(hitsOf('MAP-BASIS', 'publishable', { basis: { provenance: 'observed' } })).toHaveLength(1);
  });
});
