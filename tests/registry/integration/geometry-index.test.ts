import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, layer } from '../support/builders.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test', completeness: false };

describe('loadRegistry: geometry and provenance', () => {
  it('indexes the feature ids of every geojson file a record points to (id or properties.id)', async () => {
    const { featureIndex } = await loadRegistry(fixture('valid'));
    expect([...(featureIndex.get('data/roads.geojson') ?? [])].sort()).toEqual(['f-1', 'f-2']);
  });

  it('loads logged steps from provenance/ by id', async () => {
    const { provenanceIndex } = await loadRegistry(fixture('valid'));
    expect(provenanceIndex.get('prov-0001')?.status).toBe('adjudicated');
  });

  it('works without a provenance/ directory or geometry files', async () => {
    const { provenanceIndex, featureIndex } = await loadRegistry(fixture('invalid/duplicate-id'));
    expect(provenanceIndex.size).toBe(0);
    expect(featureIndex.size).toBe(0);
  });

  it('never reads a geometry path that leaves the registry root', async () => {
    const { featureIndex } = await loadRegistry(fixture('invalid/path-escape'));
    expect(featureIndex.size).toBe(0);
  });
});

describe('REF-FEATURE', () => {
  const target = { entity: 'tc:tc:layer:layer-000001', feature: 'f-9' };
  const lyr = layer(1, { geometry: 'data/a.geojson' });

  it('fails when the feature is not in the referenced geometry file', async () => {
    const report = await checkRegistry(fixture('invalid/missing-feature'), OPTIONS);
    const hit = report.violations.find((v) => v.rule === 'REF-FEATURE');
    expect(hit).toMatchObject({
      entity: 'tc:tc:evidence:evidence-000001',
      field: 'target.feature',
      value: 'f-999',
      severity: 'error',
    });
  });

  it('passes on the valid fixture, where every feature exists', async () => {
    const report = await checkRegistry(fixture('valid'), OPTIONS);
    expect(report.violations.filter((v) => v.rule === 'REF-FEATURE')).toEqual([]);
  });

  it('passes when the feature exists in the index', () => {
    const featureIndex = new Map([['data/a.geojson', new Set(['f-9'])]]);
    const report = validateRegistry([lyr, evidence(1, { target })], { featureIndex });
    expect(report.violations.filter((v) => v.rule === 'REF-FEATURE')).toEqual([]);
  });

  it('fails when the geometry file was not found', () => {
    const report = validateRegistry([lyr, evidence(1, { target })], { featureIndex: new Map() });
    const hit = report.violations.find((v) => v.rule === 'REF-FEATURE');
    expect(hit?.expected).toContain('data/a.geojson');
  });

  it('fails when the target has no geometry file to look in', () => {
    const noGeometry = layer(1);
    const report = validateRegistry([noGeometry, evidence(1, { target })], { featureIndex: new Map() });
    expect(report.violations.some((v) => v.rule === 'REF-FEATURE')).toBe(true);
  });

  it('does not apply to evidence about a whole entity', () => {
    const whole = evidence(1, { target: { entity: 'tc:tc:layer:layer-000001' } });
    expect(validateRegistry([lyr, whole], { featureIndex: new Map() }).violations.filter((v) => v.rule === 'REF-FEATURE')).toEqual([]);
  });

  it('leaves a dangling target entity to REF-UNKNOWN', () => {
    const dangling = evidence(1, { target: { entity: 'tc:tc:layer:layer-999999', feature: 'f-1' } });
    expect(validateRegistry([dangling], { featureIndex: new Map() }).violations.filter((v) => v.rule === 'REF-FEATURE')).toEqual([]);
  });
});
