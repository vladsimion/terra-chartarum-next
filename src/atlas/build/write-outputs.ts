import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../../registry/load.js';
import { scanOutput } from '../../registry/leak-scan.js';
import { isPublic } from '../../registry/publication.js';
import { projectPublic } from '../../registry/project.js';
import { STATIC_ASSET_LIMIT_BYTES } from '../../registry/schemas/atlas-values.js';
import type { RegistryRecord } from '../../registry/types.js';
import { applyVocabularies } from '../../registry/vocab-map.js';
import { list, isObject } from '../../registry/values.js';
import { buildIndex } from '../index-data.js';
import { layerInfo } from '../inspector-data.js';
import { buildPlaceIndex } from '../place-index.js';
import { maplibreFiles } from './vendor.js';
import { convertGeoJson, convertPmtiles, type AtlasFailure, type Converted, type LayerSource } from './convert-assets.js';

/*
 * The Atlas build (spec 005 contracts/build-outputs.md): for each public layer, convert its source
 * and write the assets, facet summaries and indexes the page fetches. It reads public records only,
 * fails on any build-time check naming the layer and the feature, and writes nothing unless every
 * check and the leak scan pass. No framework: the Astro integration calls this and nothing else.
 */
export interface AtlasBuildOptions {
  /** The registry root: contains `content/` and `data/`. */
  root: string;
  /** The static output directory the files are written under (`data/...`). */
  outDir: string;
  /** The host's per-file limit; tests lower it. */
  limitBytes?: number;
  /** Where the basemap is read from; tests point it at a file that is not one. */
  basemap?: string;
}

export interface AtlasBuildResult {
  /** Files written, relative to `outDir`. Empty when anything failed. */
  written: string[];
  failures: AtlasFailure[];
}

/** The basemap lives in the repository, not in a registry: it is the site's, so it is found beside this code. */
const BASEMAP_SOURCE = fileURLToPath(new URL('../../../data/basemap/countries.fgb', import.meta.url));
const FLATGEOBUF_MAGIC = [0x66, 0x67, 0x62];
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

async function readIfThere(file: string): Promise<Buffer | null> {
  return readFile(file).catch(() => null);
}

/** Records the build may use: loaded, specialist vocabulary applied (TC-D016), so "public" means what the site means. */
async function loadRecords(root: string): Promise<readonly RegistryRecord[]> {
  const { records, vocabularies } = await loadRegistry(root);
  return applyVocabularies(records, vocabularies);
}

