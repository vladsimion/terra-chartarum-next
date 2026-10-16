import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';

const GEOJSON = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', id: 'f-1', properties: {}, geometry: null }] });

/** A registry with one layer that names `geometry` and `asset`, plus a file outside the root. */
function registry(fields: { geometry?: string; asset?: string }, extra: (root: string, outside: string) => void = () => {}) {
  const base = mkdtempSync(path.join(tmpdir(), 'path-safety-'));
  const root = path.join(base, 'registry');
  const outside = path.join(base, 'outside');
  mkdirSync(path.join(root, 'content', 'layer'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(outside, 'secret.geojson'), GEOJSON);
  writeFileSync(path.join(outside, 'secret.pmtiles'), 'bytes');
  extra(root, outside);
  const lines = [
    'id: tc:tc:layer:layer-000001',
    'family: layer',
    'origin: minted',
    'title: A layer',
    'slug: a-layer',
    'lifecycle: researching',
    'role: historical',
    ...(fields.geometry ? [`geometry: ${fields.geometry}`] : []),
    ...(fields.asset ? [`asset: ${fields.asset}`] : []),
  ];
  writeFileSync(path.join(root, 'content', 'layer', 'layer-000001.yaml'), lines.join('\n'));
  return root;
}

describe('paths named by records stay inside the registry root', () => {
  it('reads a geometry file and an asset inside the root', async () => {
    const root = registry({ geometry: 'data/a.geojson', asset: 'data/a.pmtiles' }, (r) => {
      mkdirSync(path.join(r, 'data'), { recursive: true });
      writeFileSync(path.join(r, 'data', 'a.geojson'), GEOJSON);
      writeFileSync(path.join(r, 'data', 'a.pmtiles'), 'bytes');
    });
    const { featureIndex, assetIndex, loadErrors } = await loadRegistry(root);
    expect(loadErrors).toEqual([]);
    expect([...(featureIndex.get('data/a.geojson') ?? [])]).toEqual(['f-1']);
    expect(assetIndex.has('data/a.pmtiles')).toBe(true);
  });

  it('never reads a ../ path, and reports it instead of skipping it silently', async () => {
    const root = registry({ geometry: '../outside/secret.geojson', asset: '../outside/secret.pmtiles' });
    const { featureIndex, assetIndex, loadErrors } = await loadRegistry(root);
    expect(featureIndex.size).toBe(0);
    expect(assetIndex.size).toBe(0);
    expect(loadErrors.map((e) => e.file)).toEqual(['content/layer/layer-000001.yaml', 'content/layer/layer-000001.yaml']);
    expect(loadErrors.every((e) => /leaves the registry root/.test(e.message))).toBe(true);
  });

  it('never follows a symlink inside the root to a file outside it', async () => {
    const root = registry({ geometry: 'data/link.geojson', asset: 'data/link.pmtiles' }, (r, outside) => {
      mkdirSync(path.join(r, 'data'), { recursive: true });
      symlinkSync(path.join(outside, 'secret.geojson'), path.join(r, 'data', 'link.geojson'));
      symlinkSync(path.join(outside, 'secret.pmtiles'), path.join(r, 'data', 'link.pmtiles'));
    });
    const { featureIndex, assetIndex, loadErrors } = await loadRegistry(root);
    expect(featureIndex.size).toBe(0);
    expect(assetIndex.size).toBe(0);
    expect(loadErrors).toHaveLength(2);
  });

  it('never follows a symlinked directory out of the root', async () => {
    const root = registry({ geometry: 'linked/secret.geojson' }, (r, outside) => {
      symlinkSync(outside, path.join(r, 'linked'));
    });
    const { featureIndex, loadErrors } = await loadRegistry(root);
    expect(featureIndex.size).toBe(0);
    expect(loadErrors).toHaveLength(1);
  });

  it('treats a path that simply does not exist as missing, not as an escape', async () => {
    const root = registry({ geometry: 'data/nope.geojson', asset: 'data/nope.pmtiles' });
    const { loadErrors, featureIndex, assetIndex } = await loadRegistry(root);
    expect(loadErrors).toEqual([]);
    expect(featureIndex.size).toBe(0);
    expect(assetIndex.size).toBe(0);
  });

  it('turns an escaping path into an error in the integrity report', async () => {
    const root = registry({ geometry: '../outside/secret.geojson' });
    const report = await checkRegistry(root, { completeness: false });
    const hit = report.violations.find((v) => v.rule === 'LOAD-PARSE');
    expect(hit).toMatchObject({ file: 'content/layer/layer-000001.yaml', severity: 'error' });
    expect(report.pass).toBe(false);
  });
});
