import { z } from 'zod';
import {
  CONFIDENCE,
  EVIDENCE_TYPES,
  EXTRACTION_METHODS,
  GEOMETRY_PROVENANCE,
  LOCATOR_STATES,
  RECONSTRUCTION,
  SILENCE_STATES,
} from '../vocab.ts';
import { refSchema } from './families.ts';

/**
 * Evidence, rights and extraction (data-model.md). The evidence schema is also
 * meant for GeoJSON feature properties; spec 005 applies it to layer files.
 * Dates are kept as strings here and checked as EDTF by the integrity rules;
 * `date_precision` is derived (ADR 0006), so it is not an allowed field.
 */

const calendarDate = z.iso.date('must be a calendar date (YYYY-MM-DD)');

export const evidenceSchema = z.strictObject({
  source: refSchema,
  locator: z.string().optional(),
  locator_state: z.enum(LOCATOR_STATES).optional(),
  verified_by: z.string().min(1).optional(),
  verified_on: calendarDate.optional(),
  consulted_copy: z.string().min(1).optional(),
  evidence_type: z.enum(EVIDENCE_TYPES).optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  geometry_provenance: z.enum(GEOMETRY_PROVENANCE).optional(),
  reconstruction: z.enum(RECONSTRUCTION).optional(),
  confidence: z.enum(CONFIDENCE).optional(),
  silence_state: z.enum(SILENCE_STATES).optional(),
  last_verified: calendarDate.optional(),
});

export const rightsSchema = z.strictObject({
  licence: z.string().min(1).optional(),
  attribution: z.string().optional(),
  /** Copyright status of the text itself, recorded separately from reproduction clearance (TC-D018). */
  text_copyright_status: z.string().optional(),
  reproduction_cleared: z.boolean().optional(),
});

export const extractionSchema = z
  .strictObject({
    method: z.enum(EXTRACTION_METHODS),
    raw_evidence_ref: z.string().min(1).optional(),
    transformation_log_ref: z.string().min(1).optional(),
    adjudicated_by: z.string().min(1).optional(),
    adjudicated_on: calendarDate.optional(),
  })
  .superRefine((extraction, ctx) => {
    if (extraction.method === 'manual') return;
    for (const field of ['raw_evidence_ref', 'transformation_log_ref'] as const) {
      if (extraction[field] === undefined) {
        ctx.addIssue({ code: 'custom', path: [field], message: `required for ${extraction.method} extraction` });
      }
    }
  });
