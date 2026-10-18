import type { PublicRecord } from '../registry/project.js';
import { roomsOf } from '../rooms/membership.js';
import { list } from '../registry/values.js';
import type { AtlasIndex, IndexCollection, IndexLayer } from './types.js';

/*
 * The catalogue index (spec 005 FR-021, FR-022, contracts/build-outputs.md "atlas-index.json"):
 * metadata of public layers and collections, built from the registry's public projection, which
 * already holds only published and released records. Nothing else goes in: no stable id of a layer,
 * no source path. A layer's collections and rooms are derived here, never stored on it.
 */
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const byTitle = (a: { title: string }, b: { title: string }): number => a.title.localeCompare(b.title);

/** The plain first paragraph of a description: whitespace collapsed, nothing after the first blank line. */
function firstParagraph(value: unknown): string {
  return str(value).trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim() ?? '';
}

function envelopeOf(value: unknown): { from: string; to: string } {
  const [from = '', to = ''] = str(value).split('/');
  return { from, to };
}

export function buildIndex(records: readonly PublicRecord[]): AtlasIndex {
  const layers = records.filter((r) => r.family === 'layer');
  const collections = records.filter((r) => r.family === 'collection');
  const slugOf = new Map(layers.map((l) => [l.id, str(l.slug)]));

  const indexLayers: IndexLayer[] = layers.map((layer) => ({
    slug: str(layer.slug),
    title: str(layer.title),
    role: str(layer.role),
    theme: str(layer.theme),
    provenance: str(layer.geometry_provenance),
    collections: collections.filter((c) => list(c.members).includes(layer.id)).map((c) => str(c.slug)),
    rooms: roomsOf(layer, records),
    tags: list(layer.tags),
    synonyms: list(layer.synonyms),
    envelope: envelopeOf(layer.envelope),
    time_mode: layer.time_mode === 'per_feature' ? 'per_feature' : 'envelope_only',
    description: firstParagraph(layer.description),
  }));

  const slugs = (ids: unknown): string[] => list(ids).map((id) => slugOf.get(id)).filter((slug): slug is string => slug !== undefined);
  const indexCollections: IndexCollection[] = collections.map((collection) => ({
    slug: str(collection.slug),
    title: str(collection.title),
    description: firstParagraph(collection.description),
    members: slugs(collection.members),
    default_layers: slugs(collection.default_layers),
  }));

  return { layers: indexLayers.sort(byTitle), collections: indexCollections.sort(byTitle) };
}
