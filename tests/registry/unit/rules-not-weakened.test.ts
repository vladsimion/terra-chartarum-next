import { describe, expect, it } from 'vitest';
import { ALL_RULES } from '../../../src/registry/rules/index.js';

/**
 * Spec 010 SC-003 (research R9): authoring tooling must not weaken a rule. Every rule registered on
 * `main` at f0a9230, with the lifecycle from which it is an error, written out by hand so that the
 * list cannot follow the code. Spec 010 may add rules; it may not remove one or raise a threshold.
 */
const BEFORE_SPEC_010: [string, string][] = [
  ['ID-SYNTAX', 'always'],
  ['ID-AUTHORITY', 'always'],
  ['ID-FAMILY', 'always'],
  ['ID-ORIGIN', 'always'],
  ['ID-DUPLICATE', 'always'],
  ['LOAD-PATH', 'always'],
  ['SLUG-UNIQUE', 'always'],
  ['SLUG-HISTORY-COLLISION', 'always'],
  ['REF-UNKNOWN', 'always'],
  ['REF-FAMILY', 'always'],
  ['REF-COLLECTION-SUBSET', 'always'],
  ['ROOM-SET', 'always'],
  ['ROOM-PUBLIC', 'always'],
  ['ROOM-COPY', 'publishable'],
  ['ENUM-INVALID', 'always'],
  ['SAMEAS-SYNTAX', 'always'],
  ['DATE-INVALID', 'always'],
  ['DATE-ORDER', 'always'],
  ['DATE-PRECISION-AUTHORED', 'always'],
  ['PROV-GEOMETRY', 'ready_for_build'],
  ['PROV-RECONSTRUCTION', 'ready_for_build'],
  ['PROV-SOURCE', 'ready_for_build'],
  ['PROV-MODERN-AS-EVIDENCE', 'always'],
  ['LOC-VERIFIED-FIELDS', 'always'],
  ['LOC-AI-VERIFIED', 'always'],
  ['LOC-SECURE-PENDING', 'always'],
  ['REF-FINDING-AID', 'ready_for_build'],
  ['SIL-STATE', 'always'],
  ['SIL-MISPLACED', 'always'],
  ['SIL-SECURE', 'always'],
  ['RIGHTS-MISSING', 'ready_for_build'],
  ['RIGHTS-CLEARED', 'publishable'],
  ['AUTO-UNADJUDICATED', 'publishable'],
  ['AUTO-LOG', 'ready_for_build'],
  ['AUTO-ARTEFACT-HASH', 'ready_for_build'],
  ['IMPORT-CONFIRMED', 'always'],
  ['IMPORT-FAMILY', 'always'],
  ['IMPORT-CONFIDENCE', 'always'],
  ['IMPORT-REVIEW', 'always'],
  ['IMPORT-LAYER-LIFECYCLE', 'always'],
  ['IMPORT-REVIEWER', 'always'],
  ['REF-FEATURE', 'always'],
  ['FAM-REQUIRED', 'ready_for_build'],
  ['FAM-UNKNOWN', 'always'],
  ['DATASET-PIN', 'ready_for_build'],
  ['LIFE-VALUE', 'always'],
  ['LIFE-ESSAY-DERIVED', 'always'],
  ['LIFE-AVAILABILITY', 'published'],
  ['LIFE-SUPERSEDED', 'always'],
  ['REL-VALUE', 'always'],
  ['VOCAB-UNKNOWN', 'always'],
  ['VOCAB-TARGET', 'always'],
  ['VOCAB-SHADOW', 'always'],
  ['ESSAY-QUESTION', 'always'],
  ['ESSAY-ROOMS', 'always'],
  ['ESSAY-HISTORY', 'always'],
  ['ESSAY-ACCENT', 'always'],
  ['ESSAY-CORPUS', 'always'],
  ['ESSAY-RESEARCH', 'always'],
  ['ESSAY-OUTLINE', 'always'],
  ['ESSAY-INTERACTION', 'always'],
  ['ESSAY-DRAFT', 'always'],
  ['ESSAY-BODY-DYNAMIC', 'always'],
  ['ESSAY-BUILD', 'always'],
  ['ESSAY-SIGNOFF', 'always'],
  ['ESSAY-PUBLISH', 'always'],
  ['ESSAY-BODY-PUBLIC', 'always'],
  ['ESSAY-CROSSLINK', 'always'],
  ['MAP-FIELD-STATUS', 'publishable'],
  ['MAP-BASIS', 'publishable'],
  ['MAP-VERIFICATION', 'always'],
  ['MAP-IMAGE', 'always'],
  ['MAP-ATTRIBUTION', 'ready_for_build'],
  ['MAP-DEALER-ONLY', 'publishable'],
  ['MAP-MAKER-HELD', 'publishable'],
  ['MAP-PRIVATE-FIELD', 'always'],
  ['MAP-SCOPE', 'publishable'],
  ['CART-KIND', 'ready_for_build'],
  ['LAYER-THEME', 'publishable'],
  ['LAYER-TIME', 'publishable'],
  ['LAYER-FACET', 'always'],
  ['LAYER-GEOREF', 'ready_for_build'],
  ['LAYER-ASSET-SIZE', 'always'],
  ['PLACE-NAMES', 'publishable'],
  ['PLACE-LOCATION', 'publishable'],
  ['SRC-ENTRY', 'publishable'],
  ['BIB-CSL', 'always'],
  ['BIB-EDITION', 'always'],
  ['BIB-LISTED-HELD', 'publishable'],
  ['MIG-SLUG', 'always'],
  ['MIG-LEGACY', 'always'],
  ['MIG-IMAGE-CLEARED', 'always'],
];

describe('no rule is weakened by spec 010 (SC-003)', () => {
  const registered = new Map(ALL_RULES.map((rule) => [rule.id, rule.from] as const));

  it('lists the 92 rules registered before spec 010', () => {
    expect(BEFORE_SPEC_010).toHaveLength(92);
  });

  it.each(BEFORE_SPEC_010)('%s is still registered, as an error from %s', (id, from) => {
    expect(registered.get(id)).toBe(from);
  });
});
