import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

function targetOf(record: RegistryRecord): { entity?: unknown; feature?: unknown } {
  const target = record.target;
  return target !== null && typeof target === 'object' ? (target as { entity?: unknown; feature?: unknown }) : {};
}

const isEvidence = (r: RegistryRecord) => r.family === 'evidence';

/** A claim about a single feature must say where the geometry came from (US2.1). */
export const provGeometry = defineRule({
  id: 'PROV-GEOMETRY',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter(isEvidence)) {
      if (targetOf(record).feature !== undefined && !record.geometry_provenance) {
        findings.push({
          record,
          field: 'geometry_provenance',
          value: null,
          expected: 'geometry provenance when the target is a feature',
        });
      }
    }
    return findings;
  },
});

/** Reconstructions are always flagged as such, never passed off as documentary evidence (Constitution III). */
export const provReconstruction = defineRule({
  id: 'PROV-RECONSTRUCTION',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter(isEvidence)) {
      if (record.geometry_provenance === 'scholarly_reconstruction' && record.reconstruction !== true) {
        findings.push({
          record,
          field: 'reconstruction',
          value: record.reconstruction ?? null,
          expected: 'reconstruction: true for a scholarly_reconstruction',
        });
      }
    }
    return findings;
  },
});

/** Every claim names its source and what kind of witness it is. */
export const provSource = defineRule({
  id: 'PROV-SOURCE',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter(isEvidence)) {
      for (const field of ['source', 'evidence_type'] as const) {
        if (!record[field]) {
          findings.push({ record, field, value: null, expected: `${field} on every evidence record` });
        }
      }
    }
    return findings;
  },
});

const HISTORICAL_ROLES = ['historical', 'evidence', 'map-overlay'];

/** Modern reference geometry is context only; it is never historical evidence (Constitution III). */
export const provModernAsEvidence = defineRule({
  id: 'PROV-MODERN-AS-EVIDENCE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.geometry_provenance !== 'modern_reference') continue;
      if (record.family === 'evidence') {
        findings.push({
          record,
          field: 'geometry_provenance',
          value: record.geometry_provenance,
          expected: 'historical geometry provenance; modern_reference is never evidence',
        });
      } else if (record.family === 'layer' && HISTORICAL_ROLES.includes(String(record.role))) {
        findings.push({
          record,
          field: 'geometry_provenance',
          value: record.geometry_provenance,
          expected: `a context role for modern_reference geometry (role is ${String(record.role)})`,
        });
      }
    }
    return findings;
  },
});

export const PROVENANCE_RULES = [provGeometry, provReconstruction, provSource, provModernAsEvidence];
