import { z } from 'zod';
import { REF_RULE, parseRef } from '../ids.ts';
import { ESSAY_STAGES, type Family } from '../vocab.ts';

/**
 * Family-specific fields (data-model.md "Family-specific fields").
 *
 * Reference fields are typed here and declared in REFERENCE_FIELDS so the
 * integrity check can resolve them. Value rules for other fields arrive with
 * the user story or spec that owns them (stage and dimensions: 001 US5;
 * evidence and dates: 001 US2; map descriptive fields: spec 004); until then
 * they are only allowed to be present.
 */

export const refSchema = z
  .string()
  .refine((value) => parseRef(value) !== undefined, { message: `reference must match ${REF_RULE}` });
const refs = z.array(refSchema);
const loose = z.unknown().optional();

export const familyShapes = {
  essay: {
    stage: z.enum(ESSAY_STAGES),
    question: loose,
    dimensions: loose,
    maps: refs.optional(),
    layers: refs.optional(),
    places: refs.optional(),
    sources: refs.optional(),
    bibliography: refs.optional(),
  },
  map: {
    title_original: loose,
    title_normalised: loose,
    publication_place: loose,
    publication_date: loose,
    edition_state: loose,
    atlas_context: loose,
    dimensions_mm: loose,
    language: loose,
    coverage: loose,
    significance: loose,
    provenance: loose,
    collection_status: loose,
    image: loose,
    georeferencing_status: loose,
    physical: loose,
    cartographers: refs.optional(),
    places: refs.optional(),
    layers: refs.optional(),
    bibliography: refs.optional(),
  },
  cartographer: {
    names: loose,
    roles: loose,
    dates: loose,
    maps: refs.optional(),
    bibliography: refs.optional(),
  },
  place: {
    names: loose,
    geometry_ref: loose,
    sources: refs.optional(),
  },
  source: {
    kind: z.enum(['source', 'finding_aid']),
    bibliography: refSchema,
  },
  attestation: {
    place: refSchema,
    source: refSchema,
    name_form: loose,
    script: loose,
    language: loose,
    locator: loose,
    attestation_class: loose,
    silence_state: loose,
  },
  dataset: {
    question: loose,
    extent: loose,
    crs: loose,
    format: loose,
    licence: loose,
    layers: refs.optional(),
    sources: refs.optional(),
  },
  layer: {
    role: loose,
    theme: loose,
    valid_from: loose,
    valid_to: loose,
    per_feature_time: loose,
    asset: loose,
    dataset: refSchema.optional(),
    collections: refs.optional(),
  },
  collection: {
    question: loose,
    layer_ids: refs,
    default_layer_ids: refs,
  },
  route: { valid_from: loose, valid_to: loose, places: refs.optional(), sources: refs.optional() },
  event: { valid_from: loose, valid_to: loose, places: refs.optional(), sources: refs.optional() },
  period: { valid_from: loose, valid_to: loose, places: refs.optional(), sources: refs.optional() },
  room: { order: loose, description: loose, long_description: loose },
  bibliography: { section: loose, citation: loose },
} satisfies Record<Family, z.ZodRawShape>;

/** For each family, its reference fields and the family each must point to. */
export const REFERENCE_FIELDS: Record<Family, Record<string, Family>> = {
  essay: { maps: 'map', layers: 'layer', places: 'place', sources: 'source', bibliography: 'bibliography' },
  map: { cartographers: 'cartographer', places: 'place', layers: 'layer', bibliography: 'bibliography' },
  cartographer: { maps: 'map', bibliography: 'bibliography' },
  place: { sources: 'source' },
  source: { bibliography: 'bibliography' },
  attestation: { place: 'place', source: 'source' },
  dataset: { layers: 'layer', sources: 'source' },
  layer: { dataset: 'dataset', collections: 'collection' },
  collection: { layer_ids: 'layer', default_layer_ids: 'layer' },
  route: { places: 'place', sources: 'source' },
  event: { places: 'place', sources: 'source' },
  period: { places: 'place', sources: 'source' },
  room: {},
  bibliography: {},
};
