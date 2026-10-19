import { geojson } from 'flatgeobuf';
import { styleFor } from '../atlas/provenance-style.js';
import { ownProvenance, type BuiltFeature } from '../atlas/visible.js';

/*
 * A layer's features, fetched whole from its FlatGeobuf on activation (spec 005 research R4). Kept
 * apart from the map so the page can read them without loading MapLibre (FR-016).
 */
export interface LoadedFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: BuiltFeature & Record<string, unknown>;
}

const started = new Map<string, Promise<LoadedFeature[]>>();

/**
 * The layer's features, each tagged with the style class it is drawn in. Asking again gives the
 * same fetch, so the page can start a layer's download as soon as the address names it and the map
 * (still loading) picks it up when it is ready.
 */
export function fetchFeatures(slug: string, provenance: string): Promise<LoadedFeature[]> {
  let promise = started.get(slug);
  if (!promise) {
    promise = download(slug, provenance);
    started.set(slug, promise);
    promise.catch(() => started.delete(slug));
  }
  return promise;
}

async function download(slug: string, provenance: string): Promise<LoadedFeature[]> {
  const response = await fetch(`/data/layers/${slug}.fgb`);
  if (!response.ok) throw new Error(`the layer ${slug} could not be fetched (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const features: LoadedFeature[] = [];
  for await (const feature of geojson.deserialize(bytes)) {
    const f = feature as unknown as LoadedFeature;
    f.properties = { ...f.properties, _class: styleFor(ownProvenance(f.properties, provenance))?.id ?? 'documentary' };
    features.push(f);
  }
  return features;
}

