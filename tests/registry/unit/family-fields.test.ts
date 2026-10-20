import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === 'FAM-REQUIRED');

/** Required fields per family, from data-model.md "Family fields". */
const REQUIRED: [string, string[]][] = [
  ['map', ['makers', 'witness_kind']],
  ['cartographer', ['kind']],
  ['place', ['place_type']],
  ['dataset', ['version']],
  ['layer', ['role', 'asset', 'dataset']],
  ['bibliography_entry', ['csl']],
];

describe('FAM-REQUIRED', () => {
  it.each(REQUIRED)('asks a %s for %j', (family, fields) => {
    const found = hits([record(family, 1, { lifecycle: 'ready_for_build' })]);
    expect(found.map((v) => v.field).sort()).toEqual([...fields].sort());
    expect(found.every((v) => v.severity === 'error')).toBe(true);
  });

  it('is a warning while the record is still being researched', () => {
    const found = hits([record('place', 1, { lifecycle: 'researching' })]);
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('warning');
  });

  it('is satisfied by the fields', () => {
    expect(hits([record('place', 1, { lifecycle: 'published', place_type: 'settlement' })])).toEqual([]);
    expect(hits([record('layer', 1, { lifecycle: 'published', role: 'context', asset: 'a.pmtiles', dataset: 'tc:tc:dataset:dataset-000001' })])).toEqual([]);
  });

  it('treats an empty value as missing, an empty list for makers included', () => {
    expect(hits([record('place', 1, { lifecycle: 'published', place_type: '' })])).toHaveLength(1);
    expect(hits([record('map', 1, { lifecycle: 'published', makers: [], witness_kind: 'institutional' })])).toHaveLength(1);
  });

  describe('a map whose maker is confirmed unknown (ADR 0011 amendment)', () => {
    const ready = (over: Record<string, unknown>) => hits([record('map', 1, { lifecycle: 'published', witness_kind: 'institutional', ...over })]);

    it.each(['unknown', 'not_applicable'])('accepts no makers when field_status.makers is %s', (status) => {
      expect(ready({ makers: [], field_status: { makers: status } })).toEqual([]);
      expect(ready({ field_status: { makers: status } })).toEqual([]);
    });

    it('still asks for makers while the status is not_yet_verified, recorded or absent', () => {
      expect(ready({ makers: [], field_status: { makers: 'not_yet_verified' } }).map((v) => v.field)).toEqual(['makers']);
      expect(ready({ makers: [], field_status: { makers: 'recorded' } }).map((v) => v.field)).toEqual(['makers']);
      expect(ready({ makers: [], field_status: { witness_kind: 'unknown' } }).map((v) => v.field)).toEqual(['makers']);
    });

    it('does not let a maker status stand in for the witness kind', () => {
      expect(ready({ makers: [], witness_kind: undefined, field_status: { makers: 'unknown' } }).map((v) => v.field)).toEqual(['witness_kind']);
    });
  });

  it('asks nothing of families with no required fields', () => {
    for (const family of ['route', 'event', 'period', 'source', 'room', 'collection', 'essay', 'evidence']) {
      expect(hits([record(family, 1, { lifecycle: 'published' })]), family).toEqual([]);
    }
  });
});
