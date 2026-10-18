import { cpSync, mkdtempSync, readFileSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { checkRegistry } from '../../../src/registry/check.js';
import { projectPublic } from '../../../src/registry/project.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { STATIC_ASSET_LIMIT_BYTES } from '../../../src/registry/schemas/atlas-values.js';

/*
 * Spec 005 T002: the hand-authored Atlas registry passes the gate, holds each case the stories
 * need, and each invalid variant trips exactly the rule it is named for.
 */
const fixture = fileURLToPath(new URL('../fixtures/registry', import.meta.url));

describe('the Atlas fixture registry', () => {
  it('passes the gate with no errors and no warnings', async () => {
    const report = await checkRegistry(fixture);
    expect(report.violations).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it('holds the layers the stories need', async () => {
    const { records } = await loadRegistry(fixture);
    const layers = records.filter((r) => r.family === 'layer');
    const byTitle = (title: string) => layers.find((l) => l.title === title);
    expect(byTitle('The frontier line')).toMatchObject({ time_mode: 'per_feature', role: 'historical' });
    expect(byTitle('Roads of the province')).toMatchObject({ time_mode: 'envelope_only' });
    expect(byTitle('Present-day boundaries')).toMatchObject({ role: 'context', geometry_provenance: 'modern_reference' });
    expect(byTitle('Settlements of Dacia')?.slug_history).toEqual(['old-settlements']);
    expect(byTitle('A georeferenced sheet')).toMatchObject({ role: 'map-overlay' });
    expect(byTitle('A held layer')).toMatchObject({ release: 'held' });
    expect(byTitle('A layer in build')).toMatchObject({ lifecycle: 'in_build' });
  });

  it('projects the five public layers, two public collections and two public places, and nothing held', async () => {
    const { records } = await loadRegistry(fixture);
    const out = projectPublic(records);
    expect(out.filter((r) => r.family === 'layer').map((r) => r.slug).sort()).toEqual(['dacian-settlements', 'frontier-line', 'overlay-tabula', 'present-day-boundaries', 'roads']);
    expect(out.filter((r) => r.family === 'collection')).toHaveLength(2);
    expect(out.filter((r) => r.family === 'place').map((r) => r.slug).sort()).toEqual(['apulum', 'napoca']);
    const second = out.find((r) => r.slug === 'nothing-runnable-yet');
    expect(second?.members).toEqual([]);
  });

  it('lists layers in the public essays and in the held one', async () => {
    const { records } = await loadRegistry(fixture);
    const essays = records.filter((r) => r.family === 'essay');
    expect(essays.filter((e) => e.release === 'released').every((e) => Array.isArray(e.layers) && e.layers.length > 0)).toBe(true);
    expect(essays.some((e) => e.release === 'held' && Array.isArray(e.layers))).toBe(true);
  });
});

/** Each variant changes one thing in a copy of the fixture and names the rule that must fire as an error. */
type Edit = (root: string) => void;
const record = (root: string, file: string, change: (data: Record<string, unknown>) => void): void => {
  const full = path.join(root, file);
  const data = parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
  change(data);
  writeFileSync(full, stringify(data));
};

const VARIANTS: Record<string, Edit> = {
  'LAYER-THEME': (root) => record(root, 'content/layer/layer-000001.yaml', (d) => { d.theme = 'Territories'; }),
  'LAYER-TIME': (root) => record(root, 'content/layer/layer-000001.yaml', (d) => { d.envelope = '0271/0106'; }),
  'LAYER-FACET': (root) => record(root, 'content/layer/layer-000001.yaml', (d) => { d.facets = [{ property: 'status', label: 'S', kind: 'category' }, { property: 'status', label: 'T', kind: 'category' }]; }),
  'LAYER-GEOREF': (root) => record(root, 'content/layer/layer-000005.yaml', (d) => { delete d.georef; }),
  'LAYER-ASSET-SIZE': (root) => truncateSync(path.join(root, 'data/layers/layer-000002.geojson'), STATIC_ASSET_LIMIT_BYTES + 1),
  'PLACE-NAMES': (root) => record(root, 'content/place/place-000001.yaml', (d) => { d.names = []; }),
  'PLACE-LOCATION': (root) => record(root, 'content/place/place-000001.yaml', (d) => { d.location = { lon: 23.5, lat: 91 }; }),
};

describe('the invalid variants', () => {
  for (const [rule, edit] of Object.entries(VARIANTS)) {
    it(`${rule} fires, as an error, on its variant only`, async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'atlas-variant-'));
      cpSync(fixture, root, { recursive: true });
      edit(root);
      const report = await checkRegistry(root);
      const errors = report.violations.filter((v) => v.severity === 'error').map((v) => v.rule);
      expect(errors).toContain(rule);
      expect(new Set(errors)).toEqual(new Set([rule]));
    });
  }
});
