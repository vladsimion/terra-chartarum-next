import { ROOM_IDS } from '../families.js';
import { defineRule, type Finding } from './framework.js';

/** Exactly the seven fixed rooms must exist, no more and no fewer (ADR 0003 §7). */
export const roomSet = defineRule({
  id: 'ROOM-SET',
  from: 'always',
  completeness: true,
  check: ({ records }) => {
    const findings: Finding[] = [];
    const expected = new Map<string, string>(ROOM_IDS.map((name) => [`tc:tc:room:${name}`, name]));
    const present = new Set<string>();

    for (const record of records) {
      if (record.family !== 'room') continue;
      present.add(record.id);
      if (!expected.has(record.id)) {
        findings.push({
          record,
          field: 'id',
          value: record.id,
          expected: `one of the seven fixed rooms: ${ROOM_IDS.join(', ')}`,
        });
      }
    }
    for (const [id, name] of expected) {
      if (!present.has(id)) {
        findings.push({
          record: { id, file: `content/room/${name}.yaml` },
          field: null,
          value: null,
          expected: `a room record with id ${id}`,
        });
      }
    }
    return findings;
  },
});
