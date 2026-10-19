import { ROOM_IDS } from '../families.js';
import { isPublic } from '../publication.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, severityFor, type Finding } from './framework.js';

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

const rooms = (records: readonly RegistryRecord[]) => records.filter((r) => r.family === 'room');
const blank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

/**
 * All seven rooms are published and released, at every lifecycle (spec 007 FR-005, ADR 0015): a room
 * that is not public breaks every link to it, so this is not ranked by lifecycle like other rules.
 */
export const roomPublic = defineRule({
  id: 'ROOM-PUBLIC',
  from: 'always',
  check: ({ records }) =>
    rooms(records)
      .filter((room) => !isPublic(room))
      .map((room) => ({ record: room, field: 'release', value: `${room.lifecycle ?? ''}/${room.release ?? ''}`, expected: 'a room that is published and released' })),
});

/**
 * The room's own fields (spec 007 FR-004): `order` is its place in the canonical seven, `copy_status`
 * is draft or final, and the description and body file are asked for from ready_for_build (a warning,
 * then an error from publishable). A room marked final has both, whatever its lifecycle.
 */
export const roomCopy = defineRule({
  id: 'ROOM-COPY',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const room of rooms(records)) {
      const expectedOrder = (ROOM_IDS as readonly string[]).indexOf(String(room.id).split(':').pop() ?? '') + 1;
      if (expectedOrder > 0 && room.order !== expectedOrder) {
        findings.push({ record: room, from: 'always', field: 'order', value: room.order ?? null, expected: `${expectedOrder}, the place of this room in the canonical seven` });
      }
      if (room.copy_status !== undefined && room.copy_status !== 'draft' && room.copy_status !== 'final') {
        findings.push({ record: room, from: 'always', field: 'copy_status', value: room.copy_status, expected: 'draft or final' });
      }
      const final = room.copy_status === 'final';
      const started = severityFor('ready_for_build', room.lifecycle) === 'error';
      for (const [field, text] of [['short_description', room.short_description], ['body', room.body]] as const) {
        if (!blank(text)) continue;
        if (final) findings.push({ record: room, from: 'always', field, value: null, expected: `a ${field === 'body' ? 'long description' : 'short description'} on a room marked final` });
        else if (started) findings.push({ record: room, field, value: null, expected: `a ${field === 'body' ? 'long description file beside the record' : 'short description'}` });
      }
    }
    return findings;
  },
});
