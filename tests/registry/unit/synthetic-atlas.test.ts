import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { checkRegistry } from '../../../src/registry/check.js';
import { generateAtlasRegistry, writeSyntheticAtlas } from '../../../src/registry/synthetic.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { rooms } from '../support/builders.js';

/*
 * Spec 005 T005: a seeded catalogue of n public layers with their collections, places, essays and
 * GeoJSON sources, for the discovery tests (60) and the 200-layer timing tests (SC-001).
 */
const count = (records: { family: string }[], family: string) => records.filter((r) => r.family === family).length;

describe('generateAtlasRegistry', () => {
  const records = generateAtlasRegistry(200, 3);

  it('makes exactly n layers, with a dataset, collections, places and essays around them', () => {
    expect(count(records, 'layer')).toBe(200);
    for (const family of ['dataset', 'collection', 'place', 'essay']) expect(count(records, family), family).toBeGreaterThan(0);
  });

  it('is valid, with no errors and no warnings, beside the seven rooms', () => {
    const report = validateRegistry([...rooms(), ...records], { completeness: true });
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
    expect(report.counts.warnings).toBe(0);
  });

  it('gives the same records for the same seed, byte for byte', () => {
    expect(JSON.stringify(generateAtlasRegistry(200, 3))).toBe(JSON.stringify(records));
    expect(JSON.stringify(generateAtlasRegistry(200, 4))).not.toBe(JSON.stringify(records));
  });

  it('makes every layer public, so the catalogue has something to list', () => {
    expect(projectPublic([...rooms(), ...records]).filter((r) => r.family === 'layer')).toHaveLength(200);
  });

  it('varies what the catalogue needs: all seven themes, both time modes, context and historical roles, collections with defaults', () => {
    const layers = records.filter((r) => r.family === 'layer');
    expect(new Set(layers.map((l) => l.theme)).size).toBe(7);
    expect(new Set(layers.map((l) => l.time_mode))).toEqual(new Set(['per_feature', 'envelope_only']));
    expect(new Set(layers.map((l) => l.role))).toEqual(new Set(['historical', 'context']));
    const collections = records.filter((r) => r.family === 'collection');
    expect(collections.every((c) => Array.isArray(c.default_layers) && c.default_layers.length > 0)).toBe(true);
  });

  it('lists layers in essays, so related essays and rooms can be derived', () => {
    const essays = records.filter((r) => r.family === 'essay');
    expect(essays.some((e) => Array.isArray(e.layers) && e.layers.length > 0)).toBe(true);
  });
});

describe('writeSyntheticAtlas', () => {
  it('writes a registry that passes the gate, with a small GeoJSON source per layer', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'synth-atlas-'));
    await writeSyntheticAtlas(out, 12, 5);
    const report = await checkRegistry(out);
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
    const source = JSON.parse(readFileSync(path.join(out, 'data/layers/layer-000001.geojson'), 'utf8'));
    expect(source.type).toBe('FeatureCollection');
    expect(source.features.length).toBeGreaterThan(0);
  });

  it('writes the same bytes for the same seed', async () => {
    const a = mkdtempSync(path.join(tmpdir(), 'synth-atlas-a-'));
    const b = mkdtempSync(path.join(tmpdir(), 'synth-atlas-b-'));
    await writeSyntheticAtlas(a, 12, 5);
    await writeSyntheticAtlas(b, 12, 5);
    for (const file of ['content/layer/layer-000001.yaml', 'content/collection/collection-000001.yaml', 'data/layers/layer-000002.geojson']) {
      expect(readFileSync(path.join(a, file), 'utf8'), file).toBe(readFileSync(path.join(b, file), 'utf8'));
    }
  });
});
