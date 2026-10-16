import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

interface Locator {
  value?: unknown;
  state?: unknown;
  proposed_by?: unknown;
  verified_by?: unknown;
  verified_on?: unknown;
  consulted_copy?: unknown;
}

function locatorOf(record: RegistryRecord): Locator | null {
  const locator = record.locator;
  return locator !== null && typeof locator === 'object' ? (locator as Locator) : null;
}

const blank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

/** A locator is `verified` only when a person has read the page, with date and copy recorded (ADR 0003 §4). */
export const locVerifiedFields = defineRule({
  id: 'LOC-VERIFIED-FIELDS',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const locator = locatorOf(record);
      if (locator?.state !== 'verified') continue;
      for (const field of ['verified_by', 'verified_on', 'consulted_copy'] as const) {
        if (blank(locator[field])) {
          findings.push({
            record,
            field: `locator.${field}`,
            value: locator[field] ?? null,
            expected: `${field} on a verified locator (verified_by, verified_on and consulted_copy are all required)`,
          });
        }
      }
    }
    return findings;
  },
});

/*
 * Words that identify an automated verifier. The gate cannot know who a person is, so this is a
 * guard against the obvious mistake of recording the tool that proposed a locator as its verifier.
 */
export const AUTOMATED = /\b(ai|llm|gpt|claude|gemini|copilot|chatbot|bot)\b/i;

/** Locators found or proposed by AI stay pending until a person confirms them against the page. */
export const locAiVerified = defineRule({
  id: 'LOC-AI-VERIFIED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const locator = locatorOf(record);
      if (locator?.state !== 'verified' || locator.proposed_by !== 'ai') continue;
      if (blank(locator.verified_by) || AUTOMATED.test(String(locator.verified_by))) {
        findings.push({
          record,
          field: 'locator.verified_by',
          value: locator.verified_by ?? null,
          expected: 'the name of a person who read the page; an AI-proposed locator stays pending until then',
        });
      }
    }
    return findings;
  },
});

/** A claim rated `secure` MUST NOT rest on a pending locator (Constitution VI). */
export const locSecurePending = defineRule({
  id: 'LOC-SECURE-PENDING',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.confidence === 'secure' && locatorOf(record)?.state === 'pending') {
        findings.push({
          record,
          field: 'confidence',
          value: 'secure',
          expected: 'a verified locator for a secure claim, or a lower confidence',
        });
      }
    }
    return findings;
  },
});

/** A finding aid helps find sources; it is never itself cited as evidence (ADR 0003 §5, stage 5). */
export const refFindingAid = defineRule({
  id: 'REF-FINDING-AID',
  from: 'ready_for_build',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'evidence' && record.family !== 'attestation') continue;
      const cited = typeof record.source === 'string' ? index.get(record.source) : undefined;
      if (cited?.is_finding_aid === true) {
        findings.push({
          record,
          field: 'source',
          value: record.source,
          expected: 'a source that is not a finding aid',
        });
      }
    }
    return findings;
  },
});

export const LOCATOR_RULES = [locVerifiedFields, locAiVerified, locSecurePending, refFindingAid];
