import { z } from 'zod';
import { EntityBase } from './entity.js';
import { RightsShape } from './evidence.js';

/**
 * Essay structure (spec 003 data-model.md). An essay is a view over shared evidence: it holds
 * references and its editorial stage, never geometry or object descriptions of its own. Membership
 * and the content of the nested editorial records (`stage`, `stage_history`, `signoffs`,
 * `interactions`, `portal_dimensions`, `accent`) are checked by rules, so those stay loose here and
 * a malformed one is reported by name instead of dropped by the loader. The body is not a field: it
 * is read from the `.mdx` beside the record and attached in memory.
 */
export const EssaySchema = EntityBase.extend({
  stage: z.string().optional(),
  stage_history: z.unknown().optional(),
  design_qa_passed: z.boolean().optional(),
  portal_dimensions: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  published_on: z.unknown().optional(),
  question: z.string().optional(),
  thesis: z.string().optional(),
  rooms: z
    .looseObject({
      primary: z.string().optional(),
      secondary: z.array(z.string()).optional(),
    })
    .optional(),
  evidence: z.array(z.string()).optional(),
  maps: z.array(z.string()).optional(),
  places: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  layers: z.array(z.string()).optional(),
  bibliography: z.array(z.string()).optional(),
  accent: z.string().optional(),
  open_questions: z.array(z.string()).optional(),
  interactions: z.unknown().optional(),
  signoffs: z.unknown().optional(),
  legacy_url: z.string().optional(),
  redirect_switched: z.unknown().optional(),
  jira: z.string().optional(),
  rights: RightsShape.optional(),
});
