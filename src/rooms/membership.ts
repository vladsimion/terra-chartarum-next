import { ROOM_IDS } from '../registry/families.js';
import type { PublicRecord } from '../registry/project.js';
import { list } from '../registry/values.js';

/*
 * Which rooms a record belongs to, derived once (ADR 0015, specs/007-rooms/contracts/membership.md).
 * Pure: public records in, plain data out. A room is never stored on a map or a layer; it comes from
 * the public essays that use them. Spec 007 adds `membership` (a room's own contents) to this module;
 * `roomsOf` is here first because spec 004's collection index calls it.
 */
export type RoomId = (typeof ROOM_IDS)[number];


/** The rooms an essay names, as ids of rooms that are in the input. */
function roomsNamedBy(essay: PublicRecord, present: ReadonlySet<string>): string[] {
  const selection = (essay.rooms ?? {}) as { primary?: unknown; secondary?: unknown };
  const named = [selection.primary, ...list(selection.secondary)].filter((id): id is string => typeof id === 'string');
  return named.filter((id) => present.has(id));
}

/** The rooms of a map, layer or essay, in the canonical order of the seven. */
export function roomsOf(record: PublicRecord, records: readonly PublicRecord[]): RoomId[] {
  const present = new Set(records.filter((r) => r.family === 'room').map((r) => r.id));
  const essays = records.filter((r) => r.family === 'essay');
  let carrying: PublicRecord[];
  if (record.family === 'essay') carrying = [record];
  else if (record.family === 'map') carrying = essays.filter((e) => list(e.maps).includes(record.id));
  else if (record.family === 'layer') carrying = essays.filter((e) => list(e.layers).includes(record.id));
  else carrying = [];
  const ids = new Set(carrying.flatMap((e) => roomsNamedBy(e, present)));
  return ROOM_IDS.filter((name) => ids.has(`tc:tc:room:${name}`));
}
