import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

/*
 * MapLibre is served as it ships, not bundled (spec 005 research R7). Its worker is found beside
 * the main file and imports the shared code beside it, so a bundler that hashes and splits the files
 * breaks it; served from one folder, both the page and the worker fetch the shared code once.
 */
export const MAPLIBRE_FILES = ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css'] as const;




/** The files, by their output path, read from the installed package. */
export async function maplibreFiles(): Promise<Map<string, Buffer>> {
  const dist = path.join(path.dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')), 'dist');
  const files = new Map<string, Buffer>();
  for (const name of MAPLIBRE_FILES) files.set(`vendor/maplibre/${name}`, await readFile(path.join(dist, name)));
  return files;
}
