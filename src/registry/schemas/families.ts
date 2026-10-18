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

export const CartographerSchema = EntityBase.extend({
  kind: z.string().optional(),
  names: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  life_dates: z.string().optional(),
  active: z.string().optional(),
  bibliography: z.array(z.string()).optional(),
});

export const PlaceSchema = EntityBase.extend({
  place_type: z.string().optional(),
  location_status: z.string().optional(),
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
  rights: RightsShape.optional(),
});

export const LayerSchema = EntityBase.extend({
  role: z.string().optional(),
  asset: z.string().optional(),
  dataset: z.string().optional(),
  geometry: z.string().optional(),
  geometry_provenance: z.string().optional(),
  images: z.array(z.string()).optional(),
  rights: RightsShape.optional(),
});

export const BibliographyEntrySchema = EntityBase.extend({ csl: z.string().optional(), section: z.string().optional() });

export const CollectionSchema = EntityBase.extend({
  members: z.unknown().optional(),
  default_layers: z.unknown().optional(),
});

/** Route, event and period carry dates and nothing else beyond the entity base. */
export const DatedSchema = EntityBase.extend({ ...DATE_FIELDS });
