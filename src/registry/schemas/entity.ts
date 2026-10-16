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
});

export type EntityBaseInput = z.input<typeof EntityBase>;
