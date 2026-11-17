import { describe, expect, it } from 'vitest';
import { axisLabels, radarPoints, ringPolygons, polygonPoints, spokes } from '../../../src/essays/radar.js';

/*
 * Spec 009 T020 (US2, contracts/components.md): the section radar's geometry, the pure part of a
 * component that draws static SVG. Five axes and two series in the essay; the expected values here are
 * worked by hand on four axes in a 200-unit square, where the trigonometry is exact: the centre is at
 * (100, 100), the padding is 0.18 of the size (36) and so the full radius is 64. The first axis points
 * up, the rest clockwise.
 */
describe('radarPoints', () => {
  it('puts the first axis straight up and the others clockwise, at a fraction of the radius', () => {
    expect(radarPoints([1, 1, 1, 1], 200)).toEqual([
      { x: 100, y: 36 },
      { x: 164, y: 100 },
      { x: 100, y: 164 },
      { x: 36, y: 100 },
    ]);
  });

  it('places a value as that fraction of the radius from the centre', () => {
    expect(radarPoints([0.5, 0.25, 0, 0.75], 200)).toEqual([
      { x: 100, y: 68 },
      { x: 116, y: 100 },
      { x: 100, y: 100 },
      { x: 52, y: 100 },
    ]);
  });

  it('scales with the size: the same shares in a 400-unit square are twice as far out', () => {
    expect(radarPoints([1, 0, 0, 0], 400)).toEqual([{ x: 200, y: 72 }, { x: 200, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 200 }]);
  });

  it('refuses a value outside 0 to 1, so a mistyped score cannot run off the chart', () => {
    expect(() => radarPoints([1.2, 0, 0, 0], 200)).toThrow(/between 0 and 1/);
    expect(() => radarPoints([-0.1, 0, 0, 0], 200)).toThrow(/between 0 and 1/);
  });

  it('refuses fewer than three axes', () => {
    expect(() => radarPoints([1, 1], 200)).toThrow(/at least three axes/);
  });
});

describe('polygonPoints', () => {
  it('writes the points as an SVG polygon list, two decimals at most', () => {
    expect(polygonPoints(radarPoints([1, 1, 1], 200))).toBe('100,36 155.43,132 44.57,132');
  });
});

describe('ringPolygons', () => {
  it('gives one polygon per ring, the outermost at the full radius', () => {
    const rings = ringPolygons(2, 4, 200);
    expect(rings).toHaveLength(2);
    expect(rings[1]).toBe(polygonPoints(radarPoints([1, 1, 1, 1], 200)));
    expect(rings[0]).toBe(polygonPoints(radarPoints([0.5, 0.5, 0.5, 0.5], 200)));
  });
});

describe('spokes', () => {
  it('draws one line from the centre to each axis at the full radius', () => {
    expect(spokes(4, 200)).toEqual([
      { x1: 100, y1: 100, x2: 100, y2: 36 },
      { x1: 100, y1: 100, x2: 164, y2: 100 },
      { x1: 100, y1: 100, x2: 100, y2: 164 },
      { x1: 100, y1: 100, x2: 36, y2: 100 },
    ]);
  });
});

describe('axisLabels', () => {
  const labels = axisLabels(['North', 'East', 'South', 'West'], 200);

  it('sets each label outside the outer ring, in the axis order', () => {
    expect(labels.map((l) => l.text)).toEqual(['North', 'East', 'South', 'West']);
    expect(labels[0]!.y).toBeLessThan(36);
    expect(labels[2]!.y).toBeGreaterThan(164);
    expect(labels[1]!.x).toBeGreaterThan(164);
    expect(labels[3]!.x).toBeLessThan(36);
  });

  it('anchors a label by the side it sits on, so no label is cut off', () => {
    expect(labels.map((l) => l.anchor)).toEqual(['middle', 'start', 'middle', 'end']);
  });
});
