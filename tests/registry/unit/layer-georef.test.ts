import { describe, expect, it } from 'vitest';
import { GEOREF, atLifecycle, atlasNeighbours, validLayer, validOverlay } from '../support/atlas.js';

/*
 * Spec 005 T012 (FR-019): `LAYER-GEOREF`. Warns below ready_for_build, errors from it, so a draft
 * overlay can be registered before its georeferencing is done.
 */
const georef = (over: Record<string, unknown>) => ({ ...GEOREF, ...over });
const fields = (subject = validOverlay(), lifecycle = 'ready_for_build') => atLifecycle('LAYER-GEOREF', lifecycle, subject).map((v) => v.field);
const overlayWith = (over: Record<string, unknown>) => validOverlay(1, { georef: georef(over) });

describe('LAYER-GEOREF', () => {
  it('accepts a complete overlay, and a layer of another role with none', () => {
    expect(fields()).toEqual([]);
    expect(fields(validLayer())).toEqual([]);
  });

  it('flags an overlay without georef', () => {
    expect(fields(validOverlay(1, { georef: undefined }))).toEqual(['georef']);
  });

  it('flags georef on a layer of another role', () => {
    expect(fields(validLayer(1, { georef: georef({}) }))).toEqual(['georef']);
  });

  it('flags each missing part', () => {
    for (const part of ['map', 'annotation', 'transformation', 'residual_error_m', 'control_points', 'confidence']) {
      expect(fields(overlayWith({ [part]: undefined })), part).toEqual([`georef.${part}`]);
    }
  });

  it('flags a map that does not resolve, or is not a map', () => {
    expect(fields(overlayWith({ map: 'tc:tc:map:map-000099' }))).toEqual(['georef.map']);
    expect(fields(overlayWith({ map: 'tc:tc:dataset:dataset-000001' }))).toEqual(['georef.map']);
  });

  it('flags a negative residual error, fewer than three control points, and values outside their sets', () => {
    expect(fields(overlayWith({ residual_error_m: -1 }))).toEqual(['georef.residual_error_m']);
    expect(fields(overlayWith({ residual_error_m: 0 }))).toEqual([]);
    expect(fields(overlayWith({ control_points: 2 }))).toEqual(['georef.control_points']);
    expect(fields(overlayWith({ control_points: 3 }))).toEqual([]);
    expect(fields(overlayWith({ control_points: 3.5 }))).toEqual(['georef.control_points']);
    expect(fields(overlayWith({ transformation: 'affine' }))).toEqual(['georef.transformation']);
    expect(fields(overlayWith({ confidence: 'certain' }))).toEqual(['georef.confidence']);
    for (const transformation of ['polynomial1', 'polynomial2', 'polynomial3', 'helmert', 'projective', 'thin-plate-spline']) {
      expect(fields(overlayWith({ transformation })), transformation).toEqual([]);
    }
  });

  it('flags an overlay that is timed per feature', () => {
    expect(fields(validOverlay(1, { time_mode: 'per_feature' }))).toEqual(['time_mode']);
  });

  it('is a warning before ready_for_build and an error from it', () => {
    const subject = validOverlay(1, { georef: undefined });
    expect(atLifecycle('LAYER-GEOREF', 'researching', subject).map((v) => v.severity)).toEqual(['warning']);
    expect(atLifecycle('LAYER-GEOREF', 'ready_for_build', subject).map((v) => v.severity)).toEqual(['error']);
  });

  it('judges an overlay whose neighbours are missing only on the map', () => {
    expect(atLifecycle('LAYER-GEOREF', 'ready_for_build', validOverlay(), []).map((v) => v.field)).toEqual(['georef.map']);
    expect(atlasNeighbours().length).toBeGreaterThan(0);
  });
});
