import { isPublic } from '../publication.js';
import {
  ATTRIBUTION_VALUES,
  BASIS_FIELDS,
  BASIS_VALUES,
  CARTOGRAPHER_KIND_VALUES,
  CARTOGRAPHER_ROLE_VALUES,
  COMMERCIAL_SOURCE_KINDS,
  DISPLAYED_FIELDS,
  FIELD_STATUS_VALUES,
  IMAGE_TYPE_VALUES,
  PRIVATE_WORDS,
  RECORD_SCOPE_VALUES,
  VERIFICATION_VALUES,
  WITNESS_KIND_VALUES,
} from '../schemas/map-values.js';
import type { RegistryRecord } from '../types.js';
import { isObject, list as listOf, present } from '../values.js';
import { defineRule, severityFor, type Finding, type Rule } from './framework.js';

/*
 * Rules for maps and cartographers (spec 004, contracts/map-rule-ids.md). A rule whose table row
 * has a "warn from" lifecycle says nothing before that lifecycle; from it, a finding is a warning
 * until the "error from" lifecycle. Rules with no "warn from" are warnings below their threshold,
 * as everywhere else in the registry.
 */

const includes = (values: readonly string[], value: unknown): boolean => typeof value === 'string' && values.includes(value);

/** True from `ready_for_build`, where the map rules start to speak. */
const started = (record: RegistryRecord): boolean => severityFor('ready_for_build', record.lifecycle) === 'error';
/** True from `publishable`, where a warning becomes an error. */
const atPublishable = (record: RegistryRecord): boolean => severityFor('publishable', record.lifecycle) === 'error';

const scopeOf = (record: RegistryRecord): string => (typeof record.record_scope === 'string' ? record.record_scope : 'object');
/** A single physical object has a witness; a work or a concept has none (ADR 0016). */
const isObjectScope = (record: RegistryRecord): boolean => !includes(['work', 'concept'], record.record_scope);

function maps(records: readonly RegistryRecord[]): RegistryRecord[] {
  return records.filter((r) => r.family === 'map');
}

/** `YYYY-MM-DD` that is a real calendar day. */
function isIsoDay(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isHttps = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** A value or a status for each displayed field (FR-002). */
export const mapFieldStatus = defineRule({
  id: 'MAP-FIELD-STATUS',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!started(record)) continue;
      const statuses = isObject(record.field_status) ? record.field_status : {};
      for (const name of DISPLAYED_FIELDS) {
        const value = name === 'dimensions' ? isObject(record.dimensions) : present(record[name]);
        const status = statuses[name];
        if (status !== undefined && !includes(FIELD_STATUS_VALUES, status)) {
          findings.push({ record, field: `field_status.${name}`, value: status, expected: `one of ${FIELD_STATUS_VALUES.join(', ')}` });
        } else if (!value && status === undefined) {
          findings.push({ record, field: name, value: null, expected: `a value, or a field_status entry saying why there is none (${name})` });
        } else if (!value && status === 'recorded') {
          findings.push({ record, field: name, value: null, expected: `a value, because the status recorded needs a value (${name})` });
        } else if (value && status !== undefined && status !== 'recorded') {
          findings.push({ record, field: `field_status.${name}`, value: status, expected: `recorded, because ${name} has a value` });
        }
      }
    }
    return findings;
  },
});

/** A held witness says whether its prose was observed or inferred; an institutional one has no basis (FR-002). */
export const mapBasis = defineRule({
  id: 'MAP-BASIS',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!started(record) || !isObjectScope(record)) continue;
      const basis = isObject(record.basis) ? record.basis : {};
      if (record.witness_kind === 'held') {
        for (const field of BASIS_FIELDS) {
          if (present(record[field]) && !includes(BASIS_VALUES, basis[field])) {
            findings.push({ record, field: `basis.${field}`, value: basis[field] ?? null, expected: `observed or inferred, because ${field} has a value on a held witness` });
          }
        }
      } else if (record.witness_kind === 'institutional' && record.basis !== undefined) {
        findings.push({ record, field: 'basis', value: record.basis, expected: 'no basis on an institutional witness' });
      }
    }
    return findings;
  },
});

