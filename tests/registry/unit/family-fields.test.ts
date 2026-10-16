import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[]) =>
  validateRegistry(records).violations.filter((v) => v.rule === 'FAM-REQUIRED');

/** Required fields per family, from data-model.md "Family fields". */
const REQUIRED: [string, string[]][] = [
  ['map', ['makers']],
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
    expect(hits([record('map', 1, { lifecycle: 'published', makers: [] })])).toHaveLength(1);
  });

  it('asks nothing of families with no required fields', () => {
    for (const family of ['cartographer', 'route', 'event', 'period', 'source', 'room', 'collection', 'essay', 'evidence']) {
      expect(hits([record(family, 1, { lifecycle: 'published' })]), family).toEqual([]);
    }
  });
});
