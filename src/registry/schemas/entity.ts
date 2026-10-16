import { z } from 'zod';
import { SameAs } from './shared.js';

/**
 * Structure of any entity file (data-model.md "Entity"). Enumerated fields are plain strings here:
 * membership is checked by the rules, so records built in memory and records loaded from disk are
 * judged the same way. Family-specific fields pass through untouched.
 */
export const EntityBase = z.looseObject({
  id: z.string(),
  family: z.string(),
  origin: z.string().optional(),
  title: z.string(),
  slug: z.string(),
  slug_history: z.array(z.string()).default([]),
  lifecycle: z.string().optional(),
  release: z.string().default('held'),
  same_as: z.array(SameAs).optional(),
  relations: z.array(z.string()).default([]),
  superseded_by: z.string().optional(),
  private: z.record(z.string(), z.unknown()).optional(),
  legacy_confidence: z.string().optional(),
  legacy_review_state: z.string().optional(),
  legacy_layer_status: z.string().optional(),
  // Membership only: the rules that read these (IMPORT-*, AUTO-*, LIFE-SUPERSEDED) judge their values.
  withdrawn: z.unknown().optional(),
  legacy_family: z.unknown().optional(),
  legacy_reviewer: z.unknown().optional(),
  legacy_review_date: z.unknown().optional(),
  legacy_normalization_method: z.unknown().optional(),
  editor_confirmed: z.unknown().optional(),
  confirmed_by: z.unknown().optional(),
  confirmed_on: z.unknown().optional(),
  adjudicated_by: z.unknown().optional(),
  adjudicated_on: z.unknown().optional(),
});

/** The date fields of data-model.md; `date_precision` is derived, so DATE-PRECISION-AUTHORED judges it, not the loader. */
export const DATE_FIELDS = {
  valid_from: z.unknown().optional(),
  valid_to: z.unknown().optional(),
  date_label: z.unknown().optional(),
  date_precision: z.unknown().optional(),
};

export type EntityBaseInput = z.input<typeof EntityBase>;