/** How far a record has been checked, and when (FR-015). */
export const mapVerification = defineRule({
  id: 'MAP-VERIFICATION',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      const verification = record.verification ?? 'unverified';
      if (!includes(VERIFICATION_VALUES, verification)) {
        findings.push({ record, field: 'verification', value: verification, expected: `one of ${VERIFICATION_VALUES.join(', ')}` });
        continue;
      }
      if (verification !== 'unverified' && !isIsoDay(record.last_verified)) {
        findings.push({ record, field: 'last_verified', value: record.last_verified ?? null, expected: 'a date YYYY-MM-DD, because the record has been checked' });
      }
      if (verification === 'inspected' && record.witness_kind !== 'held') {
        findings.push({ record, field: 'verification', value: verification, expected: 'inspected only on a held witness' });
      }
    }
    return findings;
  },
});

/** Each image says what it is, where it is, who holds it and how it is described (FR-001, FR-004, FR-017). */
export const mapImage = defineRule({
  id: 'MAP-IMAGE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!Array.isArray(record.images)) continue;
      record.images.forEach((image: unknown, i: number) => {
        const at = `images[${i}]`;
        if (!isObject(image)) {
          findings.push({ record, field: at, value: null, expected: 'an image source object (type, url, attribution)' });
          return;
        }
        if (!includes(IMAGE_TYPE_VALUES, image.type)) findings.push({ record, field: `${at}.type`, value: image.type ?? null, expected: `one of ${IMAGE_TYPE_VALUES.join(', ')}` });
        if (!isHttps(image.url)) findings.push({ record, field: `${at}.url`, value: image.url ?? null, expected: 'an https URL' });
        if (!present(image.attribution)) findings.push({ record, field: `${at}.attribution`, value: null, expected: 'attribution naming the holder' });
        const needsStill = image.type === 'iiif' || image.type === 'deepzoom';
        if ((needsStill && !present(image.static_url)) || (present(image.static_url) && !isHttps(image.static_url))) {
          findings.push({ record, field: `${at}.static_url`, value: image.static_url ?? null, expected: 'an https URL for the still shown before the viewer opens (required for iiif and deepzoom)' });
        }
        if (isObjectScope(record) && image.witness_kind !== record.witness_kind) {
          findings.push({ record, field: `${at}.witness_kind`, value: image.witness_kind ?? null, expected: `the record's witness_kind (${String(record.witness_kind ?? 'none')})` });
        }
        if (!present(image.alt) && started(record)) {
          findings.push({ record, from: 'publishable', field: `${at}.alt`, value: null, expected: 'an authored description of the image' });
        }
      });
    }
    return findings;
  },
});

/** A workshop maker means the attribution is unresolved, and the reverse (FR-011). */
export const mapAttribution = defineRule({
  id: 'MAP-ATTRIBUTION',
  from: 'ready_for_build',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      const attribution = record.attribution ?? 'exact';
      if (!includes(ATTRIBUTION_VALUES, attribution)) {
        findings.push({ record, field: 'attribution', value: attribution, expected: `one of ${ATTRIBUTION_VALUES.join(', ')}` });
        continue;
      }
      const workshop = listOf(record.makers).some((id) => index.get(id)?.kind === 'workshop');
      if (workshop && attribution !== 'unresolved') {
        findings.push({ record, field: 'attribution', value: attribution, expected: 'unresolved, because a maker is a workshop' });
      } else if (!workshop && attribution === 'unresolved') {
        findings.push({ record, field: 'attribution', value: attribution, expected: 'exact, because no maker is a workshop' });
      }
    }
    return findings;
  },
});

/** What a record stands for decides what it may carry (FR-003, ADR 0016). */
export const mapScope = defineRule({
  id: 'MAP-SCOPE',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!started(record)) continue;
      if (record.record_scope !== undefined && !includes(RECORD_SCOPE_VALUES, record.record_scope)) {
        findings.push({ record, field: 'record_scope', value: record.record_scope, expected: `one of ${RECORD_SCOPE_VALUES.join(', ')}` });
        continue;
      }
      if (scopeOf(record) === 'object') {
        if (record.witness_kind !== undefined && !includes(WITNESS_KIND_VALUES, record.witness_kind)) {
          findings.push({ record, field: 'witness_kind', value: record.witness_kind, expected: `one of ${WITNESS_KIND_VALUES.join(', ')}` });
        } else if (record.witness_kind === undefined) {
          findings.push({ record, field: 'witness_kind', value: null, expected: 'a witness_kind on a record of a single object' });
        }
        continue;
      }
      const what = scopeOf(record);
      if (record.witness_kind !== undefined) findings.push({ record, field: 'witness_kind', value: record.witness_kind, expected: `no witness_kind on a ${what}` });
      if (present(record.images)) findings.push({ record, field: 'images', value: '[images]', expected: `no images on a ${what}` });
      if (record.verification === 'inspected') findings.push({ record, field: 'verification', value: record.verification, expected: `no inspected verification on a ${what}` });
      if (record.basis !== undefined) findings.push({ record, field: 'basis', value: record.basis, expected: `no basis on a ${what}` });
    }
    return findings;
  },
});

