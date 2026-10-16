import { referenceFields } from '../schemas/references.js';
import { refCollectionSubset } from './collections.js';
import { defineRule, type Finding } from './framework.js';

/** Every declared reference must resolve (US3.1, Constitution V). */
export const refUnknown = defineRule({
  id: 'REF-UNKNOWN',
  from: 'always',
  check: ({ records, index }) => {
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
    }
    return findings;
  },
});

export const REFERENCE_RULES = [refUnknown, refCollectionSubset];
