import { referenceFields } from '../schemas/references.js';
import { chainOf } from './automated.js';
import { refCollectionSubset } from './collections.js';
import { defineRule, type Finding } from './framework.js';

/** Every declared reference must resolve (US3.1, Constitution V). */
export const refUnknown = defineRule({
  id: 'REF-UNKNOWN',
  from: 'always',
  check: ({ records, index, options }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      for (const ref of referenceFields(record)) {
        if (!index.has(ref.id)) {
          findings.push({
            record,
            field: ref.field,
            value: ref.id,
            expected: 'the id of an existing record',
          });
        }
      }
      // provenance_chain points at logged steps, not entities; judged only when steps were supplied
      if (options.provenanceIndex) {
        chainOf(record).forEach((stepId, i) => {
          if (!options.provenanceIndex?.has(stepId)) {
            findings.push({
              record,
              field: `provenance_chain[${i}]`,
              value: stepId,
              expected: 'the id of a logged step under provenance/',
            });
          }
        });
      }
    }
    return findings;
  },
});

export const REFERENCE_RULES = [refUnknown, refCollectionSubset];
