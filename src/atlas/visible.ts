import { STYLE_CLASSES, styleFor, type StyleClass } from './provenance-style.js';
import { featureState } from './time.js';

/*
 * What a layer's loaded features make of a year (spec 005 FR-013, FR-015), for the text the page
 * shows beside the map: how many features are drawn, how many only possibly, and which provenance
 * classes are present. The same rule as the map's expression, defined once in `time.ts`.
 */

/** A feature as the build wrote it: the year bounds, and its own provenance when it has one. */
export interface BuiltFeature {
  _from_min: number;
  _from_max: number;
  _to_min: number;
  _to_max: number;
  _from_unc: number;
  _to_unc: number;
  geometry_provenance?: string;
}

export interface FeatureSummary {
  /** Features drawn at the year, certain or possible. */
  shown: number;
  /** Of those, the ones only possibly valid ("Date uncertain"). */
  uncertain: number;
  total: number;
}

/** `keep` is a facet selection: a feature it rejects is not drawn, whatever the year says. */
export function summarise(features: readonly BuiltFeature[], year: number, keep: (feature: BuiltFeature) => boolean = () => true): FeatureSummary {
  let shown = 0;
  let uncertain = 0;
  for (const f of features) {
    if (!keep(f)) continue;
    const state = featureState(
      { fromMin: f._from_min, fromMax: f._from_max, toMin: f._to_min, toMax: f._to_max, fromUncertain: f._from_unc === 1, toUncertain: f._to_unc === 1 },
      year,
    );
    if (state !== 'outside') shown += 1;
    if (state === 'possible') uncertain += 1;
  }
  return { shown, uncertain, total: features.length };
}

/** A feature's own provenance when it has one, else its layer's. */
export function ownProvenance(feature: BuiltFeature, layerProvenance: string): string {
  // FlatGeobuf reads a property a feature does not have as empty text
  return typeof feature.geometry_provenance === 'string' && feature.geometry_provenance !== '' ? feature.geometry_provenance : layerProvenance;
}

/** The provenance classes among a layer's features, in the legend order. */
export function classesPresent(features: readonly BuiltFeature[], layerProvenance: string): StyleClass[] {
  const ids = new Set(features.map((f) => styleFor(ownProvenance(f, layerProvenance))?.id).filter((id) => id !== undefined));
  return STYLE_CLASSES.filter((c) => ids.has(c.id));
}
