import { describe, expect, it } from 'vitest';
import { axisPosition, axisPositions } from '../../../src/essays/timeline.js';

/*
 * Spec 009 T012: the Timeline's axis compresses the years with a square root measured from the most
 * recent year (the legacy AdaptiveTimeline, ported unchanged: FR-007), so the recent centuries take more
 * room than the ancient ones. A position is a fraction of the axis, 0 at `from` and 1 at `to`. The
 * expected values are worked by hand from the legacy formula, 1 - sqrt(1 - linear), not recomputed.
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

  it('compresses the early years: the half-way year sits left of the middle of the axis', () => {
    expect(axisPosition(1088, 150, 2026)).toBeLessThan(0.5);
    // worked from the legacy formula on 0 to 100: year 75 is 1 - sqrt(1 - 0.75) = 0.5 along the axis
    expect(axisPosition(75, 0, 100)).toBeCloseTo(0.5, 10);
    // and year 96 is 1 - sqrt(0.04) = 0.8
    expect(axisPosition(96, 0, 100)).toBeCloseTo(0.8, 10);
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
