import { z } from 'zod';
import { EntityBase } from './entity.js';
import { LocatorShape } from './evidence.js';

/**
 * place x source x form (GLOSSARY.md). `silence_state` accepts a list on purpose: SIL-STATE
 * reports "more than one state" as a rule violation rather than a load error.
 */
export const AttestationSchema = EntityBase.extend({
  place: z.string().optional(),
  source: z.string().optional(),
  form: z.string().optional(),
  silence_state: z.union([z.string(), z.array(z.string())]).optional(),
  source_coverage_verified: z.unknown().optional(),
  confidence: z.string().optional(),
  locator: LocatorShape.optional(),
});
