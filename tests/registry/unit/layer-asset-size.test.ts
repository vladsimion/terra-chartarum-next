import { describe, expect, it } from 'vitest';
import { STATIC_ASSET_LIMIT_BYTES } from '../../../src/registry/schemas/atlas-values.js';
import { hitsOf, validLayer } from '../support/atlas.js';

/*
 * Spec 005 T014 (FR-006): `LAYER-ASSET-SIZE`. The registry stays pure, so sizes come in through
 * the options as an injected reader's result (the loader reads the files).
 */
const sizes = (bytes: number) => ({ assetSizes: new Map([['data/layers/layer-1.geojson', bytes]]) });

describe('LAYER-ASSET-SIZE', () => {
  it('uses the 25 MiB limit that Cloudflare documents for one static asset', () => {
    expect(STATIC_ASSET_LIMIT_BYTES).toBe(25 * 1024 * 1024);
  });

  it('fails a source one byte over the limit, and names the file and the limit', () => {
    const found = hitsOf('LAYER-ASSET-SIZE', [validLayer()], sizes(STATIC_ASSET_LIMIT_BYTES + 1));
    expect(found.map((v) => [v.field, v.severity, v.value])).toEqual([['asset', 'error', STATIC_ASSET_LIMIT_BYTES + 1]]);
    expect(found[0]?.expected).toContain('25 MiB');
  });

  it('passes a source exactly at the limit, and an empty one', () => {
    expect(hitsOf('LAYER-ASSET-SIZE', [validLayer()], sizes(STATIC_ASSET_LIMIT_BYTES))).toEqual([]);
    expect(hitsOf('LAYER-ASSET-SIZE', [validLayer()], sizes(0))).toEqual([]);
  });

  it('is an error at every lifecycle', () => {
    for (const lifecycle of ['proposed', 'researching', 'published']) {
      const found = hitsOf('LAYER-ASSET-SIZE', [validLayer(1, { lifecycle })], sizes(STATIC_ASSET_LIMIT_BYTES + 1));
      expect(found.map((v) => v.severity)).toEqual(['error']);
    }
  });

  it('judges nothing without sizes, or for a source whose size is not known', () => {
    expect(hitsOf('LAYER-ASSET-SIZE', [validLayer()])).toEqual([]);
    expect(hitsOf('LAYER-ASSET-SIZE', [validLayer()], { assetSizes: new Map() })).toEqual([]);
  });
});
