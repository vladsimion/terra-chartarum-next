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
export const CONFIDENCE_VALUES = ['secure', 'probable', 'possible', 'conjectural', 'unknown'] as const;
export const GEOMETRY_PROVENANCE_VALUES = [
  'source_geometry',
  'georeferenced_trace',
  'scholarly_reconstruction',
  'generalized_editorial',
  'modern_reference',
] as const;
export const DATE_PRECISION_VALUES = [
  'day',
  'month',
  'year',
  'decade',
  'quarter_century',
  'century',
  'unknown',
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
export const PORTAL_DIMENSION_VALUES = ['Measure', 'Witness', 'Use', 'Cosmos', 'Power', 'Silence'] as const;

export const LAYER_ROLE_VALUES = ['context', 'historical', 'evidence', 'map-overlay'] as const;
export const ATTESTATION_FORM_VALUES = ['name', 'depiction', 'silence'] as const;
export const PROPOSED_BY_VALUES = ['person', 'ai'] as const;

export const Origin = z.enum(ORIGIN_VALUES);
export const Lifecycle = z.enum(LIFECYCLE_VALUES);
export const Release = z.enum(RELEASE_VALUES).default('held');
export const Confidence = z.enum(CONFIDENCE_VALUES);
export const GeometryProvenance = z.enum(GEOMETRY_PROVENANCE_VALUES);
export const DatePrecision = z.enum(DATE_PRECISION_VALUES);
export const EvidenceType = z.enum(EVIDENCE_TYPE_VALUES);
export const SilenceState = z.enum(SILENCE_STATE_VALUES);
export const LocatorState = z.enum(LOCATOR_STATE_VALUES);
export const PortalDimension = z.enum(PORTAL_DIMENSION_VALUES);

export type LifecycleValue = (typeof LIFECYCLE_VALUES)[number];

export const SameAs = z.object({ authority: z.string(), id: z.string() });

export const Rights = z.object({
  licence: z.string(),
  attribution: z.string().optional(),
  reproduction_cleared: z.boolean().optional(),
  text_public_domain: z.boolean().optional(),
});
