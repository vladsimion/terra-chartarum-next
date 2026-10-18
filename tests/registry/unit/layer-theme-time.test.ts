import { describe, expect, it } from 'vitest';
import { atLifecycle, validLayer } from '../support/atlas.js';

/*
 * Spec 005 T008 (FR-001, FR-013): `LAYER-THEME` and `LAYER-TIME`. Both say nothing before
 * ready_for_build, warn from it, and are errors from publishable.
 */
const severities = (rule: string, lifecycle: string, over = {}) => atLifecycle(rule, lifecycle, validLayer(1, over)).map((v) => v.severity);

describe('LAYER-THEME', () => {
  it('accepts each of the seven themes', () => {
    for (const theme of [
      'territories-boundaries',
      'networks-circulation',
      'places-settlements',
      'names-peoples-attestations',
      'conflict-campaigns-frontiers',
      'cartographic-evidence',
      'historical-map-overlays',
    ]) {
      expect(atLifecycle('LAYER-THEME', 'publishable', validLayer(1, { theme }))).toEqual([]);
    }
  });

  it('flags a theme outside the seven, and a missing one', () => {
    const wrong = atLifecycle('LAYER-THEME', 'publishable', validLayer(1, { theme: 'Territories' }));
    expect(wrong.map((v) => [v.field, v.value])).toEqual([['theme', 'Territories']]);
    expect(atLifecycle('LAYER-THEME', 'publishable', validLayer(1, { theme: undefined })).map((v) => v.field)).toEqual(['theme']);
  });

  it('says nothing while the layer is being researched, warns at ready_for_build, errors at publishable', () => {
    expect(severities('LAYER-THEME', 'researching', { theme: undefined })).toEqual([]);
    expect(severities('LAYER-THEME', 'ready_for_build', { theme: undefined })).toEqual(['warning']);
    expect(severities('LAYER-THEME', 'publishable', { theme: undefined })).toEqual(['error']);
  });
});

describe('LAYER-TIME', () => {
  const fields = (over: Record<string, unknown>) => atLifecycle('LAYER-TIME', 'publishable', validLayer(1, over)).map((v) => v.field);

  it('accepts an interval of signed four-digit years and both time modes', () => {
    expect(fields({ envelope: '-0106/0271' })).toEqual([]);
    expect(fields({ envelope: '0106/0271', time_mode: 'envelope_only' })).toEqual([]);
    expect(fields({ envelope: '159X/1602' })).toEqual([]);
  });

  it('flags a malformed envelope', () => {
    expect(fields({ envelope: '0106' })).toEqual(['envelope']);
    expect(fields({ envelope: 'about 1400' })).toEqual(['envelope']);
    expect(fields({ envelope: '0106/' })).toEqual(['envelope']);
    expect(fields({ envelope: '0106/0271/0300' })).toEqual(['envelope']);
  });

  it('flags a reversed envelope, reading the earliest start and the latest end', () => {
    expect(fields({ envelope: '0271/0106' })).toEqual(['envelope']);
    expect(fields({ envelope: '159X/1595' })).toEqual([]);
  });

  it('flags a missing envelope and a missing or unknown time mode', () => {
    expect(fields({ envelope: undefined })).toEqual(['envelope']);
    expect(fields({ time_mode: undefined })).toEqual(['time_mode']);
    expect(fields({ time_mode: 'sometimes' })).toEqual(['time_mode']);
  });

  it('says nothing while the layer is being researched, warns at ready_for_build, errors at publishable', () => {
    expect(severities('LAYER-TIME', 'verified', { envelope: undefined })).toEqual([]);
    expect(severities('LAYER-TIME', 'ready_for_build', { envelope: undefined })).toEqual(['warning']);
    expect(severities('LAYER-TIME', 'publishable', { envelope: undefined })).toEqual(['error']);
  });

  it('ignores other families', () => {
    expect(atLifecycle('LAYER-TIME', 'publishable', { ...validLayer(), family: 'place', envelope: 'x' })).toEqual([]);
  });
});
