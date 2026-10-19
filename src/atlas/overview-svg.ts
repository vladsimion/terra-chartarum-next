import { lineDash, styleFor, type StyleClass } from './provenance-style.js';

/*
 * The overview a reader gets without WebGL (spec 005 FR-016, research R6): a collection's default
 * layers projected to SVG by a pure function, so the build needs no browser and the same input
 * always gives the same bytes. It uses the map's own patterns (provenance-style.ts), so a layer is
 * told apart by line and fill, never by colour alone, and it says in text what it shows.
 */
export interface OverviewFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties?: Record<string, unknown> | null;
}

export interface OverviewLayer {
  title: string;
  /** The layer's geometry provenance. */
  provenance: string;
  features: readonly OverviewFeature[];
}

const WIDTH = 800;
const MAX_HEIGHT = 800;
const MIN_HEIGHT = 240;
const PAD = 16;
const INK = '#2b2b2b';
const GROUND = '#f4efe3';

type Position = [number, number];
type Box = [number, number, number, number];

const escapeText = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round = (n: number): number => Math.round(n * 10) / 10;

/** Every [lon, lat] in a coordinates value, however deeply nested. */
function positions(value: unknown, out: Position[] = []): Position[] {
  if (!Array.isArray(value)) return out;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') out.push([value[0], value[1]]);
  else for (const part of value) positions(part, out);
  return out;
}

function boxOf(features: readonly OverviewFeature[]): Box | null {
  let box: Box | null = null;
  for (const feature of features) {
    for (const [x, y] of positions(feature.geometry.coordinates)) box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
  }
  return box;
}

const meets = (a: Box, b: Box): boolean => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** The patterns, in words, of a layer's class: "Documentary geometry, solid line, solid fill". */
const describe = (cls: StyleClass): string => `${cls.label}, ${cls.description}`;

const HATCH = {
  'diagonal-hatch': '<pattern id="hatch-diagonal" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#2b2b2b" stroke-width="1.5"/></pattern>',
  'cross-hatch': '<pattern id="hatch-cross" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H6M0 0V6" stroke="#2b2b2b" stroke-width="1"/></pattern>',
} as const;

function fillFor(cls: StyleClass): string {
  if (cls.fill === 'solid') return `fill="${INK}" fill-opacity="0.35"`;
  if (cls.fill === 'diagonal-hatch') return 'fill="url(#hatch-diagonal)"';
  if (cls.fill === 'cross-hatch') return 'fill="url(#hatch-cross)"';
  return 'fill="none"';
}

/**
 * The SVG for a collection's default layers, or null when none has geometry to draw. `coast` is
 * the present-day outline, drawn thin and dotted behind them wherever it meets them.
 */
export function overviewSvg(collectionTitle: string, layers: readonly OverviewLayer[], coast: readonly OverviewFeature[] = []): string | null {
  const drawn = layers.filter((l) => l.features.length > 0);
  const box = boxOf(drawn.flatMap((l) => l.features));
  if (!box) return null;

  // equirectangular, with longitude shortened by the cosine of the middle latitude
  const k = Math.cos((((box[1] + box[3]) / 2) * Math.PI) / 180);
  const spanX = Math.max((box[2] - box[0]) * k, 1e-6);
  const spanY = Math.max(box[3] - box[1], 1e-6);
  const scale = Math.min((WIDTH - 2 * PAD) / spanX, (MAX_HEIGHT - 2 * PAD) / spanY);
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, spanY * scale + 2 * PAD)));
  const project = ([x, y]: Position): Position => [round(PAD + (x - box[0]) * k * scale), round(PAD + (box[3] - y) * scale)];

  /** Path data: runs thinned to about a pixel, so a detailed coastline stays small. */
  const run = (ring: unknown, close: boolean): string => {
    const kept: Position[] = [];
    for (const p of positions(ring).map(project)) {
      const last = kept[kept.length - 1];
      if (!last || Math.abs(p[0] - last[0]) >= 1 || Math.abs(p[1] - last[1]) >= 1) kept.push(p);
    }
    if (kept.length < 2) return '';
    return `M${kept.map(([x, y]) => `${x} ${y}`).join('L')}${close ? 'Z' : ''}`;
  };
  const pathData = (geometry: OverviewFeature['geometry']): string => {
    const c = geometry.coordinates;
    switch (geometry.type) {
      case 'LineString':
        return run(c, false);
      case 'MultiLineString':
        return (c as unknown[]).map((l) => run(l, false)).join('');
      case 'Polygon':
        return (c as unknown[]).map((r) => run(r, true)).join('');
      case 'MultiPolygon':
        return (c as unknown[][]).flatMap((p) => p.map((r) => run(r, true))).join('');
      default:
        return '';
    }
  };

  const used = new Set<string>();
  const body: string[] = [];
  const notes: string[] = [];

  const near = coast.filter((f) => {
    const b = boxOf([f]);
    return b !== null && meets(b, box);
  });
  for (const feature of near) {
    const d = pathData(feature.geometry);
    if (d) body.push(`<path data-class="coast" d="${d}" fill="none" stroke="#777" stroke-width="1" stroke-dasharray="${lineDash('dotted').join(' ')}"/>`);
  }

  for (const layer of drawn) {
    const cls = styleFor(layer.provenance) ?? styleFor('source_geometry')!;
    notes.push(`${layer.title}: ${describe(cls)}`);
    if (cls.fill === 'diagonal-hatch' || cls.fill === 'cross-hatch') used.add(cls.fill);
    const dash = lineDash(cls.line);
    const dashAttr = dash.length > 0 ? ` stroke-dasharray="${dash.join(' ')}"` : '';
    const stroke = `stroke="${cls.thin ? '#777' : INK}" stroke-width="${cls.thin ? 1 : 2}"${dashAttr}`;
    for (const feature of layer.features) {
      if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
        const points = feature.geometry.type === 'Point' ? [feature.geometry.coordinates] : (feature.geometry.coordinates as unknown[]);
        for (const p of points) {
          const [x, y] = project(p as Position);
          body.push(`<circle data-class="${cls.id}" cx="${x}" cy="${y}" r="${cls.thin ? 3 : 5}" fill="${cls.id === 'documentary' ? INK : 'none'}" stroke="${cls.thin ? '#777' : INK}" stroke-width="2"/>`);
        }
        continue;
      }
      const d = pathData(feature.geometry);
      if (d) body.push(`<path data-class="${cls.id}" d="${d}" ${fillFor(cls)} ${stroke}/>`);
    }
  }

  const title = `${escapeText(collectionTitle)}: overview of the default layers`;
  const desc = `A simplified outline map. ${notes.map(escapeText).join('. ')}.`;
  const defs = used.size > 0 ? `<defs>${[...used].map((id) => HATCH[id as keyof typeof HATCH]).join('')}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" role="img"><title>${title}</title><desc>${desc}</desc>${defs}<rect width="${WIDTH}" height="${height}" fill="${GROUND}"/>${body.join('')}</svg>\n`;
}
