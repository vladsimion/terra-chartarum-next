import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { generateMapRegistry } from '../../../src/registry/synthetic.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { rooms } from '../support/builders.js';

/*
 * Spec 004 T003: a seeded set of n valid, public maps with their makers, places, sources, evidence
 * and essays, for the browse tests (60) and the timing test (500, SC-004).
 */
const count = (records: { family: string }[], family: string) => records.filter((r) => r.family === family).length;

describe('generateMapRegistry', () => {
  const records = generateMapRegistry(60, 7);

  it('makes exactly n maps, with makers, places, sources, evidence and essays around them', () => {
    expect(count(records, 'map')).toBe(60);
    for (const family of ['cartographer', 'place', 'source', 'evidence', 'essay']) expect(count(records, family), family).toBeGreaterThan(0);
  });

  it('is valid, with no errors and no warnings, beside the seven rooms', () => {
    const report = validateRegistry([...rooms(), ...records], { completeness: true });
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
    expect(report.counts.warnings).toBe(0);
  });

  it('gives the same records for the same seed, byte for byte', () => {
    expect(JSON.stringify(generateMapRegistry(60, 7))).toBe(JSON.stringify(records));
    expect(JSON.stringify(generateMapRegistry(60, 8))).not.toBe(JSON.stringify(records));
  });

  it('makes every map public, so a browse test has something to browse', () => {
    expect(projectPublic([...rooms(), ...records]).filter((r) => r.family === 'map')).toHaveLength(60);
  });

  it('varies what the facets need: both witness kinds, workshops, dates, regions', () => {
    const maps = records.filter((r) => r.family === 'map');
    expect(new Set(maps.map((m) => m.witness_kind))).toEqual(new Set(['held', 'institutional']));
    expect(maps.some((m) => m.attribution === 'unresolved')).toBe(true);
    expect(new Set(maps.map((m) => m.date_published)).size).toBeGreaterThan(5);
    expect(new Set(records.filter((r) => r.family === 'place').map((p) => p.place_type))).toEqual(new Set(['region', 'country', 'settlement']));
  });

  it('scales to 500 maps', () => {
    expect(count(generateMapRegistry(500, 1), 'map')).toBe(500);
  });
});
