/**
 * Shared vocabularies: the single definition of every enumeration used by the
 * registry (ADR 0003, data-model.md). Nothing else in the codebase may redefine
 * these lists; schemas and validators import them from here.
 */

export const LIFECYCLE = [
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
export type Lifecycle = (typeof LIFECYCLE)[number];

export const CONFIDENCE = ['secure', 'probable', 'possible', 'conjectural', 'unknown'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const GEOMETRY_PROVENANCE = [
  'source_geometry',
  'georeferenced_trace',
  'scholarly_reconstruction',
  'generalized_editorial',
  'modern_reference',
] as const;
export type GeometryProvenance = (typeof GEOMETRY_PROVENANCE)[number];

export const SILENCE_STATES = [
  'non_survival',
  'non_survey',
  'non_request',
  'alternative_naming',
  'outside_frame',
  'source_not_applicable',
  'meaningful_silence',
] as const;
export type SilenceState = (typeof SILENCE_STATES)[number];

export const FAMILIES = [
  'essay',
  'map',
  'cartographer',
  'place',
  'source',
  'attestation',
  'dataset',
  'layer',
  'collection',
  'route',
  'event',
  'period',
  'room',
  'bibliography',
] as const;
export type Family = (typeof FAMILIES)[number];

export const ESSAY_STAGES = [
  'concept',
  'corpus',
  'research',
  'outline',
  'draft',
  'build',
  'design_qa',
  'publish',
  'cross_link',
] as const;
export type EssayStage = (typeof ESSAY_STAGES)[number];

/** Optional, additive essay tags (FR-012; GLOSSARY "Portal dimension"). */
export const PORTAL_DIMENSIONS = ['measure', 'witness', 'use', 'cosmos', 'power', 'silence'] as const;
export type PortalDimension = (typeof PORTAL_DIMENSIONS)[number];

export const ROOMS = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'] as const;
export type Room = (typeof ROOMS)[number];

/** Evidence vocabularies (data-model.md "Evidence"). */
export const EVIDENCE_TYPES = ['textual', 'cartographic', 'archaeological', 'archival', 'epigraphic', 'other'] as const;
export const RECONSTRUCTION = ['none', 'partial', 'full'] as const;
export const LOCATOR_STATES = ['verified', 'pending'] as const;
export const EXTRACTION_METHODS = ['manual', 'ocr', 'htr', 'llm'] as const;