/** An attribution is never supported by dealer or auction material alone, and a published one has support (FR-016). */
export const mapDealerOnly = defineRule({
  id: 'MAP-DEALER-ONLY',
  from: 'publishable',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!started(record)) continue;
      const ids = listOf(record.attribution_evidence);
      if (ids.length === 0) {
        if (atPublishable(record)) findings.push({ record, field: 'attribution_evidence', value: null, expected: 'at least one evidence record supporting the attribution' });
        continue;
      }
      const kinds = ids
        .map((id) => index.get(id))
        .filter((evidence): evidence is RegistryRecord => evidence !== undefined)
        .map((evidence) => index.get(String(evidence.source))?.source_kind);
      if (kinds.length > 0 && kinds.every((kind) => includes(COMMERCIAL_SOURCE_KINDS, kind))) {
        findings.push({ record, field: 'attribution_evidence', value: ids, expected: 'at least one source that is not a dealer or an auction' });
      }
    }
    return findings;
  },
});

/** A map meant to be public has makers that are public (FR-012). */
export const mapMakerHeld = defineRule({
  id: 'MAP-MAKER-HELD',
  from: 'publishable',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of maps(records)) {
      if (!started(record) || record.release !== 'released') continue;
      listOf(record.makers).forEach((id, i) => {
        const maker = index.get(id);
        if (maker && !isPublic(maker)) findings.push({ record, field: `makers[${i}]`, value: id, expected: 'a maker that is published and released' });
      });
    }
    return findings;
  },
});

/** Where an acquisition key is, as a path; the value is never repeated because it is private. */
function privateKeys(value: unknown, path: string, out: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => privateKeys(item, `${path}[${i}]`, out));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const here = path === '' ? key : `${path}.${key}`;
      if (includes(PRIVATE_WORDS, key.toLowerCase())) out.push(here);
      privateKeys(child, here, out);
    }
  }
}

/** Acquisition details never enter the registry, in any family, at any depth (FR-010). */
export const mapPrivateField = defineRule({
  id: 'MAP-PRIVATE-FIELD',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const { file: _file, body: _body, ...fields } = record;
      const paths: string[] = [];
      privateKeys(fields, '', paths);
      for (const path of paths) {
        findings.push({ record, field: path, value: '[private value]', expected: 'no acquisition detail (price, paid, cost, negotiation, vendor, dealer_contact, invoice, receipt) in the registry' });
      }
    }
    return findings;
  },
});

/** A cartographer is a person or a workshop, with roles from three (FR-001, FR-011). */
export const cartKind = defineRule({
  id: 'CART-KIND',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'cartographer') continue;
      if (record.kind !== undefined && !includes(CARTOGRAPHER_KIND_VALUES, record.kind)) {
        findings.push({ record, field: 'kind', value: record.kind, expected: `one of ${CARTOGRAPHER_KIND_VALUES.join(', ')}` });
      }
      if (Array.isArray(record.roles)) {
        record.roles.forEach((role: unknown, i: number) => {
          if (!includes(CARTOGRAPHER_ROLE_VALUES, role)) findings.push({ record, field: `roles[${i}]`, value: role, expected: `one of ${CARTOGRAPHER_ROLE_VALUES.join(', ')}` });
        });
      }
      if (record.kind === 'workshop' && present(record.life_dates)) {
        findings.push({ record, field: 'life_dates', value: record.life_dates, expected: 'no life_dates on a workshop (use active)' });
      }
    }
    return findings;
  },
});

export const MAP_RULES: Rule[] = [mapFieldStatus, mapBasis, mapVerification, mapImage, mapAttribution, mapDealerOnly, mapMakerHeld, mapPrivateField, mapScope, cartKind];
