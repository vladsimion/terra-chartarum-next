import { parseStableId } from '../ids.js';
import { defineRule, type Finding } from './framework.js';

/** The filename is the local-id and the directory is the family (ADR 0006 item 2). */
export const loadPath = defineRule({
  id: 'LOAD-PATH',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const parsed = parseStableId(String(record.id));
      if (!parsed) continue;
      const expected = `content/${parsed.family}/${parsed.localId}.yaml`;
      if (record.file !== expected) {
        findings.push({ record, field: 'file', value: record.file, expected: `file at ${expected}` });
      }
    }
    return findings;
  },
});
