import { LIFECYCLE_VALUES, RELEASE_VALUES } from '../schemas/shared.js';
import { ESSAY_STAGES, isEssayStage, lifecycleFor } from '../stages.js';
import { defineRule, type Finding } from './framework.js';

/** Unknown lifecycle values fail validation (ADR 0003 §1). */
export const lifeValue = defineRule({
  id: 'LIFE-VALUE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (!(LIFECYCLE_VALUES as readonly string[]).includes(String(record.lifecycle))) {
        findings.push({
          record,
          field: 'lifecycle',
          value: record.lifecycle ?? null,
          expected: `one of ${LIFECYCLE_VALUES.join(' | ')}`,
        });
      }
    }
    return findings;
  },
});

/** An essay's lifecycle is derived from its editorial stage, never set by hand (US5.4). */
export const lifeEssayDerived = defineRule({
  id: 'LIFE-ESSAY-DERIVED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'essay') continue;
      // blocked and superseded are side states reachable from any stage
      if (record.lifecycle === 'blocked' || record.lifecycle === 'superseded') continue;
      if (!isEssayStage(record.stage)) {
        findings.push({ record, field: 'stage', value: record.stage ?? null, expected: `one of ${ESSAY_STAGES.join(' | ')}` });
        continue;
      }
      const derived = lifecycleFor(record.stage, record.design_qa_passed === true);
      if (record.lifecycle !== derived) {
        findings.push({
          record,
          field: 'lifecycle',
          value: record.lifecycle ?? null,
          expected: `${derived}, derived from stage ${record.stage}`,
        });
      }
    }
    return findings;
  },
});

/**
 * Availability (a runnable asset exists) is derived, never stored. A `published` layer whose asset
 * is missing fails the build (US5.5). Judged only when the asset index is supplied.
 */
export const lifeAvailability = defineRule({
  id: 'LIFE-AVAILABILITY',
  from: 'published',
  check: ({ records, options }) => {
    const findings: Finding[] = [];
    if (!options.assetIndex) return findings;
    for (const record of records) {
      if (record.family !== 'layer' || typeof record.asset !== 'string') continue;
      if (!options.assetIndex.has(record.asset)) {
        findings.push({ record, field: 'asset', value: record.asset, expected: 'a runnable asset that exists in the repository' });
      }
    }
    return findings;
  },
});

/** A superseded record names its successor or is marked withdrawn (FR-013). */
export const lifeSuperseded = defineRule({
  id: 'LIFE-SUPERSEDED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.lifecycle !== 'superseded') continue;
      if (record.superseded_by === record.id) {
        findings.push({ record, field: 'superseded_by', value: record.superseded_by, expected: 'a successor other than the record itself' });
      } else if (record.superseded_by === undefined && record.withdrawn !== true) {
        findings.push({
          record,
          field: 'superseded_by',
          value: null,
          expected: 'superseded_by naming the successor, or withdrawn: true when there is none',
        });
      }
    }
    return findings;
  },
});

/** Release is held or released; a record with no release is held (FR-015). */
export const relValue = defineRule({
  id: 'REL-VALUE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.release !== undefined && !(RELEASE_VALUES as readonly string[]).includes(String(record.release))) {
        findings.push({ record, field: 'release', value: record.release, expected: `one of ${RELEASE_VALUES.join(' | ')}` });
      }
    }
    return findings;
  },
});

export const LIFECYCLE_RULES = [lifeValue, lifeEssayDerived, lifeAvailability, lifeSuperseded, relValue];
