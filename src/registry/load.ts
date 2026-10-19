import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { scanEssayBody } from './essay-body.js';
import { schemaFor } from './schemas/index.js';
import { ProvenanceStepSchema, type ProvenanceStep } from './schemas/provenance-step.js';
import { VocabMappingSchema } from './schemas/vocab-mapping.js';
import type { Vocabulary } from './vocab-map.js';
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
  /** Specialist vocabularies from `vocab-mappings/`, by name (TC-D016). */
  vocabularies: Map<string, Vocabulary>;
  /** Feature ids per geometry file path, for the files records point to with `geometry`. */
  featureIndex: Map<string, Set<string>>;
  /** Asset paths, among those layers name with `asset`, that exist under the registry root. */
  assetIndex: Set<string>;
  /** Bytes of each asset in `assetIndex`, for `LAYER-ASSET-SIZE`. */
  assetSizes: Map<string, number>;
  /** The text of each CSL-JSON file the entries name, by that path, for `BIB-CSL`. A file that is missing or outside the root is absent. */
  cslFiles: Map<string, string>;
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

async function loadVocabularies(
  root: string,
  vocabularies: Map<string, Vocabulary>,
  loadErrors: LoadError[],
): Promise<void> {
  const dir = path.join(root, 'vocab-mappings');
  if (!(await isDirectory(dir))) return;
  for (const file of await listYaml(dir)) {
    const rel = relative(root, file);
    try {
      const parsed = VocabMappingSchema.safeParse(parseYaml(await readFile(file, 'utf8')));
      if (!parsed.success) {
        loadErrors.push({ file: rel, message: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') });
        continue;
      }
      const { vocabulary: name, ...tables } = parsed.data;
      if (path.parse(file).name !== name) {
        loadErrors.push({ file: rel, message: `the file is named ${path.parse(file).name} but declares vocabulary ${name}` });
      } else if (vocabularies.has(name)) {
        loadErrors.push({ file: rel, message: `duplicate vocabulary ${name}` });
      } else {
        vocabularies.set(name, { name, file: rel, tables });
      }
    } catch (error) {
      loadErrors.push({ file: rel, message: errorMessage(error) });
    }
  }
}

/** The text of the file beside a record's YAML file (`.mdx` for an essay, `.md` for a room), or null when there is none. */
async function readBody(yamlFile: string, extension = '.mdx'): Promise<string | null> {
  try {
    return await readFile(yamlFile.replace(/\.ya?ml$/, extension), 'utf8');
  } catch {
    return null;
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

type Resolved = { kind: 'inside'; real: string } | { kind: 'missing' } | { kind: 'escapes' };

const isInside = (realRoot: string, candidate: string) =>
  candidate === realRoot || candidate.startsWith(realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep);

/**
 * Resolve a path a record names, and only if it stays inside the registry root. The check is made
 * on the real path, so neither `../` nor a symlink (to a file or to a directory) can lead out. A
 * path that does not exist is just missing, which the rules that need it report.
 */
async function resolveWithin(realRoot: string, rel: string): Promise<Resolved> {
  if (!isInside(realRoot, path.resolve(realRoot, rel))) return { kind: 'escapes' };
  let real: string;
  try {
    real = await realpath(path.resolve(realRoot, rel));
  } catch {
    return { kind: 'missing' };
  }
  return isInside(realRoot, real) ? { kind: 'inside', real } : { kind: 'escapes' };
}

/** For each distinct path a record names in `field`, resolve it once and report every record that escapes. */
async function resolveNamedPaths(
  realRoot: string,
  records: readonly RegistryRecord[],
  field: 'geometry' | 'asset' | 'csl',
  loadErrors: LoadError[],
): Promise<Map<string, string>> {
  const inside = new Map<string, string>();
  const verdicts = new Map<string, Resolved>();
  for (const record of records) {
    const named = record[field];
    if (typeof named !== 'string') continue;
    let verdict = verdicts.get(named);
    if (!verdict) {
      verdict = await resolveWithin(realRoot, named);
      verdicts.set(named, verdict);
    }
    if (verdict.kind === 'escapes') {
      loadErrors.push({ file: record.file, message: `${field} path ${named} leaves the registry root and was not read` });
    } else if (verdict.kind === 'inside') {
      inside.set(named, verdict.real);
    }
  }
  return inside;
}

async function loadFeatureIndex(
  realRoot: string,
  records: readonly RegistryRecord[],
  loadErrors: LoadError[],
): Promise<Map<string, Set<string>>> {
  const index = new Map<string, Set<string>>();
  for (const [geometry, real] of await resolveNamedPaths(realRoot, records, 'geometry', loadErrors)) {
    let text: string;
    try {
      text = await readFile(real, 'utf8');
    } catch {
      continue; // unreadable (a directory, say): REF-FEATURE reports it where a feature needs it
    }
    try {
      index.set(geometry, featureIds(JSON.parse(text)));
    } catch (error) {
      loadErrors.push({ file: geometry, message: `invalid GeoJSON: ${errorMessage(error)}` });
    }
  }
  return index;
}

async function loadAssetIndex(
  realRoot: string,
  records: readonly RegistryRecord[],
  loadErrors: LoadError[],
): Promise<{ index: Set<string>; sizes: Map<string, number> }> {
  const index = new Set<string>();
  const sizes = new Map<string, number>();
  for (const [asset, real] of await resolveNamedPaths(realRoot, records, 'asset', loadErrors)) {
    const stats = await stat(real).catch(() => null);
    if (stats?.isFile()) {
      index.add(asset);
      sizes.set(asset, stats.size);
    }
  }
  return { index, sizes };
}

async function loadCslFiles(realRoot: string, records: readonly RegistryRecord[], loadErrors: LoadError[]): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const entries = records.filter((r) => r.family === 'bibliography_entry');
  for (const [named, real] of await resolveNamedPaths(realRoot, entries, 'csl', loadErrors)) {
    try {
      files.set(named, await readFile(real, 'utf8'));
    } catch {
      // unreadable (a directory, say): BIB-CSL reports the file as not there
    }
  }
  return files;
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
    const record = { ...(parsed.data as Record<string, unknown>), file: rel } as RegistryRecord;
    if (family === 'essay') {
      // The body is the .mdx beside the record, read and scanned here; it is never a field of the YAML.
      if ('body' in record) {
        loadErrors.push({ file: rel, message: `body is not a field of an essay record; it is read from ${path.basename(file).replace(/\.ya?ml$/, '.mdx')}` });
        continue;
      }
      record.body = scanEssayBody(await readBody(file));
    }
    if (family === 'room') {
      // the long description is the .md beside the record; a record without one has no body, and ROOM-COPY says so
      if ('body' in record) {
        loadErrors.push({ file: rel, message: `body is not a field of a room record; it is read from ${path.basename(file).replace(/\.ya?ml$/, '.md')}` });
        continue;
      }
      const body = await readBody(file, '.md');
      if (body !== null) record.body = body;
    }
    records.push(record);
  }

  const provenanceIndex = new Map<string, ProvenanceStep>();
  await loadProvenance(root, provenanceIndex, loadErrors);
  const vocabularies = new Map<string, Vocabulary>();
  await loadVocabularies(root, vocabularies, loadErrors);
  const realRoot = await realpath(root);
  const featureIndex = await loadFeatureIndex(realRoot, records, loadErrors);
  const { index: assetIndex, sizes: assetSizes } = await loadAssetIndex(realRoot, records, loadErrors);
  const cslFiles = await loadCslFiles(realRoot, records, loadErrors);

  return { records, loadErrors, provenanceIndex, vocabularies, featureIndex, assetIndex, assetSizes, cslFiles };
}
