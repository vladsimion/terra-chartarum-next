import { z } from 'zod';
import { EntityBase } from './entity.js';

/**
 * Essay structure (data-model.md "Essay"). An essay is a view over shared evidence: it holds
 * references and its editorial stage, never geometry or object descriptions of its own. Membership
 * of `stage` and `portal_dimensions` is checked by rules, so both stay strings here.
 */
export const EssaySchema = EntityBase.extend({
  stage: z.string().optional(),
  design_qa_passed: z.boolean().optional(),
  portal_dimensions: z.array(z.string()).optional(),
  evidence: z.array(z.string()).optional(),
  maps: z.array(z.string()).optional(),
  places: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});
