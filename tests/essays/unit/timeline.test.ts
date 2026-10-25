import { describe, expect, it } from 'vitest';
import { axisPositions, axisPosition } from '../../../src/essays/timeline.js';

/*
 * Spec 009 T012: the Timeline's axis compresses the years with a square root so the recent centuries
 * are not squeezed against the right edge. The positions are fractions of the axis, 0 at `from` and
 * 1 at `to`, and the expected values below are worked by hand, not recomputed with the function's own formula.
 */
describe('the timeline axis', () => {
  it('puts from at 0 and to at 1', () => {
    expect(axisPosition(150, 150, 2026)).toBe(0);
    expect(axisPosition(2026, 150, 2026)).toBe(1);
  });

  it('is monotonic across the years', () => {
    const years = [150, 300, 1000, 1311, 1500, 1769, 1835, 2026];
    const positions = years.map((y) => axisPosition(y, 150, 2026));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('compresses the later years: the midpoint year sits past the midpoint of the axis', () => {
    // sqrt compression measured from the end: years near `to` take more room, so the half-way year is left of 0.5
    expect(axisPosition(1088, 150, 2026)).toBeLessThan(0.5);
    // a worked value: from 0 to 100, year 25 is sqrt(25/100) = 0.5 along the axis
    expect(axisPosition(25, 0, 100)).toBeCloseTo(0.5, 10);
    // and year 81 is sqrt(0.81) = 0.9
    expect(axisPosition(81, 0, 100)).toBeCloseTo(0.9, 10);
  });

  it('clamps a year outside the range to the ends', () => {
    expect(axisPosition(100, 150, 2026)).toBe(0);
    expect(axisPosition(2100, 150, 2026)).toBe(1);
  });

  it('refuses an empty or reversed range', () => {
    expect(() => axisPosition(10, 100, 100)).toThrow(/from must be before to/);
    expect(() => axisPosition(10, 200, 100)).toThrow(/from must be before to/);
  });

  it('gives each event a position, in the order given', () => {
    const events = [
      { year: 150, label: 'Ptolemy', href: '#a' },
      { year: 1769, label: 'Josephine Survey', href: '#b' },
      { year: 2026, label: 'Now', href: '#c' },
    ];
    const placed = axisPositions(events, 150, 2026);
    expect(placed.map((e) => e.label)).toEqual(['Ptolemy', 'Josephine Survey', 'Now']);
    expect(placed[0]!.position).toBe(0);
    expect(placed[2]!.position).toBe(1);
    expect(placed[1]!.position).toBeGreaterThan(0);
    expect(placed[1]!.position).toBeLessThan(1);
  });
});
