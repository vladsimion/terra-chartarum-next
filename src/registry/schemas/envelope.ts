import { z } from 'zod';

/**
 * Fields every registry record may carry (data-model.md "Common entity envelope").
 * Family-specific fields are added by the family schemas (spec 001 US3).
 * Value rules for lifecycle, evidence, rights and extraction arrive with their
 * user stories; here they are only allowed to be present.
 */

/** Families that have their own public page and therefore need a slug. */
export const ROUTABLE_FAMILIES = ['essay', 'map', 'cartographer', 'place', 'collection', 'room'] as const;

export const envelopeShape = {
  id: z.string(),
  authority: z.string().optional(),
  family: z.string(),
  title: z.string().min(1, 'title must not be empty'),
  slug: z.string().min(1).optional(),
  previous_slugs: z.array(z.string().min(1)).optional(),
  lifecycle: z.unknown().optional(),
  superseded_by: z.unknown().optional(),
  rooms: z.unknown().optional(),
  evidence: z.unknown().optional(),
  rights: z.unknown().optional(),
  extraction: z.unknown().optional(),
  /** Never public (FR-009); accepted as an opaque object. */
  private: z.record(z.string(), z.unknown()).optional(),
};

export const envelopeSchema = z
  .strictObject(envelopeShape)
  .superRefine((record, ctx) => {
    if ((ROUTABLE_FAMILIES as readonly string[]).includes(record.family) && record.slug === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: `slug is required for routable family "${record.family}"`,
      });
    }
  });
