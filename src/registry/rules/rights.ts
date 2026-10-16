import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

/** Families whose records need rights and licence information (Constitution VI). */
const NEEDS_RIGHTS = new Set(['evidence', 'layer', 'dataset', 'map']);

function rightsOf(record: RegistryRecord): Record<string, unknown> | null {
  const rights = record.rights;
  return rights !== null && typeof rights === 'object' ? (rights as Record<string, unknown>) : null;
}

/** Every dataset, feature, image and claim carries rights and a licence. */
export const rightsMissing = defineRule({
  id: 'RIGHTS-MISSING',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (!NEEDS_RIGHTS.has(record.family)) continue;
      const rights = rightsOf(record);
      if (!rights) {
        findings.push({ record, field: 'rights', value: null, expected: 'a rights object with a licence' });
      } else if (typeof rights.licence !== 'string' || rights.licence.trim() === '') {
        findings.push({ record, field: 'rights.licence', value: rights.licence ?? null, expected: 'a non-empty licence' });
      }
    }
    return findings;
  },
});

/**
 * Images need reproduction rights cleared. That is a separate fact from the text being out of
 * copyright, so `text_public_domain` never satisfies it (Constitution VI).
 */
export const rightsCleared = defineRule({
  id: 'RIGHTS-CLEARED',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const images = record.images;
      if (!Array.isArray(images) || images.length === 0) continue;
      if (rightsOf(record)?.reproduction_cleared !== true) {
        findings.push({
          record,
          field: 'rights.reproduction_cleared',
          value: rightsOf(record)?.reproduction_cleared ?? null,
          expected: 'reproduction_cleared: true before publishing images',
        });
      }
    }
    return findings;
  },
});

export const RIGHTS_RULES = [rightsMissing, rightsCleared];
