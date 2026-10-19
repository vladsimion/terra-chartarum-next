import { describe, expect, it } from 'vitest';
import { schemaFor } from '../../../src/registry/schemas/index.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { roomNamed, sevenRooms } from '../support/rooms.js';

/*
 * Spec 007 T004 (FR-004, FR-011, data-model.md): the room record carries `order`, `short_description`
 * and `copy_status`; the long description is the Markdown file beside it, attached by the loader as
 * `body`. The schema takes types only, as for every family: ROOM-COPY judges the values.
 */
const parse = (o: Record<string, unknown>) => schemaFor('room').safeParse(roomNamed('earth', o as never));

describe('the room schema', () => {
  it('loads a room with order, short_description and copy_status', () => {
    const parsed = parse({ order: 1, short_description: 'The ground under the map.', copy_status: 'draft' });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ order: 1, short_description: 'The ground under the map.', copy_status: 'draft' });
  });

  it('still loads a room without them, so an early record is not refused (ROOM-COPY judges it)', () => {
    expect(schemaFor('room').safeParse({ ...roomNamed('earth'), order: undefined, short_description: undefined, copy_status: undefined }).success).toBe(true);
  });

  it('takes order as a number and the other two as text', () => {
    expect(parse({ order: 'one' }).success).toBe(false);
    expect(parse({ short_description: 3 }).success).toBe(false);
    expect(parse({ copy_status: 3 }).success).toBe(false);
  });
});

describe('FAM-UNKNOWN for a room', () => {
  const fieldsOf = (records: ReturnType<typeof sevenRooms>) => validateRegistry(records, { completeness: true }).violations.filter((v) => v.rule === 'FAM-UNKNOWN').map((v) => v.field);

  it('accepts the three new fields and the loader’s body', () => {
    expect(fieldsOf(sevenRooms())).toEqual([]);
  });

  it('still rejects a field the room does not list', () => {
    expect(fieldsOf(sevenRooms().map((r) => (r.slug === 'earth' ? { ...r, accent: 'red' } : r)))).toEqual(['accent']);
  });
});
