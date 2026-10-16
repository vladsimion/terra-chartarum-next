import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

const isSilenceAttestation = (r: RegistryRecord) => r.family === 'attestation' && r.form === 'silence';

/** A silence is a source-bound attestation carrying exactly one typed state, never a null (US2.4, FR-004). */
export const silState = defineRule({
  id: 'SIL-STATE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter(isSilenceAttestation)) {
      const state = record.silence_state;
      if (typeof state !== 'string' || state.trim() === '') {
        findings.push({
          record,
          field: 'silence_state',
          value: state ?? null,
          expected: 'exactly one silence state on a silence attestation',
        });
      }
    }
    return findings;
  },
});

/** Silence states exist only on silence attestations. */
export const silMisplaced = defineRule({
  id: 'SIL-MISPLACED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.silence_state !== undefined && !isSilenceAttestation(record)) {
        findings.push({
          record,
          field: 'silence_state',
          value: record.silence_state,
          expected: 'silence_state only on an attestation whose form is silence',
        });
      }
    }
    return findings;
  },
});

/** A silence is only secure when the source's coverage is itself verified (ADR 0006 item 7). */
export const silSecure = defineRule({
  id: 'SIL-SECURE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records.filter(isSilenceAttestation)) {
      if (record.confidence === 'secure' && record.source_coverage_verified !== true) {
        findings.push({
          record,
          field: 'confidence',
          value: 'secure',
          expected: 'source_coverage_verified: true for a secure silence, or a lower confidence',
        });
      }
    }
    return findings;
  },
});

export const SILENCE_RULES = [silState, silMisplaced, silSecure];
