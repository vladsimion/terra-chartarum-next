import { describe, expect, it } from 'vitest';
import { CART, cartographer, hitsOf, neighbours } from '../support/maps.js';

/* Spec 004 T012 (FR-001, FR-003, FR-011): attribution, scope and cartographer kind. */
const workshop = { kind: 'workshop', roles: ['publisher'], life_dates: undefined };

describe('MAP-ATTRIBUTION', () => {
  const check = (over: Record<string, unknown>, maker: Record<string, unknown> = {}) =>
    hitsOf('MAP-ATTRIBUTION', 'ready_for_build', over, neighbours({ maker }));

  it('passes an exact attribution to a person', () => {
    expect(check({})).toEqual([]);
  });

  it('passes an unresolved attribution to a workshop', () => {
    expect(check({ attribution: 'unresolved' }, workshop)).toEqual([]);
  });

  it('flags an exact attribution to a workshop, as an error from ready_for_build', () => {
    expect(check({}, workshop).map((v) => v.severity)).toEqual(['error']);
    expect(check({ attribution: undefined }, workshop)).toHaveLength(1);
  });

  it('flags unresolved when no maker is a workshop', () => {
    expect(check({ attribution: 'unresolved' })).toHaveLength(1);
  });

  it('flags an attribution value outside exact and unresolved', () => {
    expect(check({ attribution: 'probably' }).length).toBeGreaterThanOrEqual(1);
  });
});

describe('CART-KIND', () => {
  const check = (over: Record<string, unknown>) => hitsOf('CART-KIND', 'ready_for_build', {}, [cartographer(over)]).map((v) => v.field);

  it('passes a person and a workshop', () => {
    expect(check({})).toEqual([]);
    expect(check(workshop)).toEqual([]);
    expect(check({ kind: 'workshop', roles: ['engraver', 'publisher'], life_dates: undefined, active: '1600/1650' })).toEqual([]);
  });

  it('flags a kind outside person and workshop', () => {
    expect(check({ kind: 'firm' })).toEqual(['kind']);
  });

  it('flags a role outside the three', () => {
    expect(check({ roles: ['cartographer', 'printer'] })).toEqual(['roles[1]']);
  });

  it('flags a workshop with life_dates', () => {
    expect(check({ kind: 'workshop', life_dates: '1600-1650' })).toEqual(['life_dates']);
  });

  it('keeps the maker id in the fixture', () => {
    expect(CART).toContain('cartographer-000001');
  });
});

describe('MAP-SCOPE', () => {
  const work = { record_scope: 'work', witness_kind: undefined, images: [], verification: 'unverified' };
  const check = (over: Record<string, unknown>, lifecycle = 'publishable') => hitsOf('MAP-SCOPE', lifecycle, over);

  it('passes an object with a witness_kind and a work with none', () => {
    expect(check({})).toEqual([]);
    expect(check(work)).toEqual([]);
    expect(check({ ...work, record_scope: 'concept' })).toEqual([]);
  });

  it('flags a scope outside the three', () => {
    expect(check({ record_scope: 'sheet' }).map((v) => v.field)).toContain('record_scope');
  });

  it('flags an object without witness_kind: a warning at ready_for_build, an error at publishable, silent before', () => {
    expect(check({ witness_kind: undefined }, 'researching')).toEqual([]);
    expect(check({ witness_kind: undefined }, 'ready_for_build').map((v) => v.severity)).toEqual(['warning']);
    expect(check({ witness_kind: undefined }).map((v) => v.severity)).toEqual(['error']);
  });

  it('flags a work or concept that carries witness_kind, images, an inspected verification or a basis', () => {
    expect(check({ ...work, witness_kind: 'held' }).map((v) => v.field)).toEqual(['witness_kind']);
    expect(check({ ...work, images: [{}] }).map((v) => v.field)).toEqual(['images']);
    expect(check({ ...work, verification: 'inspected', last_verified: '2026-10-01' }).map((v) => v.field)).toEqual(['verification']);
    expect(check({ ...work, basis: { provenance: 'observed' } }).map((v) => v.field)).toEqual(['basis']);
  });
});
