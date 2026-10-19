import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { importAssets } from './adapters/assets.js';
import { importBibliography } from './adapters/bibliography.js';
import { importCartographers } from './adapters/cartographers.js';
import { importCollections } from './adapters/collections.js';
import { importDaciaPlaces, importDaciaSources } from './adapters/dacia.js';
import { importLayers } from './adapters/layers.js';
import { importMaps } from './adapters/maps.js';
import { importToponyms } from './adapters/toponyms.js';
import { Collector, ImportError, text, type Row, type StagedFile } from './context.js';
import { EntryBook } from './entries.js';
import { EssayLinks } from './essay-links.js';
import { extractRaw } from './extract-ts.js';
import { readCsv } from './read-csv.js';
import { buildManifest, type Manifest, type Snapshot } from './snapshot.js';
import { loadVocabulary } from './vocab.js';

/*
 * The v1 profile (spec 008 FR-010): the `atlas` authority (maps, cartographers, bibliography, toponyms,
 * layers, collections, geo release assets) and the Dacia anchor records (the pilot places and the
 * Trench A sources). Adapters run in dependency order; the result is every file the import would
 * write, as text or bytes, and what it set aside. Nothing is read but the snapshot and the registry
 * root (for entries already there and the vocabulary), and nothing is run.
 */
export interface ProfileResult {
  files: Map<string, StagedFile>;
  manifest: Manifest;
  report: ReturnType<Collector['report']>;
  counts: Record<string, number>;
}

async function read(snapshot: Snapshot, file: string): Promise<string> {
  try {
    return await readFile(path.join(snapshot.root, file), 'utf8');
  } catch {
    throw new ImportError(`the snapshot has no ${file}`);
  }
}

const registry = async (snapshot: Snapshot, name: string): Promise<Row[]> => extractRaw(await read(snapshot, `src/lib/${name}.ts`), `src/lib/${name}.ts`);

export async function runProfile(snapshot: Snapshot, options: { root: string }): Promise<ProfileResult> {
  const out = new Collector();
  const links = new EssayLinks();
  const book = await EntryBook.open(options.root);
  const cnd = await loadVocabulary(options.root, 'cnd');

  const [maps, cartographers, bibliography, toponyms, layers, collections] = await Promise.all(
    ['corpus', 'cartographers', 'bibliography', 'toponyms', 'geo', 'geo-collections'].map((name) => registry(snapshot, name)),
  ) as [Row[], Row[], Row[], Row[], Row[], Row[]];
  const catalog = JSON.parse(await read(snapshot, 'data/geo/catalog.json')) as Row;
  const places = readCsv(await read(snapshot, 'data/dacia/places.csv'), 'data/dacia/places.csv');
  const sources = readCsv(await read(snapshot, 'data/dacia/sources.csv'), 'data/dacia/sources.csv');
  const pilot = new Set(readCsv(await read(snapshot, 'data/dacia/pilot/pilot-places.csv'), 'data/dacia/pilot/pilot-places.csv').map((r) => r.place_id as string));

  const layerTitles = new Map(layers.map((l) => [text(l, 'id') ?? '', text(l, 'title') ?? '']));
  const datasets = importAssets(catalog, snapshot.sha.slice(0, 7), layerTitles, out);
  const sourceBytes = new Map<string, Uint8Array>();
  for (const layer of layers) {
    const url = text(layer, 'url');
    if (!url || sourceBytes.has(url)) continue;
    try {
      sourceBytes.set(url, await readFile(path.join(snapshot.root, 'public', url)));
    } catch {
      throw new ImportError(`the layer ${text(layer, 'id') ?? '?'} names the source ${url}, which the snapshot does not have under public/`);
    }
  }
  importLayers(layers, datasets, (url) => sourceBytes.get(url) as Uint8Array, out, links);
  importCollections(collections, new Set(layers.map((l) => text(l, 'id') ?? '')), out, links);
  const cartographerIds = importCartographers(cartographers, out, links);
  const entries = importBibliography(bibliography, book, out);
  const cndPlaces = importDaciaPlaces(places, pilot, cnd, out);
  importDaciaSources(sources, book, out);
  importMaps(maps, cartographerIds, entries, book, out, links);
  importToponyms(toponyms, new Set(maps.map((m) => text(m, 'id') ?? '')), cndPlaces, out, links);

  const counts = { ...out.counts };
  const manifest = buildManifest(snapshot, 'v1', counts);
  out.file('migration/essay-links.json', links.json());
  out.file('migration/import-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { files: out.files, manifest, report: out.report(), counts };
}
