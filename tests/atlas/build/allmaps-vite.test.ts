import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repairAllmapsImport } from '../../../src/atlas/build/allmaps-vite.js';

/*
 * Spec 005 T056: the pinned @allmaps/maplibre imports MapLibre's event class from a path that is
 * not in its package. The repair points it at the MapLibre the Atlas serves, and MapLibre exports
 * that class under the name the repair uses.
 */
const plugin = readFileSync(path.join(path.dirname(createRequire(import.meta.url).resolve('@allmaps/maplibre')), 'WarpedMapLayer.js'), 'utf8');

describe('repairAllmapsImport', () => {
  it('replaces the import that is not in the package', () => {
    expect(plugin).toMatch(/\.pnpm\/maplibre-gl@/);
    const repaired = repairAllmapsImport(plugin);
    expect(repaired).not.toMatch(/\.pnpm\//);
    expect(repaired).toContain('import { Event as Fn } from "/vendor/maplibre/maplibre-gl.mjs";');
  });

  it('leaves code without that import as it is', () => {
    expect(repairAllmapsImport('import { x } from "y";')).toBe('import { x } from "y";');
  });

  it('names a class MapLibre exports', () => {
    const maplibre = readFileSync(path.join(path.dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')), 'dist/maplibre-gl.mjs'), 'utf8');
    expect(maplibre).toMatch(/\bEt as Event\b|\bEvent,|\bas Event\b/);
  });
});
