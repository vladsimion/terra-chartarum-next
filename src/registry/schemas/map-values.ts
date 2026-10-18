/*
 * Value sets for map and cartographer records (spec 004 data-model.md, ADR 0011, ADR 0016). Plain
 * lists, so the rules can check membership on loosely typed records.
 */

export const RECORD_SCOPE_VALUES = ['object', 'work', 'concept'] as const;
export const WITNESS_KIND_VALUES = ['held', 'institutional', 'unlocated'] as const;
export const VERIFICATION_VALUES = ['unverified', 'checked_online', 'inspected'] as const;
export const FIELD_STATUS_VALUES = ['recorded', 'not_applicable', 'not_yet_verified', 'unknown'] as const;
export const BASIS_VALUES = ['observed', 'inferred'] as const;
export const IMAGE_TYPE_VALUES = ['iiif', 'deepzoom', 'static'] as const;
export const ATTRIBUTION_VALUES = ['exact', 'unresolved'] as const;
export const GEOREFERENCING_VALUES = ['none', 'in_progress', 'georeferenced'] as const;
export const CARTOGRAPHER_KIND_VALUES = ['person', 'workshop'] as const;
export const CARTOGRAPHER_ROLE_VALUES = ['cartographer', 'engraver', 'publisher'] as const;

/** The fields a record page shows, each with a value or a stated status (research R4, `MAP-FIELD-STATUS`). */
export const DISPLAYED_FIELDS = [
  'title_original',
  'makers',
  'date_published',
  'publication_place',
  'edition_state',
  'atlas_context',
  'dimensions',
  'language',
  'coverage',
  'significance',
  'provenance',
  'georeferencing_status',
  'images',
] as const;

/** Fields that say whether a held witness's prose was seen or inferred. */
export const BASIS_FIELDS = ['provenance', 'atlas_context'] as const;

/** Keys that mean acquisition detail, which never enters the registry (FR-010, `MAP-PRIVATE-FIELD`). */
export const PRIVATE_WORDS = ['price', 'paid', 'cost', 'negotiation', 'vendor', 'dealer_contact', 'invoice', 'receipt'] as const;

/** Source kinds that cannot carry an attribution on their own (FR-016). */
export const COMMERCIAL_SOURCE_KINDS = ['dealer', 'auction'] as const;
