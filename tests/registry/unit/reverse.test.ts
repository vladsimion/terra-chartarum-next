import { describe, expect, it } from 'vitest';
import { reverseRelationships } from '../../../src/registry/reverse.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, map, record } from '../support/builders.js';

const essay = (n: number, extra: Record<string, unknown> = {}) =>
  record('essay', n, { stage: 'Publish', lifecycle: 'published', release: 'released', ...extra });

/** The target page whose "Cited in" list is wanted: public, like every page that shows one. */
const publicMap = (n = 1) => map(n, { lifecycle: 'published', release: 'released' });

const MAP_ID = 'tc:tc:map:map-000001';

describe('reverseRelationships (FR-007, US4 independent test)', () => {
  it('lists every released essay that references a map', () => {
    const records = [publicMap(), essay(1, { maps: [MAP_ID] }), essay(2, { maps: [MAP_ID] })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001', 'tc:tc:essay:essay-000002']);
  });

  it('does not list a held essay', () => {
    const records = [publicMap(), essay(1, { maps: [MAP_ID] }), essay(2, { maps: [MAP_ID], release: 'held' })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001']);
  });

  it('does not list an essay that is released but not published, or published but held', () => {
    const records = [
      publicMap(),
      essay(1, { maps: [MAP_ID], lifecycle: 'qa', stage: 'Design QA' }),
      essay(2, { maps: [MAP_ID], release: 'held' }),
    ];
    expect(reverseRelationships(records).get(MAP_ID) ?? []).toEqual([]);
  });

  it('leaves an entity referenced only by a held essay with no referrers, while the reference stays valid', () => {
    const records = [publicMap(), essay(1, { maps: [MAP_ID], release: 'held' })];
    expect(reverseRelationships(records).get(MAP_ID) ?? []).toEqual([]);
    expect(validateRegistry(records).violations.filter((v) => v.rule === 'REF-UNKNOWN')).toEqual([]);
  });

  it('counts every kind of declared reference', () => {
    const records = [
      publicMap(),
      record('place', 1, { place_type: 'settlement', lifecycle: 'published', release: 'released', relations: [MAP_ID] }),
      evidence(1, { lifecycle: 'published', release: 'released', target: { entity: MAP_ID } }),
      essay(1, { maps: [MAP_ID] }),
    ];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual([
      'tc:tc:essay:essay-000001',
      'tc:tc:evidence:evidence-000001',
      'tc:tc:place:place-000001',
    ]);
  });

  it('lists a referrer once however many times or fields it references the target', () => {
    const records = [publicMap(), essay(1, { maps: [MAP_ID, MAP_ID], relations: [MAP_ID] })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001']);
  });

  it('ignores a record that references itself', () => {
    const self = essay(1, { relations: ['tc:tc:essay:essay-000001'] });
    expect(reverseRelationships([self]).get(self.id) ?? []).toEqual([]);
  });

  it('is sorted by id and leaves its input untouched', () => {
    const records = Object.freeze(
      [essay(3, { maps: [MAP_ID] }), publicMap(), essay(1, { maps: [MAP_ID] })].map((r) => Object.freeze(r)),
    );
    expect(reverseRelationships(records as never).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001', 'tc:tc:essay:essay-000003']);
  });

  it('has no entry for an id nobody references', () => {
    expect(reverseRelationships([publicMap()]).has(MAP_ID)).toBe(false);
  });
});

describe('reverseRelationships keys are public targets only', () => {
  it('has no entry for a held target, so the held id cannot leak through a caller that forgets to filter', () => {
    const held = map(1, { lifecycle: 'published', release: 'held' });
    const records = [held, essay(1, { maps: [held.id] })];
    expect(reverseRelationships(records).has(held.id)).toBe(false);
  });

  it('has no entry for a target that is released but not yet published', () => {
    const draft = map(1, { lifecycle: 'qa', release: 'released' });
    expect(reverseRelationships([draft, essay(1, { maps: [draft.id] })]).size).toBe(0);
  });

  it('has no entry for an id that resolves to nothing', () => {
    expect(reverseRelationships([essay(1, { maps: ['tc:tc:map:map-999999'] })]).size).toBe(0);
  });

  it('keeps a public target that is itself referenced by a public essay', () => {
    const result = reverseRelationships([publicMap(), essay(1, { maps: [MAP_ID] })]);
    expect([...result.keys()]).toEqual([MAP_ID]);
  });
});
