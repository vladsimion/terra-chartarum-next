import { describe, expect, it } from 'vitest';
import { hitsOf } from '../support/maps.js';

/* Spec 004 T008 (FR-015): how far a record has been checked, and only a held witness can be inspected. */
describe('MAP-VERIFICATION', () => {
  const check = (over: Record<string, unknown>, lifecycle = 'researching') => hitsOf('MAP-VERIFICATION', lifecycle, over);

  it('passes an unverified record with no date', () => {
    expect(check({})).toEqual([]);
  });

  it('passes a checked_online record with a valid date', () => {
    expect(check({ verification: 'checked_online', last_verified: '2026-10-01' })).toEqual([]);
  });

  it('passes an inspected held witness', () => {
    expect(check({ verification: 'inspected', last_verified: '2026-10-01', witness_kind: 'held', images: [] })).toEqual([]);
  });

  it('flags a value outside the three, at any lifecycle', () => {
    const found = check({ verification: 'glanced_at' });
    expect(found.map((v) => [v.field, v.severity])).toEqual([['verification', 'error']]);
  });

  it('requires last_verified unless the record is unverified', () => {
    expect(check({ verification: 'checked_online' }).map((v) => v.field)).toEqual(['last_verified']);
  });

  it('flags a last_verified that is not a date', () => {
    expect(check({ verification: 'checked_online', last_verified: 'October 2026' }).map((v) => v.field)).toEqual(['last_verified']);
    expect(check({ verification: 'checked_online', last_verified: '2026-02-30' }).map((v) => v.field)).toEqual(['last_verified']);
  });

  it('flags inspected on an institutional witness, as an error', () => {
    const found = check({ verification: 'inspected', last_verified: '2026-10-01' });
    expect(found.map((v) => [v.field, v.severity])).toEqual([['verification', 'error']]);
  });
});
