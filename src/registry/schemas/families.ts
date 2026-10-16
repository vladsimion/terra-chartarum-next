import { z } from 'zod';
import { DATE_FIELDS, EntityBase } from './entity.js';
import { RightsShape } from './evidence.js';

/*
 * Family shapes from data-model.md "Family fields". Types only: a field being present is
 * FAM-REQUIRED's call (by lifecycle), so an early research record still loads.
 */

export const MapSchema = EntityBase.extend({
  makers: z.array(z.string()).optional(),
  edition_state: z.string().optional(),
  repository: z.string().optional(),
  images: z.array(z.string()).optional(),
  rights: RightsShape.optional(),
});

export const CartographerSchema = EntityBase.extend({ life_dates: z.string().optional() });

export const PlaceSchema = EntityBase.extend({
  place_type: z.string().optional(),
  location_status: z.string().optional(),
  ...DATE_FIELDS,
});

export const SourceSchema = EntityBase.extend({
  is_finding_aid: z.boolean().default(false),
  source_kind: z.string().optional(),
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

export const BibliographyEntrySchema = EntityBase.extend({ csl: z.string().optional() });

export const CollectionSchema = EntityBase.extend({
  members: z.unknown().optional(),
  default_layers: z.unknown().optional(),
});

/** Route, event and period carry dates and nothing else beyond the entity base. */
export const DatedSchema = EntityBase.extend({ ...DATE_FIELDS });
