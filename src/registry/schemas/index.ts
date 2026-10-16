import type { ZodType } from 'zod';
import { AttestationSchema } from './attestation.js';
import { EntityBase } from './entity.js';
import { EssaySchema } from './essay.js';
import { EvidenceSchema } from './evidence.js';
import {
  BibliographyEntrySchema,
  CartographerSchema,
  DatasetSchema,
  LayerSchema,
  MapSchema,
  PlaceSchema,
  SourceSchema,
} from './families.js';

const BY_FAMILY: Record<string, ZodType> = {
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
};

/**
 * The structure a file in `content/<family>/` must have. An unknown family still loads with the
 * base shape, so `ID-FAMILY` can report it instead of the loader throwing it away.
 */
export function schemaFor(family: string): ZodType {
  return BY_FAMILY[family] ?? EntityBase;
}
