import type { ZodObject } from 'zod';
import { AttestationSchema } from './attestation.js';
import { EntityBase } from './entity.js';
import { EssaySchema } from './essay.js';
import { EvidenceSchema } from './evidence.js';
import {
  BibliographyEntrySchema,
  CartographerSchema,
  CollectionSchema,
  DatedSchema,
  DatasetSchema,
  LayerSchema,
  MapSchema,
  PlaceSchema,
  SourceSchema,
} from './families.js';

const BY_FAMILY: Record<string, ZodObject> = {
  essay: EssaySchema,
  evidence: EvidenceSchema,
  attestation: AttestationSchema,
  map: MapSchema,
  cartographer: CartographerSchema,
  place: PlaceSchema,
  source: SourceSchema,
  dataset: DatasetSchema,
  layer: LayerSchema,
  bibliography_entry: BibliographyEntrySchema,
  collection: CollectionSchema,
  route: DatedSchema,
  event: DatedSchema,
  period: DatedSchema,
};

/**
 * The structure a file in `content/<family>/` must have. An unknown family still loads with the
 * base shape, so `ID-FAMILY` can report it instead of the loader throwing it away.
 */
export function schemaFor(family: string): ZodObject {
  return BY_FAMILY[family] ?? EntityBase;
}

/** Families whose files carry nothing beyond the entity base. */
const BASE_ONLY = new Set(['room']);

/**
 * The fields a record of this family may carry: the entity base plus the family's own. Null for a
 * family outside the closed list, which `ID-FAMILY` reports.
 */
export function knownFields(family: string): ReadonlySet<string> | null {
  const schema = BY_FAMILY[family] ?? (BASE_ONLY.has(family) ? EntityBase : null);
  return schema ? new Set(Object.keys(schema.shape)) : null;
}
