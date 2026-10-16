import {
  LEGACY_CONFIDENCE_MAP,
  LEGACY_FAMILY_PORT,
  LEGACY_FAMILY_PROJECT,
  LEGACY_LAYER_LIFECYCLE_MAP,
} from '../schemas/import.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

/*
 * `editor_confirmed: true` means the editor has accepted the import. Until then an imported record
 * must look exactly as the import rules say; after it, the record follows its own lifecycle and
 * these rules stop constraining it, so they never block later editing.
 */
const unconfirmed = (r: RegistryRecord) => r.editor_confirmed !== true;
const blank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

/** `port` imports as a `place` with a port place type; `project` is not imported (ADR 0006 item 12). */
export const importFamily = defineRule({
  id: 'IMPORT-FAMILY',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.legacy_family === LEGACY_FAMILY_PROJECT) {
        findings.push({
          record,
          field: 'legacy_family',
          value: LEGACY_FAMILY_PROJECT,
          expected: 'no import: a project is a delivery concept, not a scholarly entity',
        });
      } else if (record.legacy_family === LEGACY_FAMILY_PORT) {
        if (record.family !== 'place') {
          findings.push({ record, field: 'family', value: record.family, expected: 'place (a legacy port imports as a place)' });
        } else if (record.place_type !== 'port') {
          findings.push({ record, field: 'place_type', value: record.place_type ?? null, expected: 'port' });
        }
      }
    }
    return findings;
  },
});

/** Imported confidence follows the mapping and is never secure until a person promotes it (ADR 0006 item 13). */
export const importConfidence = defineRule({
  id: 'IMPORT-CONFIDENCE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.legacy_confidence === undefined || !unconfirmed(record)) continue;
      const mapped = LEGACY_CONFIDENCE_MAP[String(record.legacy_confidence)];
      if (mapped === undefined) {
        findings.push({
          record,
          field: 'legacy_confidence',
          value: record.legacy_confidence,
          expected: `one of ${Object.keys(LEGACY_CONFIDENCE_MAP).join(' | ')}`,
        });
      } else if (record.confidence !== mapped) {
        findings.push({
          record,
          field: 'confidence',
          value: record.confidence ?? null,
          expected: `${mapped} (legacy ${String(record.legacy_confidence)}); never secure on import`,
        });
      }
    }
    return findings;
  },
});

/** Legacy review state is not lifecycle: an unconfirmed import starts at `researching` (ADR 0006 item 14). */
export const importReview = defineRule({
  id: 'IMPORT-REVIEW',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.legacy_review_state === undefined || record.family === 'layer' || !unconfirmed(record)) continue;
      if (record.lifecycle !== 'researching') {
        findings.push({
          record,
          field: 'lifecycle',
          value: record.lifecycle ?? null,
          expected: 'researching until the editor confirms the import',
        });
      }
    }
    return findings;
  },
});

/** FR-011: layers follow the mapped lifecycle and stay held until the editor releases them. */
export const importLayerLifecycle = defineRule({
  id: 'IMPORT-LAYER-LIFECYCLE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'layer' || record.legacy_layer_status === undefined || !unconfirmed(record)) continue;
      const mapped = LEGACY_LAYER_LIFECYCLE_MAP[String(record.legacy_layer_status)];
      if (mapped === undefined) {
        findings.push({
          record,
          field: 'legacy_layer_status',
          value: record.legacy_layer_status,
          expected: `one of ${Object.keys(LEGACY_LAYER_LIFECYCLE_MAP).join(' | ')}`,
        });
        continue;
      }
      if (record.lifecycle !== mapped) {
        findings.push({ record, field: 'lifecycle', value: record.lifecycle ?? null, expected: `${mapped} (legacy ${String(record.legacy_layer_status)})` });
      }
      if (record.release !== 'held') {
        findings.push({ record, field: 'release', value: record.release ?? null, expected: 'held until the editor releases the layer' });
      }
    }
    return findings;
  },
});

/** Legacy reviewer data becomes verified_by/verified_on only after the editor confirms it (ADR 0006 item 14). */
export const importReviewer = defineRule({
  id: 'IMPORT-REVIEWER',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if ((record.legacy_reviewer === undefined && record.legacy_review_date === undefined) || !unconfirmed(record)) continue;
      const locator = record.locator !== null && typeof record.locator === 'object' ? (record.locator as Record<string, unknown>) : {};
      const carried: [string, unknown][] = [
        ['verified_by', record.verified_by],
        ['verified_on', record.verified_on],
        ['locator.verified_by', locator.verified_by],
        ['locator.verified_on', locator.verified_on],
      ];
      for (const [field, value] of carried) {
        if (!blank(value)) {
          findings.push({ record, field, value, expected: 'empty until the editor confirms the legacy reviewer data' });
        }
      }
    }
    return findings;
  },
});

export const IMPORT_RULES = [importFamily, importConfidence, importReview, importLayerLifecycle, importReviewer];
