import { defineRule, type Finding } from './framework.js';

/** A collection owns defaults but never geometry: its default layers must be among its members (US3.2). */
export const refCollectionSubset = defineRule({
  id: 'REF-COLLECTION-SUBSET',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'collection') continue;
      const members = new Set(Array.isArray(record.members) ? (record.members as unknown[]) : []);
      const defaults = Array.isArray(record.default_layers) ? (record.default_layers as unknown[]) : [];
      defaults.forEach((layer, i) => {
        if (!members.has(layer)) {
          findings.push({
            record,
            field: `default_layers[${i}]`,
            value: layer,
            expected: 'a layer that is also listed in members',
          });
        }
      });
    }
    return findings;
  },
});
