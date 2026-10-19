import type { PublicRecord } from '../registry/project.js';
import { rightsLine, type RightsInput } from '../shell/rights-line.js';
import { roomsOf } from '../rooms/membership.js';
import { list } from '../registry/values.js';

/*
 * What the inspector shows about a layer (spec 005 US3, FR-022): its record's fields, and what is
 * derived from the public records around it: the collections that hold it, the public essays that
 * use it, and through them its rooms. Built from the public projection only, so a held essay,
 * collection or source contributes nothing.
 */
export interface LayerInfo {
  slug: string;
  title: string;
  /** The whole description, as authored. */
  description: string;
  role: string;
  theme: string;
  envelope: { from: string; to: string };
  timeMode: string;
  provenance: string;
  /** The title of the dataset the layer is drawn from. */
  source: string | null;
  /** "Licence: …", made from the rights and never typed; null when there is no licence. */
  licence: string | null;
  documentation: { label: string; url: string }[];
  essays: { title: string; slug: string }[];
  rooms: string[];
  collections: { slug: string; title: string }[];
  /** The quality of a map overlay's georeferencing; null for any other layer. */
  georef: Georef | null;
}

export interface Georef {
  /** The map record the overlay shows, when it is public. */
  map: { title: string; slug: string } | null;
  transformation: string;
  residualErrorM: number;
  controlPoints: number;
  confidence: string;
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' ? value : 0);
const byTitle = (a: { title: string }, b: { title: string }): number => a.title.localeCompare(b.title);

function georefOf(layer: PublicRecord, records: readonly PublicRecord[]): Georef | null {
  const georef = layer.georef;
  if (layer.role !== 'map-overlay' || georef === null || typeof georef !== 'object') return null;
  const fields = georef as Record<string, unknown>;
  const map = records.find((r) => r.family === 'map' && r.id === fields.map);
  return {
    map: map ? { title: str(map.title), slug: str(map.slug) } : null,
    transformation: str(fields.transformation),
    residualErrorM: num(fields.residual_error_m),
    controlPoints: num(fields.control_points),
    confidence: str(fields.confidence),
  };
}

export function layerInfo(layer: PublicRecord, records: readonly PublicRecord[]): LayerInfo {
  const [from = '', to = ''] = str(layer.envelope).split('/');
  const dataset = records.find((r) => r.id === layer.dataset);
  const documentation = (Array.isArray(layer.documentation) ? layer.documentation : [])
    .filter((d): d is { label: string; url: string } => d !== null && typeof d === 'object' && typeof d.label === 'string' && typeof d.url === 'string')
    .map(({ label, url }) => ({ label, url }));
  return {
    slug: str(layer.slug),
    title: str(layer.title),
    description: str(layer.description),
    role: str(layer.role),
    theme: str(layer.theme),
    envelope: { from, to },
    timeMode: str(layer.time_mode),
    provenance: str(layer.geometry_provenance),
    source: dataset ? str(dataset.title) : null,
    licence: rightsLine(layer.rights as RightsInput | undefined),
    documentation,
    essays: records
      .filter((r) => r.family === 'essay' && list(r.layers).includes(layer.id))
      .map((e) => ({ title: str(e.title), slug: str(e.slug) }))
      .sort(byTitle),
    rooms: roomsOf(layer, records),
    collections: records
      .filter((r) => r.family === 'collection' && list(r.members).includes(layer.id))
      .map((c) => ({ slug: str(c.slug), title: str(c.title) }))
      .sort(byTitle),
    georef: georefOf(layer, records),
  };
}
