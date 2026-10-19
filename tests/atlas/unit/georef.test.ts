import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layerInfo } from '../../../src/atlas/inspector-data.js';
import { DEFAULT_OVERLAY_OPACITY, clampOpacity } from '../../../src/atlas/overlay.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { projectPublic } from '../../../src/registry/project.js';

/*
 * Spec 005 T055 (US6, FR-019): the inspector's view of a map overlay's `georef`, taken from the
 * record and the map record it names, and the overlay's opacity from 0 to 1, 0.7 to begin with.
 */
const fixture = fileURLToPath(new URL('../fixtures/registry', import.meta.url));
async function records() {
  return projectPublic((await loadRegistry(fixture)).records);
}
async function info(slug: string) {
  const all = await records();
  return layerInfo(all.find((r) => r.family === 'layer' && r.slug === slug)!, all);
}

describe('layerInfo georef', () => {
  it('shows the map, the transformation, the residual error in metres, the control points and the confidence', async () => {
    expect((await info('overlay-tabula')).georef).toEqual({
      map: { title: 'A fixture map of the frontier', slug: 'fixture-map-frontier' },
      transformation: 'polynomial1',
      residualErrorM: 480,
      controlPoints: 7,
      confidence: 'probable',
    });
  });

  it('has none for a layer that is not a map overlay', async () => {
    expect((await info('frontier-line')).georef).toBeNull();
  });

  it('names no map when the map record is not public, rather than the id of a held one', async () => {
    const all = (await records()).filter((r) => r.family !== 'map');
    const layer = all.find((r) => r.slug === 'overlay-tabula')!;
    const georef = layerInfo(layer, all).georef;
    expect(georef?.map).toBeNull();
    expect(JSON.stringify(georef)).not.toContain('map-000001');
  });
});

describe('overlay opacity', () => {
  it('begins at 0.7', () => {
    expect(DEFAULT_OVERLAY_OPACITY).toBe(0.7);
  });

  it('is kept between 0 and 1', () => {
    expect(clampOpacity(-0.2)).toBe(0);
    expect(clampOpacity(0)).toBe(0);
    expect(clampOpacity(0.42)).toBe(0.42);
    expect(clampOpacity(1)).toBe(1);
    expect(clampOpacity(3)).toBe(1);
  });

  it('falls back to the default for something that is not a number', () => {
    expect(clampOpacity(Number.NaN)).toBe(DEFAULT_OVERLAY_OPACITY);
  });
});
