import { readFile, writeFile } from 'node:fs/promises';
import { serializeFeatures } from '../src/atlas/build/flatgeobuf.js';

/*
 * Builds data/basemap/countries.fgb from Natural Earth's 50 m admin-0 countries (GeoJSON, tag
 * v5.1.2): the countries and parts of countries that touch the Atlas region, a name each,
 * coordinates rounded to 0.01 degree (about a kilometre) and consecutive repeats dropped. Usage:
 *   tsx scripts/build-basemap.ts <ne_50m_admin_0_countries.geojson> [out.fgb]
 * See data/basemap/README.md.
 */
const REGION = { west: -25, south: 20, east: 65, north: 65 };

type Ring = [number, number][];
type Polygon = Ring[];

const round = (n: number) => Math.round(n * 100) / 100;

function cleanRing(ring: Ring): Ring {
  const out: Ring = [];
  for (const [x, y] of ring) {
    const point: [number, number] = [round(x), round(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  return out;
}

const touchesRegion = (ring: Ring): boolean => {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return Math.max(...xs) >= REGION.west && Math.min(...xs) <= REGION.east && Math.max(...ys) >= REGION.south && Math.min(...ys) <= REGION.north;
};

function polygonsOf(geometry: { type: string; coordinates: unknown }): Polygon[] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as Polygon];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Polygon[];
  return [];
}

const [input, output = 'data/basemap/countries.fgb'] = process.argv.slice(2);
if (!input) {
  console.error('usage: tsx scripts/build-basemap.ts <ne_50m_admin_0_countries.geojson> [out.fgb]');
  process.exit(2);
}
const source = JSON.parse(await readFile(input, 'utf8')) as { features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[] };

const features = source.features
  .map((f) => {
    const polygons = polygonsOf(f.geometry)
      .filter((polygon) => polygon[0] && touchesRegion(polygon[0]))
      .map((polygon) => polygon.map(cleanRing).filter((ring) => ring.length >= 4))
      .filter((polygon) => polygon.length > 0);
    const geometry = polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons };
    return { type: 'Feature' as const, properties: { name: String(f.properties.NAME ?? f.properties.ADMIN ?? '') }, geometry, count: polygons.length };
  })
  .filter((f) => f.count > 0 && f.properties.name !== '')
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name));

await writeFile(output, serializeFeatures(features.map(({ count: _count, ...f }) => f)));
console.log(`wrote ${features.length} countries to ${output}`);
