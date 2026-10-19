import { z } from 'zod';
import { DATE_FIELDS, EntityBase } from './entity.js';
import { RightsShape } from './evidence.js';

/*
 * Family shapes from data-model.md "Family fields". Types only: a field being present is
 * FAM-REQUIRED's call (by lifecycle), so an early research record still loads.
 */

/** An image of a map (spec 004 data-model.md "Image source"). Every key optional: `MAP-IMAGE` judges what is missing, so a draft record still loads. */
export const ImageSourceSchema = z.looseObject({
  type: z.string().optional(),
  url: z.string().optional(),
  static_url: z.string().optional(),
  attribution: z.string().optional(),
  licence: z.string().optional(),
  alt: z.string().optional(),
  witness_kind: z.string().optional(),
});

const OpenQuestion = z.looseObject({ field: z.string().optional(), question: z.string().optional(), would_resolve: z.string().optional() });

export const MapSchema = EntityBase.extend({
  record_scope: z.string().optional(),
  witness_kind: z.string().optional(),
  open_questions: z.array(OpenQuestion).optional(),
  makers: z.array(z.string()).optional(),
  title_original: z.string().optional(),
  date_published: z.string().optional(),
  publication_place: z.string().optional(),
  edition_state: z.string().optional(),
  repository: z.string().optional(),
  atlas_context: z.string().optional(),
  dimensions: z.object({ height_mm: z.number().positive(), width_mm: z.number().positive() }).optional(),
  language: z.string().optional(),
  coverage: z.array(z.string()).optional(),
  significance: z.string().optional(),
  provenance: z.string().optional(),
  attribution: z.string().optional(),
  attribution_evidence: z.array(z.string()).optional(),
  georeferencing_status: z.string().optional(),
  bibliography: z.array(z.string()).optional(),
  verification: z.string().optional(),
  last_verified: z.string().optional(),
  field_status: z.record(z.string(), z.string()).optional(),
  basis: z.looseObject({ provenance: z.string().optional(), atlas_context: z.string().optional() }).optional(),
  images: z.array(ImageSourceSchema).optional(),
  /** Held-sheet observations. Validated, never projected or displayed in v1 (FR-007, ADR 0002). */
  physical: z.record(z.string(), z.unknown()).optional(),
  rights: RightsShape.optional(),
});

/** A room (spec 007 data-model.md). Types only: ROOM-COPY judges the values, so an early record still loads. The long description is the Markdown beside the record, attached by the loader as `body`. */
export const RoomSchema = EntityBase.extend({
  order: z.number().optional(),
  short_description: z.string().optional(),
  copy_status: z.string().optional(),
});

export const CartographerSchema = EntityBase.extend({
  kind: z.string().optional(),
  names: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  life_dates: z.string().optional(),
  active: z.string().optional(),
  bibliography: z.array(z.string()).optional(),
});

/** A name of a place (spec 005 data-model.md). Every key optional: `PLACE-NAMES` judges what is missing, so a draft record still loads. */
const PlaceName = z.looseObject({
  name: z.string().optional(),
  language: z.string().optional(),
  kind: z.string().optional(),
  valid_from: z.unknown().optional(),
  valid_to: z.unknown().optional(),
});

export const PlaceSchema = EntityBase.extend({
  place_type: z.string().optional(),
  location_status: z.string().optional(),
  names: z.array(PlaceName).optional(),
  /** WGS84 decimal degrees; `PLACE-LOCATION` judges the numbers. */
  location: z.unknown().optional(),
  ...DATE_FIELDS,
});

export const SourceSchema = EntityBase.extend({
  is_finding_aid: z.boolean().default(false),
  source_kind: z.string().optional(),
  /** The bibliography entry this source is cited as (spec 006 data model; spec 003 reads it to format a citation). */
  entry: z.string().optional(),
});

export const DatasetSchema = EntityBase.extend({
  version: z.string().optional(),
  licence: z.string().optional(),
  /** Entries the dataset is documented by (spec 006 FR-003). */
  bibliography: z.array(z.string()).optional(),
  rights: RightsShape.optional(),
});

/** A facet an editor declares for the inspector; `LAYER-FACET` judges the parts. */
const Facet = z.looseObject({ property: z.string().optional(), label: z.string().optional(), kind: z.string().optional() });

const HttpsUrl = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'an https URL');

/** The georeferencing of an overlay (FR-019). Types only; `LAYER-GEOREF` judges the parts and the values. */
const Georef = z.looseObject({
  map: z.string().optional(),
  annotation: z.string().optional(),
  transformation: z.string().optional(),
  residual_error_m: z.unknown().optional(),
  control_points: z.unknown().optional(),
  confidence: z.string().optional(),
});

export const LayerSchema = EntityBase.extend({
  role: z.string().optional(),
  asset: z.string().optional(),
  dataset: z.string().optional(),
  geometry: z.string().optional(),
  geometry_provenance: z.string().optional(),
  images: z.array(z.string()).optional(),
  /** Shown in the inspector; the index carries its first paragraph (spec 005 contracts/build-outputs.md). */
  description: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  envelope: z.string().optional(),
  time_mode: z.string().optional(),
  facets: z.unknown().optional(),
  documentation: z.array(z.object({ label: z.string(), url: HttpsUrl })).optional(),
  georef: Georef.optional(),
  /** Entries the layer is documented by (spec 006 FR-003). */
  bibliography: z.array(z.string()).optional(),
  rights: RightsShape.optional(),
});

/**
 * A bibliography entry (spec 006 data-model.md): the YAML adds only `section`, the edition
 * relations and an external digital copy to the common fields. Identifiers and keywords live in the
 * CSL-JSON file `csl` names, and an entry carries no `rights` in v1 (FR-011).
 */
export const BibliographyEntrySchema = EntityBase.extend({
  csl: z.string().optional(),
  section: z.string().optional(),
  edition_of: z.string().optional(),
  translation_of: z.string().optional(),
  digital_copy: HttpsUrl.optional(),
});

export const CollectionSchema = EntityBase.extend({
  description: z.string().optional(),
  members: z.unknown().optional(),
  default_layers: z.unknown().optional(),
});

/** Route, event and period carry dates and nothing else beyond the entity base. */
export const DatedSchema = EntityBase.extend({ ...DATE_FIELDS });
