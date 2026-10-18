/*
 * Value sets for layers and places (spec 005 data-model.md, ADR 0013). Plain lists, so the rules
 * can check membership on loosely typed records.
 */

/** The seven canonical themes, in the order the Atlas lists them. */
export const THEME_VALUES = [
  'territories-boundaries',
  'networks-circulation',
  'places-settlements',
  'names-peoples-attestations',
  'conflict-campaigns-frontiers',
  'cartographic-evidence',
  'historical-map-overlays',
] as const;

/** How each theme reads on the page. */
export const THEME_LABELS: Record<(typeof THEME_VALUES)[number], string> = {
  'territories-boundaries': 'Territories & Boundaries',
  'networks-circulation': 'Networks & Circulation',
  'places-settlements': 'Places & Settlements',
  'names-peoples-attestations': 'Names, Peoples & Attestations',
  'conflict-campaigns-frontiers': 'Conflict, Campaigns & Frontiers',
  'cartographic-evidence': 'Cartographic Evidence',
  'historical-map-overlays': 'Historical Map Overlays',
};

export const TIME_MODE_VALUES = ['per_feature', 'envelope_only'] as const;
export const FACET_KIND_VALUES = ['category', 'range'] as const;
export const NAME_KIND_VALUES = ['historic', 'modern'] as const;
export const TRANSFORMATION_VALUES = ['polynomial1', 'polynomial2', 'polynomial3', 'helmert', 'projective', 'thin-plate-spline'] as const;
/** The shared confidence values without `unknown`: a georeferencing always has a stated confidence. */
export const GEOREF_CONFIDENCE_VALUES = ['secure', 'probable', 'possible', 'conjectural'] as const;

/** The parts a georeferencing must state (FR-019). */
export const GEOREF_PARTS = ['map', 'annotation', 'transformation', 'residual_error_m', 'control_points', 'confidence'] as const;

/** One static asset on the host, in bytes: 25 MiB (Cloudflare Workers static assets, research R3). */
export const STATIC_ASSET_LIMIT_BYTES = 25 * 1024 * 1024;
