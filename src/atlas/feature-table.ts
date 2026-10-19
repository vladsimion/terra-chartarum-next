import { styleFor } from './provenance-style.js';
import { featureState } from './time.js';
import { intervalOfBuilt, ownProvenance, type BuiltFeature } from './visible.js';

/*
 * The text a reader without WebGL gets in place of the map for each layer (spec 005 FR-016,
 * contracts/atlas-page.md "No WebGL"): one row per feature valid at the year, by the same rule the
 * map's filter uses (`time.ts`), so the table and the drawing never disagree.
 */
export interface FeatureRow {
  name: string;
  /** The feature's own dates as written, or a note that the layer dates it. */
  dates: string;
  provenance: string;
  /** Only possibly valid at this year (an uncertain date on its boundary year). */
  possible: boolean;
}

const written = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** `keep` is a facet selection: a feature it rejects is not listed. */
export function featureRows(
  features: readonly { properties: object }[],
  year: number,
  layerProvenance: string,
  keep: (properties: Record<string, unknown>) => boolean = () => true,
): FeatureRow[] {
  const rows: FeatureRow[] = [];
  for (const { properties } of features) {
    const p = properties as Record<string, unknown> & BuiltFeature;
    if (!keep(p)) continue;
    const state = featureState(intervalOfBuilt(p), year);
    if (state === 'outside') continue;
    const from = written(p.valid_from);
    const to = written(p.valid_to);
    rows.push({
      name: written(p.name) || 'Unnamed feature',
      dates: from && to ? `${from} to ${to}` : 'Dated by the layer',
      provenance: styleFor(ownProvenance(p, layerProvenance))?.label ?? 'Not stated',
      possible: state === 'possible',
    });
  }
  return rows;
}
