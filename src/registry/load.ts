import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { schemaFor } from './schemas/index.js';
import { ProvenanceStepSchema, type ProvenanceStep } from './schemas/provenance-step.js';
import type { RegistryRecord } from './types.js';

export interface LoadError {
  /** Path relative to the registry root, with forward slashes. */
  file: string;
  message: string;
}

export interface LoadResult {
  records: RegistryRecord[];
  loadErrors: LoadError[];
  /** Logged automated steps from `provenance/`, by id. */
  provenanceIndex: Map<string, ProvenanceStep>;
  /** Feature ids per geometry file path, for the files records point to with `geometry`. */
  featureIndex: Map<string, Set<string>>;
  /** Asset paths, among those layers name with `asset`, that exist under the registry root. */
  assetIndex: Set<string>;
}

async function listYaml(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

const isDirectory = async (dir: string) => (await stat(dir).catch(() => null))?.isDirectory() === true;

function relative(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadProvenance(
  root: string,
  index: Map<string, ProvenanceStep>,
  loadErrors: LoadError[],
): Promise<void> {
  const dir = path.join(root, 'provenance');
  if (!(await isDirectory(dir))) return;
  for (const file of await listYaml(dir)) {
    const rel = relative(root, file);
    try {
      const parsed = ProvenanceStepSchema.safeParse(parseYaml(await readFile(file, 'utf8')));
      if (!parsed.success) {
        loadErrors.push({ file: rel, message: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') });
      } else if (index.has(parsed.data.id)) {
        loadErrors.push({ file: rel, message: `duplicate provenance step id ${parsed.data.id}` });
      } else {
        index.set(parsed.data.id, parsed.data as ProvenanceStep);
      }
    } catch (error) {
      loadErrors.push({ file: rel, message: errorMessage(error) });
    }
  }
}

/** Feature ids of a GeoJSON FeatureCollection: `feature.id`, else `feature.properties.id`. */
function featureIds(geojson: unknown): Set<string> {
  const ids = new Set<string>();
  const features = (geojson as { features?: unknown }).features;
  if (!Array.isArray(features)) return ids;
  for (const feature of features as { id?: unknown; properties?: { id?: unknown } | null }[]) {
    const id = feature?.id ?? feature?.properties?.id;
    if (typeof id === 'string' || typeof id === 'number') ids.add(String(id));
  }
  return ids;
}

async function loadFeatureIndex(
  root: string,
  records: readonly RegistryRecord[],
  loadErrors: LoadError[],
): Promise<Map<string, Set<string>>> {
  const index = new Map<string, Set<string>>();
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  for (const geometry of new Set(records.map((r) => r.geometry).filter((g): g is string => typeof g === 'string'))) {
    const resolved = path.resolve(root, geometry);
    // geometry paths may not leave the registry root
    if (!resolved.startsWith(rootWithSep)) continue;
    let text: string;
    try {
      text = await readFile(resolved, 'utf8');
    } catch {
      continue; // a missing file is reported by REF-FEATURE where a feature needs it
    }
    try {
      index.set(geometry, featureIds(JSON.parse(text)));
    } catch (error) {
      loadErrors.push({ file: geometry, message: `invalid GeoJSON: ${errorMessage(error)}` });
    }
  }
  return index;
}

async function loadAssetIndex(root: string, records: readonly RegistryRecord[]): Promise<Set<string>> {
  const index = new Set<string>();
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  for (const asset of new Set(records.map((r) => r.asset).filter((a): a is string => typeof a === 'string'))) {
    const resolved = path.resolve(root, asset);
    // asset paths may not leave the registry root
    if (!resolved.startsWith(rootWithSep)) continue;
    if ((await stat(resolved).catch(() => null))?.isFile()) index.add(asset);
  }
  return index;
}

/**
 * Seam 1: filesystem to records. Reads `<root>/content/**.yaml`, `<root>/provenance/**.yaml` and
 * the geometry files records point to. Checks structure only; what it cannot read comes back as
 * load errors instead of throwing.
 */
export async function loadRegistry(rootDir: string): Promise<LoadResult> {
  const root = path.resolve(rootDir);
  const contentDir = path.join(root, 'content');
  if (!(await isDirectory(contentDir))) {
    throw new Error(`No content directory found at ${contentDir}`);
  }

  const records: RegistryRecord[] = [];
  const loadErrors: LoadError[] = [];

  for (const file of await listYaml(contentDir)) {
    const rel = relative(root, file);
    let data: unknown;
    try {
      data = parseYaml(await readFile(file, 'utf8'));
    } catch (error) {
      loadErrors.push({ file: rel, message: errorMessage(error) });
      continue;
    }
    const family = typeof (data as { family?: unknown } | null)?.family === 'string' ? (data as { family: string }).family : '';
    const parsed = schemaFor(family).safeParse(data);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
      loadErrors.push({ file: rel, message });
      continue;
    }
    records.push({ ...(parsed.data as Record<string, unknown>), file: rel } as RegistryRecord);
  }

  const provenanceIndex = new Map<string, ProvenanceStep>();
  await loadProvenance(root, provenanceIndex, loadErrors);
  const featureIndex = await loadFeatureIndex(root, records, loadErrors);
  const assetIndex = await loadAssetIndex(root, records);

  return { records, loadErrors, provenanceIndex, featureIndex, assetIndex };
}
