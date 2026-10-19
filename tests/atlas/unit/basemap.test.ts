import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geojson } from 'flatgeobuf';
import { describe, expect, it } from 'vitest';

/*
 * Spec 005 FR-017 (research R11): the basemap is Natural Earth country polygons, self-hosted and
 * public domain, committed as FlatGeobuf with a note of where it came from and how to rebuild it.
 */
const file = (name: string) => fileURLToPath(new URL(`../../../data/basemap/${name}`, import.meta.url));

async function features() {
  const out: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[] = [];
  for await (const f of geojson.deserialize(new Uint8Array(readFileSync(file('countries.fgb'))))) out.push(f as never);
  return out;
}

describe('data/basemap/countries.fgb', () => {
  it('is a FlatGeobuf small enough to fetch when the map opens', () => {
    const bytes = readFileSync(file('countries.fgb'));
    expect([...bytes.subarray(0, 3)]).toEqual([0x66, 0x67, 0x62]);
    // the map is interactive within 4 s on a phone (SC-001); this file is fetched and parsed before then
    expect(statSync(file('countries.fgb')).size).toBeLessThan(250 * 1024);
  });

  it('keeps every country whole enough to draw: closed rings of at least four points', async () => {
    for (const f of await features()) {
      const polygons = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
      expect(polygons.length, String(f.properties.name)).toBeGreaterThan(0);
      for (const polygon of polygons) {
        for (const ring of polygon) {
          expect(ring.length, String(f.properties.name)).toBeGreaterThanOrEqual(4);
          expect(ring[0], String(f.properties.name)).toEqual(ring[ring.length - 1]);
        }
      }
    }
  });

  it('holds the countries around the Roman Dacia anchor, named, and nothing far outside the region', async () => {
    const all = await features();
    const names = all.map((f) => f.properties.name);
    for (const name of ['Romania', 'Bulgaria', 'Hungary', 'Serbia', 'Ukraine', 'Italy']) expect(names, name).toContain(name);
    expect(all.length).toBeGreaterThan(40);
    expect(names).not.toContain('Australia');
  });

  it('carries only a name per country', async () => {
    for (const f of await features()) expect(Object.keys(f.properties)).toEqual(['name']);
  });

  it('draws Romania around Alba Iulia (23.57, 46.07)', async () => {
    const romania = (await features()).find((f) => f.properties.name === 'Romania')!;
    const polygons = (romania.geometry.type === 'Polygon' ? [romania.geometry.coordinates] : romania.geometry.coordinates) as number[][][][];
    const inside = polygons.some(([ring]) => {
      let c = false;
      for (let i = 0, j = ring!.length - 1; i < ring!.length; j = i++) {
        const [xi, yi] = ring![i]!;
        const [xj, yj] = ring![j]!;
        if (yi! > 46.07 !== yj! > 46.07 && 23.57 < ((xj! - xi!) * (46.07 - yi!)) / (yj! - yi!) + xi!) c = !c;
      }
      return c;
    });
    expect(inside).toBe(true);
  });

  it('says where it comes from, under what terms, and how to rebuild it', () => {
    const note = readFileSync(file('README.md'), 'utf8');
    expect(note).toMatch(/Natural Earth/);
    expect(note).toMatch(/public domain/i);
    expect(note).toMatch(/ne_50m_admin_0_countries/);
    expect(note).toMatch(/v5\.1\.2/);
    expect(note).toMatch(/scripts\/build-basemap\.ts/);
    expect(note).toMatch(/simplif/i);
  });
});
