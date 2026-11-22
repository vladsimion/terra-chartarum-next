import { describe, expect, it } from 'vitest';
import { diffFingerprint, fingerprint } from '../../src/linkcheck/manifest.js';

/*
 * Spec 010 T046 (FR-017, research R8 "Manifests"): a manifest's fingerprint is its sorted canvas
 * ids and their count, read from IIIF Presentation 3 `items` or 2 `sequences[0].canvases`.
 */
const v3 = (ids: string[]) => ({
  '@context': 'http://iiif.io/api/presentation/3/context.json',
  id: 'https://iiif.example.org/m/manifest.json',
  type: 'Manifest',
  items: ids.map((id) => ({ id, type: 'Canvas', height: 10, width: 10 })),
});

const v2 = (ids: string[]) => ({
  '@context': 'http://iiif.io/api/presentation/2/context.json',
  '@id': 'https://iiif.example.org/m/manifest.json',
  '@type': 'sc:Manifest',
  sequences: [{ '@type': 'sc:Sequence', canvases: ids.map((id) => ({ '@id': id, '@type': 'sc:Canvas' })) }],
});

describe('fingerprint', () => {
  it('reads Presentation 3 canvases, sorted, with their count', () => {
    expect(fingerprint(v3(['c/2', 'c/1']))).toEqual({ canvases: ['c/1', 'c/2'], count: 2 });
  });

  it('reads Presentation 2 canvases', () => {
    expect(fingerprint(v2(['c/1', 'c/3']))).toEqual({ canvases: ['c/1', 'c/3'], count: 2 });
  });

  it('throws on something that is not a manifest', () => {
    expect(() => fingerprint({ hello: 'world' })).toThrow(/not an IIIF manifest/);
  });
});

describe('diffFingerprint', () => {
  const before = fingerprint(v3(['c/1', 'c/2']));

  it('sees no change when the canvases are only reordered', () => {
    expect(diffFingerprint(before, fingerprint(v3(['c/2', 'c/1'])))).toEqual({ changed: false, added: [], removed: [], countBefore: 2, countAfter: 2 });
  });

  it('sees a canvas added', () => {
    expect(diffFingerprint(before, fingerprint(v3(['c/1', 'c/2', 'c/3'])))).toEqual({ changed: true, added: ['c/3'], removed: [], countBefore: 2, countAfter: 3 });
  });

  it('sees an id changed as one removed and one added', () => {
    expect(diffFingerprint(before, fingerprint(v2(['c/1', 'c/2b'])))).toEqual({ changed: true, added: ['c/2b'], removed: ['c/2'], countBefore: 2, countAfter: 2 });
  });
});
