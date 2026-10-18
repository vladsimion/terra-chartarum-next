/*
 * The shapes the Atlas modules share (spec 005 contracts/build-outputs.md and data-model.md
 * "Atlas view"). The index is what the catalogue is served from: public layers only, nothing else.
 */

export interface IndexLayer {
  slug: string;
  title: string;
  role: string;
  theme: string;
  /** The layer-level geometry provenance: what the legend and the present-day label read. */
  provenance: string;
  /** Slugs of the public collections that list the layer. */
  collections: string[];
  /** Names of the rooms of the public essays that list the layer (ADR 0015). */
  rooms: string[];
  tags: string[];
  synonyms: string[];
  envelope: { from: string; to: string };
  time_mode: 'per_feature' | 'envelope_only';
  description: string;
}

export interface IndexCollection {
  slug: string;
  title: string;
  description: string;
  members: string[];
  default_layers: string[];
}

export interface AtlasIndex {
  layers: IndexLayer[];
  collections: IndexCollection[];
}

export type Lens = 'theme' | 'collection' | 'room';

/** A facet selection on one property: chosen category values, or a range. */
export type FacetSelection = { kind: 'category'; values: string[] } | { kind: 'range'; min: number; max: number };

/** The Atlas view: the single source of truth for the page (FR-003). */
export interface AtlasState {
  year: number;
  lens: Lens;
  /** The collection context, meaningful with the collection lens. */
  collection?: string;
  /** Active layer slugs in activation order. */
  active: string[];
  /** The layer the inspector shows; always one of `active`. */
  focused?: string;
  relevantOnly: boolean;
  /** Per layer slug, per property. */
  facets: Record<string, Record<string, FacetSelection>>;
}
