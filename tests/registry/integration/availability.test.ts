import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test', completeness: false };

describe('asset index (US5.5)', () => {
  it('lists the asset paths that exist, for the layers that name one', async () => {
    const { assetIndex } = await loadRegistry(fixture('valid'));
    expect([...assetIndex]).toEqual(['data/roads.pmtiles']);
  });

  it('never looks at an asset path that leaves the registry root', async () => {
    const { assetIndex } = await loadRegistry(fixture('invalid/asset-escape'));
    expect(assetIndex.size).toBe(0);
  });

  it('fails the build for a published layer whose asset is missing', async () => {
    const report = await checkRegistry(fixture('invalid/missing-asset'), OPTIONS);
    const hit = report.violations.find((v) => v.rule === 'LIFE-AVAILABILITY');
    expect(hit).toMatchObject({ entity: 'tc:tc:layer:layer-000001', field: 'asset', severity: 'error' });
    expect(report.pass).toBe(false);
  });

  it('passes a layer whose asset exists', async () => {
    const report = await checkRegistry(fixture('valid'), OPTIONS);
    expect(report.violations.filter((v) => v.rule === 'LIFE-AVAILABILITY')).toEqual([]);
  });
});
