import type { ProvenanceStep } from '../schemas/provenance-step.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding, type RuleContext } from './framework.js';

const blank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

export function chainOf(record: RegistryRecord): string[] {
  return Array.isArray(record.provenance_chain) ? record.provenance_chain.filter((s): s is string => typeof s === 'string') : [];
}

/** Each resolvable step in each record's chain, with the field it came from. */
function stepsOf(ctx: RuleContext): { record: RegistryRecord; field: string; step: ProvenanceStep }[] {
  const index = ctx.options.provenanceIndex;
  if (!index) return [];
  const out: { record: RegistryRecord; field: string; step: ProvenanceStep }[] = [];
  for (const record of ctx.records) {
    chainOf(record).forEach((ref, i) => {
      const step = index.get(ref);
      if (step) out.push({ record, field: `provenance_chain[${i}]`, step });
    });
  }
  return out;
}

/** OCR/HTR/LLM output is never itself evidence: a person must adjudicate every step before publication (FR-008). */
export const autoUnadjudicated = defineRule({
  id: 'AUTO-UNADJUDICATED',
  from: 'publishable',
  check: (ctx) => {
    const findings: Finding[] = [];
    for (const { record, field, step } of stepsOf(ctx)) {
      const adjudicated = step.status === 'adjudicated' && !blank(step.adjudicated_by) && !blank(step.adjudicated_on);
      if (!adjudicated) {
        findings.push({
          record,
          field,
          value: step.id,
          expected: 'a step adjudicated by a named person, with adjudicated_by and adjudicated_on',
        });
      }
    }
    return findings;
  },
});

/** Every automated step is logged: tool, version, input, date. */
export const autoLog = defineRule({
  id: 'AUTO-LOG',
  from: 'ready_for_build',
  check: (ctx) => {
    const findings: Finding[] = [];
    for (const { record, field, step } of stepsOf(ctx)) {
      for (const key of ['tool', 'tool_version', 'input', 'ran_on'] as const) {
        const value = step[key];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          findings.push({ record, field, value: step.id, expected: `step ${step.id} must log ${key}` });
        }
      }
    }
    return findings;
  },
});

/** Large artefacts stay out of git, referenced by a checksummed url or shelfmark. */
export const autoArtefactHash = defineRule({
  id: 'AUTO-ARTEFACT-HASH',
  from: 'ready_for_build',
  check: (ctx) => {
    const findings: Finding[] = [];
    for (const { record, field, step } of stepsOf(ctx)) {
      if (step.artefact && blank(step.artefact.sha256)) {
        findings.push({ record, field, value: step.id, expected: `step ${step.id} artefact must carry a sha256 checksum` });
      }
    }
    return findings;
  },
});

export const AUTOMATED_RULES = [autoUnadjudicated, autoLog, autoArtefactHash];
