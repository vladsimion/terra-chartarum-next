import { describe, expect, it } from 'vitest';
import { overviewSvg, type OverviewLayer } from '../../../src/atlas/overview-svg.js';

/*
 * Spec 005 T059 (FR-016, research R6): the no-WebGL overview of a collection's default layers, as a
 * pure projection to SVG. It draws with the contract's patterns, so no layer is told apart by colour
 * alone, and says in text what it shows.
 */
const line = (coordinates: number[][]) => ({ type: 'Feature' as const, geometry: { type: 'LineString', coordinates }, properties: {} });
const polygon = (ring: number[][]) => ({ type: 'Feature' as const, geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} });
const point = (x: number, y: number) => ({ type: 'Feature' as const, geometry: { type: 'Point', coordinates: [x, y] }, properties: {} });
const layer = (title: string, provenance: string, ...features: OverviewLayer['features']): OverviewLayer => ({ title, provenance, features });
const SQUARE = [[20, 44], [28, 44], [28, 48], [20, 48], [20, 44]];

describe('overviewSvg', () => {
  it('is a deterministic SVG with a viewBox, a title and a description', () => {
    const input = [layer('Frontier', 'source_geometry', line([[22, 45], [26, 47]]))];
    const a = overviewSvg('Roman Dacia', input);
    expect(a).toBe(overviewSvg('Roman Dacia', input));
    expect(a).toMatch(/^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 \d+ \d+"/);
    expect(a).toContain('<title>Roman Dacia: overview of the default layers</title>');
    expect(a).toContain('<desc>');
    expect(a).toContain('Frontier');
  });

  it('draws documentary geometry solid, with a solid fill for a polygon', () => {
    const svg = overviewSvg('c', [layer('Province', 'source_geometry', polygon(SQUARE))]);
    expect(svg).toMatch(/<path[^>]*data-class="documentary"[^>]*fill="[^"]*"/);
    expect(svg).not.toMatch(/data-class="documentary"[^>]*stroke-dasharray/);
    expect(svg).toContain('Documentary geometry');
  });

  it('draws a reconstruction dashed and diagonally hatched', () => {
    const svg = overviewSvg('c', [layer('Guess', 'scholarly_reconstruction', polygon(SQUARE))]);
    expect(svg).toMatch(/data-class="reconstruction"[^>]*stroke-dasharray="4 2"/);
    expect(svg).toContain('fill="url(#hatch-diagonal)"');
    expect(svg).toContain('<pattern id="hatch-diagonal"');
  });

  it('draws a generalised layer dash-dot and cross hatched', () => {
    const svg = overviewSvg('c', [layer('Editorial', 'generalized_editorial', polygon(SQUARE))]);
    expect(svg).toMatch(/data-class="generalised"[^>]*stroke-dasharray="4 2 1 2"/);
    expect(svg).toContain('fill="url(#hatch-cross)"');
  });

  it('draws present-day reference thin, dotted, grey and unfilled', () => {
    const svg = overviewSvg('c', [layer('Today', 'modern_reference', polygon(SQUARE))]);
    expect(svg).toMatch(/data-class="reference"[^>]*stroke-dasharray="1 2"[^>]*fill="none"|data-class="reference"[^>]*fill="none"[^>]*stroke-dasharray="1 2"/);
  });

  it('draws a point as a circle', () => {
    expect(overviewSvg('c', [layer('Forts', 'source_geometry', point(24, 46), point(25, 47))])).toMatch(/<circle /);
  });

  it('lists each layer with its pattern in words, for a reader who cannot see the drawing', () => {
    const svg = overviewSvg('c', [layer('Frontier', 'source_geometry', line([[22, 45], [26, 47]])), layer('Guess', 'scholarly_reconstruction', line([[21, 44], [27, 48]]))]);
    expect(svg).toContain('Frontier: Documentary geometry, solid line, solid fill');
    expect(svg).toContain('Guess: Reconstruction, dashed line, diagonal hatching');
  });

  it('escapes text so a title cannot become markup', () => {
    const svg = overviewSvg('A & B <x>', [layer('"Q" <script>', 'source_geometry', line([[22, 45], [26, 47]]))]);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<x>');
    expect(svg).toContain('A &amp; B &lt;x&gt;');
  });

  it('keeps every coordinate inside the viewBox, north up', () => {
    const svg = overviewSvg('c', [layer('L', 'source_geometry', line([[20, 44], [28, 48]]))])!;
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!.map(Number) as [unknown, number, number];
    const d = svg.match(/<path[^>]* d="([^"]+)"/)![1]!;
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(w);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(h);
    // the southern end (44) is lower on the page (larger y) than the northern end (48)
    expect(ys[0]).toBeGreaterThan(ys[1]!);
  });

  it('draws the coastline thin and dotted behind the layers, only where it meets them', () => {
    const near = polygon([[21, 45], [27, 45], [27, 47], [21, 47], [21, 45]]);
    const far = polygon([[100, 10], [101, 10], [101, 11], [100, 10]]);
    const svg = overviewSvg('c', [layer('L', 'source_geometry', line([[20, 44], [28, 48]]))], [near, far])!;
    expect(svg.match(/data-class="coast"/g)).toHaveLength(1);
    expect(svg.indexOf('data-class="coast"')).toBeLessThan(svg.indexOf('data-class="documentary"'));
  });

  it('gives nothing when no layer has geometry to draw', () => {
    expect(overviewSvg('c', [])).toBeNull();
    expect(overviewSvg('c', [layer('Empty', 'source_geometry')])).toBeNull();
  });
});
