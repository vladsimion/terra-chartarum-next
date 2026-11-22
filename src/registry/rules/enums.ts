import { AUTHORITIES } from '../families.js';
import { BIBLIOGRAPHY_SECTIONS } from '../schemas/bibliography-section.js';
import {
  ANALYTICAL_DIMENSION_VALUES,
  ATTESTATION_FORM_VALUES,
  CONFIDENCE_VALUES,
  EVIDENCE_TYPE_VALUES,
  GEOMETRY_PROVENANCE_VALUES,
  LAYER_ROLE_VALUES,
  LOCATOR_STATE_VALUES,
  PORTAL_DIMENSION_VALUES,
  PROPOSED_BY_VALUES,
  SILENCE_STATE_VALUES,
} from '../schemas/shared.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

/** Plain values at a dotted path, or undefined. */
function at(record: RegistryRecord, dotted: string): unknown {
  let current: unknown = record;
  for (const part of dotted.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/*
 * Enumerated fields other rules do not own. `lifecycle`, `release` and `origin` are checked by
 * LIFE-VALUE, REL-VALUE and ID-ORIGIN. Membership is checked here, on plain strings, so records
 * from disk and records built in memory are judged alike (contracts/module-api.md).
 */
const ENUM_FIELDS: { path: string; values: readonly string[] }[] = [
  { path: 'confidence', values: CONFIDENCE_VALUES },
  { path: 'geometry_provenance', values: GEOMETRY_PROVENANCE_VALUES },
  { path: 'evidence_type', values: EVIDENCE_TYPE_VALUES },
  { path: 'silence_state', values: SILENCE_STATE_VALUES },
  { path: 'form', values: ATTESTATION_FORM_VALUES },
  { path: 'role', values: LAYER_ROLE_VALUES },
  { path: 'locator.state', values: LOCATOR_STATE_VALUES },
  { path: 'locator.proposed_by', values: PROPOSED_BY_VALUES },
  { path: 'section', values: BIBLIOGRAPHY_SECTIONS },
];

/**
 * Every entry of a list field must be a known value. `strict` also reports a field that is present
 * but not a list (analytical_dimensions, ADR 0020); portal_dimensions keeps its looser original check.
 */
function listMembers(record: RegistryRecord, field: string, values: readonly string[], strict: boolean): Finding[] {
  const list = record[field];
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    return strict ? [{ record, field, value: list, expected: `a list of ${values.join(' | ')}` }] : [];
  }
  const findings: Finding[] = [];
  list.forEach((value, i) => {
    if (typeof value !== 'string' || !values.includes(value)) {
      findings.push({ record, field: `${field}[${i}]`, value, expected: `one of ${values.join(' | ')}` });
    }
  });
  return findings;
}

export const enumInvalid = defineRule({
  id: 'ENUM-INVALID',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      for (const { path, values } of ENUM_FIELDS) {
        const value = at(record, path);
        if (value === undefined) continue;
        if (typeof value !== 'string' || !values.includes(value)) {
          findings.push({ record, field: path, value, expected: `one of ${values.join(' | ')}` });
        }
      }
      findings.push(...listMembers(record, 'portal_dimensions', PORTAL_DIMENSION_VALUES, false));
      findings.push(...listMembers(record, 'analytical_dimensions', ANALYTICAL_DIMENSION_VALUES, true));
    }
    return findings;
  },
});

const SAME_AS_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export const sameAsSyntax = defineRule({
  id: 'SAMEAS-SYNTAX',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      (record.same_as ?? []).forEach((entry, i) => {
        if (!(AUTHORITIES as readonly string[]).includes(entry.authority)) {
          findings.push({
            record,
            field: `same_as[${i}].authority`,
            value: entry.authority,
            expected: `an allowlisted authority: ${AUTHORITIES.join(', ')}`,
          });
        }
        if (typeof entry.id !== 'string' || !SAME_AS_ID.test(entry.id)) {
          findings.push({ record, field: `same_as[${i}].id`, value: entry.id, expected: 'an id matching [A-Za-z0-9][A-Za-z0-9._:-]*' });
        }
      });
    }
    return findings;
  },
});

export const ENUM_RULES = [enumInvalid, sameAsSyntax];
