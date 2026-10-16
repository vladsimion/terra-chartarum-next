import { z } from 'zod';

/**
 * One automated (OCR/HTR/LLM) transformation, logged under `provenance/` (FR-008). Only `id` and
 * `status` are required structurally; the AUTO-* rules say what else a step must carry and from
 * which lifecycle, so an early research note is not rejected at load time.
 */
export const ProvenanceStepSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  tool: z.string().optional(),
  tool_version: z.string().optional(),
  input: z.unknown().optional(),
  ran_on: z.string().optional(),
  parameters: z.unknown().optional(),
  artefact: z
    .looseObject({ url: z.string().optional(), shelfmark: z.string().optional(), sha256: z.string().optional() })
    .optional(),
  adjudicated_by: z.string().optional(),
  adjudicated_on: z.string().optional(),
});

export interface ProvenanceStep {
  id: string;
  status?: string;
  tool?: string;
  tool_version?: string;
  input?: unknown;
  ran_on?: string;
  parameters?: unknown;
  artefact?: { url?: string; shelfmark?: string; sha256?: string };
  adjudicated_by?: string;
  adjudicated_on?: string;
}
