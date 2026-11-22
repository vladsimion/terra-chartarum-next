import { z } from 'zod';

/*
 * Shared vocabularies (ADR 0003, GLOSSARY.md). Each has a plain value list, so rules can check
 * membership on loosely typed records, and a Zod enum for typed use.
 */

export const ORIGIN_VALUES = ['legacy', 'minted'] as const;
export const LIFECYCLE_VALUES = [
  'proposed',
  'researching',
  'verified',
  'ready_for_build',
  'in_build',
  'qa',
  'publishable',
  'published',
  'superseded',
  'blocked',
] as const;
/** Lifecycle values outside the main line, reachable from any state (ADR 0003 §1). */
export const SIDE_STATES = ['superseded', 'blocked'] as const;
export const RELEASE_VALUES = ['held', 'released'] as const;
/** Ordinal 4 → 0, then `unknown` (ADR 0003 §3 as amended by ADR 0020; never the lowest level). */
export const CONFIDENCE_VALUES = ['secure', 'probable', 'possible', 'conjectural', 'unsupported', 'unknown'] as const;
export const GEOMETRY_PROVENANCE_VALUES = [
  'source_geometry',
  'georeferenced_trace',
  'scholarly_reconstruction',
  'generalized_editorial',
  'modern_reference',
] as const;
export const EVIDENCE_TYPE_VALUES = ['textual', 'cartographic', 'archaeological', 'archival', 'other'] as const;
export const SILENCE_STATE_VALUES = [
  'non_survival',
  'non_survey',
  'non_request',
  'alternative_naming',
  'outside_frame',
  'source_not_applicable',
  'meaningful_silence',
] as const;
export const LOCATOR_STATE_VALUES = ['verified', 'pending'] as const;
/** Portal facets (ADR 0003 §6). The field keeps its old name, `portal_dimensions`, until it is migrated. */
export const PORTAL_DIMENSION_VALUES = ['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence'] as const;

/**
 * The 13 analytical dimensions (constitution Principle XI, ADR 0020, ADR 0003 §8), by group.
 * Definitions live once, in FRAMEWORK.md.
 */
export const ANALYTICAL_DIMENSION_GROUPS = {
  empirical: [
    'historical',
    'geographical',
    'social_demographic',
    'anthropological_archaeological',
    'linguistic',
    'religious',
    'economic',
    'political',
  ],
  interpretative: ['historiographical', 'sociological', 'mythological', 'philosophical'],
  validation: ['methodological'],
} as const;
export const ANALYTICAL_DIMENSION_VALUES = [
  ...ANALYTICAL_DIMENSION_GROUPS.empirical,
  ...ANALYTICAL_DIMENSION_GROUPS.interpretative,
  ...ANALYTICAL_DIMENSION_GROUPS.validation,
] as const;

export const LAYER_ROLE_VALUES = ['context', 'historical', 'evidence', 'map-overlay'] as const;
export const ATTESTATION_FORM_VALUES = ['name', 'depiction', 'silence'] as const;
export const PROPOSED_BY_VALUES = ['person', 'ai'] as const;
/** Place roles on an edition (ADR 0021): where it was made, and where a copy is kept for a dated interval. */
export const PLACE_ROLE_VALUES = ['produced_at', 'held_at'] as const;
/** Whether a link is named by the source itself or inferred by scholars (ADR 0021, ADR 0023). */
export const BASIS_VALUES = ['stated', 'attributed'] as const;
/** A person's role in an edition (ADR 0023). Adding one is a vocabulary change with its GLOSSARY.md row. */
export const PERSON_ROLE_VALUES = ['printer'] as const;
/** Whether any copy of an edition is known to survive (spec 012 FR-010): stated, never read from an empty list. */
export const SURVIVAL_VALUES = ['surviving', 'none_known', 'unknown'] as const;

export const Origin = z.enum(ORIGIN_VALUES);
export const Lifecycle = z.enum(LIFECYCLE_VALUES);
export const Release = z.enum(RELEASE_VALUES).default('held');
export const Confidence = z.enum(CONFIDENCE_VALUES);
export const GeometryProvenance = z.enum(GEOMETRY_PROVENANCE_VALUES);
export const EvidenceType = z.enum(EVIDENCE_TYPE_VALUES);
export const SilenceState = z.enum(SILENCE_STATE_VALUES);
export const LocatorState = z.enum(LOCATOR_STATE_VALUES);
export const PortalDimension = z.enum(PORTAL_DIMENSION_VALUES);
export const AnalyticalDimension = z.enum(ANALYTICAL_DIMENSION_VALUES);

export type LifecycleValue = (typeof LIFECYCLE_VALUES)[number];

export const SameAs = z.object({ authority: z.string(), id: z.string() });

export const Rights = z.object({
  licence: z.string(),
  attribution: z.string().optional(),
  reproduction_cleared: z.boolean().optional(),
  text_public_domain: z.boolean().optional(),
});
