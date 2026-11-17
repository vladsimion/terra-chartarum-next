/*
 * The section radar's geometry (spec 009, contracts/components.md): where each axis, ring, spoke and
 * label sits in a square of a given size. Pure, so the shape of the chart is tested without a browser
 * and the component only prints it. Values are shares of an axis, 0 to 1 (the legacy radar's scale,
 * ported unchanged); the first axis points up and the rest follow clockwise.
 */
export interface RadarPoint {
  x: number;
  y: number;
}

export interface Spoke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface AxisLabel {
  text: string;
  x: number;
  y: number;
  /** The SVG `text-anchor` that keeps the label inside the square. */
  anchor: 'start' | 'middle' | 'end';
}

/** Room outside the outer ring for the axis labels, as a share of the size. */
const PAD = 0.18;
/** How far into that room a label sits. */
const LABEL = 0.55;
/** A label this close to the vertical centre line reads best centred. */
const CENTRED = 4;

const round = (value: number): number => Number(value.toFixed(2));

const geometry = (size: number) => {
  const centre = size / 2;
  return { centre, radius: centre - size * PAD, pad: size * PAD };
};

/** The angle of axis `index` of `count`, in radians, from straight up and clockwise. */
const angle = (index: number, count: number): number => ((-90 + (index * 360) / count) * Math.PI) / 180;

function point(index: number, count: number, value: number, size: number): RadarPoint {
  const { centre, radius } = geometry(size);
  return { x: round(centre + radius * value * Math.cos(angle(index, count))), y: round(centre + radius * value * Math.sin(angle(index, count))) };
}

export function radarPoints(values: readonly number[], size: number): RadarPoint[] {
  if (values.length < 3) throw new Error(`radar: a chart needs at least three axes, got ${values.length}`);
  return values.map((value, i) => {
    if (!(value >= 0 && value <= 1)) throw new Error(`radar: every value must be a share between 0 and 1, got ${value} on axis ${i + 1}`);
    return point(i, values.length, value, size);
  });
}

export function polygonPoints(points: readonly RadarPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/** One polygon per ring, from the innermost to the outer ring at the full radius. */
export function ringPolygons(rings: number, axes: number, size: number): string[] {
  return Array.from({ length: rings }, (_, k) => polygonPoints(radarPoints(Array.from({ length: axes }, () => (k + 1) / rings), size)));
}

export function spokes(axes: number, size: number): Spoke[] {
  const { centre } = geometry(size);
  return radarPoints(Array.from({ length: axes }, () => 1), size).map((p) => ({ x1: centre, y1: centre, x2: p.x, y2: p.y }));
}

export function axisLabels(labels: readonly string[], size: number): AxisLabel[] {
  const { centre, radius, pad } = geometry(size);
  const out = radius + pad * LABEL;
  return labels.map((text, i) => {
    const x = round(centre + out * Math.cos(angle(i, labels.length)));
    const y = round(centre + out * Math.sin(angle(i, labels.length)));
    const anchor = Math.abs(x - centre) < CENTRED ? 'middle' : x > centre ? 'start' : 'end';
    return { text, x, y, anchor };
  });
}
