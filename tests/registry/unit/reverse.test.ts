import { describe, expect, it } from 'vitest';
import { reverseRelationships } from '../../../src/registry/reverse.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, map, record } from '../support/builders.js';

const essay = (n: number, extra: Record<string, unknown> = {}) =>
  record('essay', n, { stage: 'Publish', lifecycle: 'published', release: 'released', ...extra });

const MAP_ID = 'tc:tc:map:map-000001';

describe('reverseRelationships (FR-007, US4 independent test)', () => {
  it('lists every released essay that references a map', () => {
    const records = [map(1), essay(1, { maps: [MAP_ID] }), essay(2, { maps: [MAP_ID] })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001', 'tc:tc:essay:essay-000002']);
  });

  it('does not list a held essay', () => {
    const records = [map(1), essay(1, { maps: [MAP_ID] }), essay(2, { maps: [MAP_ID], release: 'held' })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001']);
  });

  it('does not list an essay that is released but not published, or published but held', () => {
    const records = [
      map(1),
      essay(1, { maps: [MAP_ID], lifecycle: 'qa', stage: 'Design QA' }),
      essay(2, { maps: [MAP_ID], release: 'held' }),
    ];
    expect(reverseRelationships(records).get(MAP_ID) ?? []).toEqual([]);
  });

  it('leaves an entity referenced only by a held essay with no referrers, while the reference stays valid', () => {
    const records = [map(1), essay(1, { maps: [MAP_ID], release: 'held' })];
    expect(reverseRelationships(records).get(MAP_ID) ?? []).toEqual([]);
    expect(validateRegistry(records).violations.filter((v) => v.rule === 'REF-UNKNOWN')).toEqual([]);
  });

  it('counts every kind of declared reference', () => {
    const subject = map(1);
    const records = [
      subject,
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
    const records = [map(1), essay(1, { maps: [MAP_ID, MAP_ID], relations: [MAP_ID] })];
    expect(reverseRelationships(records).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001']);
  });

  it('ignores a record that references itself', () => {
    const self = essay(1, { relations: ['tc:tc:essay:essay-000001'] });
    expect(reverseRelationships([self]).get(self.id) ?? []).toEqual([]);
  });

  it('is sorted by id and leaves its input untouched', () => {
    const records = Object.freeze(
      [essay(3, { maps: [MAP_ID] }), map(1), essay(1, { maps: [MAP_ID] })].map((r) => Object.freeze(r)),
    );
    expect(reverseRelationships(records as never).get(MAP_ID)).toEqual(['tc:tc:essay:essay-000001', 'tc:tc:essay:essay-000003']);
  });

  it('has no entry for an id nobody references', () => {
    expect(reverseRelationships([map(1)]).has(MAP_ID)).toBe(false);
  });
});