export async function buildAtlas(options: AtlasBuildOptions): Promise<AtlasBuildResult> {
  const limit = options.limitBytes ?? STATIC_ASSET_LIMIT_BYTES;
  const records = await loadRecords(options.root);
  const publicRecords = projectPublic(records);
  const publicIds = new Set(publicRecords.map((r) => r.id));
  const publicPlaces = new Set(publicRecords.filter((r) => r.family === 'place').map((r) => r.id));
  const layers = records.filter((r) => r.family === 'layer' && isPublic(r) && publicIds.has(r.id)).sort((a, b) => compare(text(a.slug), text(b.slug)));

  const failures: AtlasFailure[] = [];
  const files = new Map<string, Uint8Array | string>();

  for (const record of layers) {
    const slug = text(record.slug);
    const source: LayerSource = {
      slug,
      role: text(record.role),
      envelope: text(record.envelope),
      timeMode: text(record.time_mode),
      facets: (Array.isArray(record.facets) ? record.facets : []).filter(isObject).map((f) => ({ property: text(f.property), label: text(f.label), kind: text(f.kind) })),
    };
    const bytes = await readIfThere(path.join(options.root, text(record.asset)));
    if (!bytes) {
      failures.push({ check: 'ATLAS-ASSET-MISSING', layer: slug, message: 'the source named by the layer cannot be read' });
      continue;
    }
    const result = text(record.asset).endsWith('.pmtiles') ? convertPmtiles(source, bytes) : convertGeoJson(source, bytes.toString('utf8'), publicPlaces);
    failures.push(...result.failures);
    const converted: Converted | undefined = result.converted;
    if (!converted) continue;
    if (converted.asset.byteLength > limit) {
      failures.push({ check: 'ATLAS-ASSET-SIZE', layer: slug, message: `the built asset is ${converted.asset.byteLength} bytes, over the host's limit of ${limit}` });
      continue;
    }
    files.set(`data/layers/${slug}.${converted.extension}`, converted.asset);
    const projected = publicRecords.find((r) => r.id === record.id);
    if (projected) files.set(`data/layers/${slug}.info.json`, `${JSON.stringify(layerInfo(projected, publicRecords), null, 2)}\n`);
    if (converted.facets.length > 0) files.set(`data/layers/${slug}.facets.json`, `${JSON.stringify({ facets: converted.facets }, null, 2)}\n`);

    if (record.role === 'map-overlay' && isObject(record.georef)) {
      const annotation = await readIfThere(path.join(options.root, text(record.georef.annotation)));
      let parsed = false;
      if (annotation) {
        try {
          JSON.parse(annotation.toString('utf8'));
          parsed = true;
        } catch {
          parsed = false;
        }
      }
      if (annotation && parsed) files.set(`data/overlays/${slug}.json`, annotation);
      else failures.push({ check: 'ATLAS-OVERLAY-ANNOTATION', layer: slug, message: 'the georeferencing annotation is missing or is not JSON' });
    }
  }

  const basemap = await readIfThere(options.basemap ?? BASEMAP_SOURCE);
  if (basemap) {
    if (!FLATGEOBUF_MAGIC.every((byte, i) => basemap[i] === byte)) failures.push({ check: 'ATLAS-ASSET-MISSING', layer: 'basemap', message: 'the basemap is not a FlatGeobuf file' });
    else if (basemap.byteLength > limit) failures.push({ check: 'ATLAS-ASSET-SIZE', layer: 'basemap', message: `the basemap is ${basemap.byteLength} bytes, over the host's limit of ${limit}` });
    else files.set('data/basemap.fgb', basemap);
  }

  if (failures.length > 0) return { written: [], failures };

  const index = buildIndex(publicRecords);
  files.set('data/atlas-index.json', `${JSON.stringify(index, null, 2)}\n`);
  const historyOf = (family: string) =>
    records
      .filter((r) => r.family === family && publicIds.has(r.id))
      .map((r) => ({ slug: text(r.slug), history: list(r.slug_history) }))
      .sort((a, b) => compare(a.slug, b.slug));
  files.set('data/place-index.json', `${JSON.stringify(buildPlaceIndex(publicRecords), null, 2)}\n`);
  files.set('data/atlas-slugs.json', `${JSON.stringify({ layers: historyOf('layer'), collections: historyOf('collection') }, null, 2)}\n`);

  for (const [name, content] of await maplibreFiles()) files.set(name, content);

  // stage, scan, then keep: a leak removes everything, as the registry's own build does
  const staging = await mkdtemp(path.join(tmpdir(), 'atlas-staging-'));
  try {
    for (const [name, content] of files) {
      await mkdir(path.dirname(path.join(staging, name)), { recursive: true });
      await writeFile(path.join(staging, name), content);
    }
    const leaks = await scanOutput(staging, records, { namedFamilies: ['layer', 'collection', 'place', 'essay'] });
    if (leaks.length > 0) {
      return { written: [], failures: leaks.map((v) => ({ check: 'ATLAS-LEAK' as const, layer: v.file, message: `${v.rule}: ${v.expected}` })) };
    }
    for (const name of files.keys()) {
      await mkdir(path.dirname(path.join(options.outDir, name)), { recursive: true });
      await copyFile(path.join(staging, name), path.join(options.outDir, name));
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return { written: [...files.keys()].sort(), failures: [] };
}
