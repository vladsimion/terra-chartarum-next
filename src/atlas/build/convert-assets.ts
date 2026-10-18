import { bytesToHeader } from 'pmtiles';
import { GEOMETRY_PROVENANCE_VALUES } from '../../registry/schemas/shared.js';
import { isObject, present } from '../../registry/values.js';
import { intervalOf, yearBounds } from '../time.js';
import { serializeFeatures } from './flatgeobuf.js';

/*
 * Turning a layer source into what the browser fetches (spec 005 FR-006, research R3, contracts/
 * build-outputs.md). Pure: bytes and records in, bytes and failures out; the caller reads and
 * writes files. Every build-time check of contracts/atlas-rule-ids.md that needs the source lives here.
 */

export type AtlasCheck =
  | 'ATLAS-ASSET-MISSING'
  | 'ATLAS-ASSET-SIZE'
  | 'ATLAS-FEATURE-TIME'
  | 'ATLAS-FEATURE-PROVENANCE'
  | 'ATLAS-FACET-PROPERTY'
  | 'ATLAS-PLACE-REF'
  | 'ATLAS-OVERLAY-ANNOTATION'
  | 'ATLAS-LEAK';

/** A build-time failure. It names the layer by slug and, for a feature, by its index; it never repeats a value. */
export interface AtlasFailure {
  check: AtlasCheck;
  layer: string;
  feature?: number;
  message: string;
}

/** The fields of a layer record the conversion reads. */
export interface LayerSource {
  slug: string;
  role: string;
  envelope: string;
  timeMode: string;
  facets: { property: string; label: string; kind: string }[];
}

export type FacetSummary =
  | { property: string; label: string; kind: 'category'; values: { value: string; count: number }[] }
  | { property: string; label: string; kind: 'range'; min: number; max: number };

export interface Converted {
  /** The built asset: a FlatGeobuf, or the PMTiles source unchanged. */
  asset: Uint8Array;
  extension: 'fgb' | 'pmtiles';
  facets: FacetSummary[];
}

interface Feature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: unknown;
}

const fail = (check: AtlasCheck, layer: string, message: string, feature?: number): AtlasFailure => ({ check, layer, message, ...(feature === undefined ? {} : { feature }) });

/** A PMTiles source is kept as it is once its header reads. */
export function convertPmtiles(layer: LayerSource, bytes: Uint8Array): { converted?: Converted; failures: AtlasFailure[] } {
  try {
    bytesToHeader(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  } catch {
    return { failures: [fail('ATLAS-ASSET-MISSING', layer.slug, 'the source is not a PMTiles file with a valid header')] };
  }
  return { converted: { asset: bytes, extension: 'pmtiles', facets: [] }, failures: [] };
}

/** Whether a stated provenance is acceptable on a feature of this layer. */
function provenanceProblem(layer: LayerSource, value: unknown): string | null {
  if (typeof value !== 'string' || !(GEOMETRY_PROVENANCE_VALUES as readonly string[]).includes(value)) return 'geometry_provenance is not one of the five values';
  if (value === 'modern_reference' && layer.role !== 'context') return 'modern_reference geometry belongs to a layer whose role is context';
  return null;
}

/** What a facet shows for a layer: counted values, or the extent of numbers. Failures for a facet no feature supports. */
function summariseFacets(layer: LayerSource, features: readonly Feature[], failures: AtlasFailure[]): FacetSummary[] {
  const summaries: FacetSummary[] = [];
  for (const facet of layer.facets) {
    const values = features.map((f, i) => ({ i, value: f.properties?.[facet.property] })).filter((v) => present(v.value));
    if (values.length === 0) {
      failures.push(fail('ATLAS-FACET-PROPERTY', layer.slug, `no feature has the facet property ${facet.property}`));
      continue;
    }
    if (facet.kind === 'range') {
      const bad = values.find((v) => typeof v.value !== 'number' || !Number.isFinite(v.value));
      if (bad) {
        failures.push(fail('ATLAS-FACET-PROPERTY', layer.slug, `the range facet ${facet.property} has a value that is not a number`, bad.i));
        continue;
      }
      const numbers = values.map((v) => v.value as number);
      summaries.push({ property: facet.property, label: facet.label, kind: 'range', min: Math.min(...numbers), max: Math.max(...numbers) });
    } else {
      const counts = new Map<string, number>();
      for (const { value } of values) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
      const sorted = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, count }));
      summaries.push({ property: facet.property, label: facet.label, kind: 'category', values: sorted });
    }
  }
  return summaries;
}

/**
 * GeoJSON to FlatGeobuf, each feature given the bounds of when it is valid (research R1), and a
 * summary of each declared facet. `publicPlaces` are the ids a feature's `place` may name.
 */
export function convertGeoJson(layer: LayerSource, text: string, publicPlaces: ReadonlySet<string>): { converted?: Converted; failures: AtlasFailure[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { failures: [fail('ATLAS-ASSET-MISSING', layer.slug, 'the source is not valid JSON')] };
  }
  if (!isObject(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    return { failures: [fail('ATLAS-ASSET-MISSING', layer.slug, 'the source is not a GeoJSON FeatureCollection')] };
  }
  const features = data.features as Feature[];
  const failures: AtlasFailure[] = [];
  const envelope = layer.envelope.split('/');
  const envelopeBounds = [yearBounds(envelope[0]), yearBounds(envelope[1])];

  const built = features.map((feature, i) => {
    const properties = { ...(feature.properties ?? {}) };
    if (layer.timeMode === 'per_feature' && (!present(properties.valid_from) || !present(properties.valid_to))) {
      failures.push(fail('ATLAS-FEATURE-TIME', layer.slug, 'a feature of a per-feature layer needs valid_from and valid_to', i));
    }
    const interval = intervalOf(properties.valid_from, properties.valid_to, layer.envelope);
    if (!interval) {
      if (present(properties.valid_from) || present(properties.valid_to)) failures.push(fail('ATLAS-FEATURE-TIME', layer.slug, 'valid_from or valid_to is not an EDTF date', i));
    } else {
      const [start, end] = envelopeBounds;
      if (start && end && (interval.toMax < start.min || interval.fromMin > end.max)) {
        failures.push(fail('ATLAS-FEATURE-TIME', layer.slug, 'the feature interval lies wholly outside the layer envelope', i));
      }
      Object.assign(properties, {
        _from_min: interval.fromMin,
        _from_max: interval.fromMax,
        _to_min: interval.toMin,
        _to_max: interval.toMax,
        _from_unc: interval.fromUncertain ? 1 : 0,
        _to_unc: interval.toUncertain ? 1 : 0,
      });
    }
    if (properties.geometry_provenance !== undefined) {
      const problem = provenanceProblem(layer, properties.geometry_provenance);
      if (problem) failures.push(fail('ATLAS-FEATURE-PROVENANCE', layer.slug, problem, i));
    }
    if (properties.place !== undefined && !(typeof properties.place === 'string' && publicPlaces.has(properties.place))) {
      failures.push(fail('ATLAS-PLACE-REF', layer.slug, 'place is not the id of a public place', i));
    }
    return { ...feature, properties };
  });

  const facets = summariseFacets(layer, features, failures);
  if (failures.length > 0) return { failures };
  const asset = serializeFeatures(built as never);
  return { converted: { asset, extension: 'fgb', facets }, failures };
}
