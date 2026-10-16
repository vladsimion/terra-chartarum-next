import { z } from 'zod';
import { DATE_FIELDS, EntityBase } from './entity.js';

/** Rights, loosely typed: whether a licence is present is RIGHTS-MISSING's call, by lifecycle. */
export const RightsShape = z.looseObject({
  licence: z.string().optional(),
  attribution: z.string().optional(),
  reproduction_cleared: z.boolean().optional(),
  text_public_domain: z.boolean().optional(),
});

/** A locator inside a source. Enumerations are checked by rules, so `state` and `proposed_by` stay strings. */
export const LocatorShape = z.looseObject({
  value: z.string().optional(),
  state: z.string().optional(),
  proposed_by: z.string().optional(),
  verified_by: z.string().optional(),
  verified_on: z.string().optional(),
  consulted_copy: z.string().optional(),
});

/** Evidence record structure (data-model.md "Evidence record"); presence of fields is judged by rules. */
export const EvidenceSchema = EntityBase.extend({
  target: z.looseObject({ entity: z.string(), feature: z.string().optional() }).optional(),
  source: z.string().optional(),
  locator: LocatorShape.optional(),
  evidence_type: z.string().optional(),
  geometry_provenance: z.string().optional(),
  reconstruction: z.boolean().optional(),
  confidence: z.string().optional(),
  rights: RightsShape.optional(),
  last_verified: z.string().optional(),
  provenance_chain: z.array(z.string()).optional(),
  ...DATE_FIELDS,
});
