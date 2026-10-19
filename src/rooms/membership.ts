import { ROOM_IDS } from '../registry/families.js';
import type { PublicRecord } from '../registry/project.js';
import { list } from '../registry/values.js';

/*
 * Which rooms a record belongs to, derived once (ADR 0015, specs/007-rooms/contracts/membership.md).
 * Pure: public records in, plain data out. A room is never stored on a map or a layer; it comes from
 * the public essays that use them. `membership` is a room's own contents and `roomsOf` its inverse;
 * the Rooms pages, spec 004's collection index and spec 005's Atlas all read these two and nothing else.
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

export interface RoomMembership {
  room: RoomId;
  /** Essays whose primary room this is, in title order. */
  primaryEssays: PublicRecord[];
  /** Essays that name this room as a secondary one (and not as primary), in title order. */
  secondaryEssays: PublicRecord[];
  /** Maps listed by those essays, once each, in title order. */
  maps: PublicRecord[];
  /** Layers listed by those essays, once each, in title order. */
  layers: PublicRecord[];
}

const collator = new Intl.Collator('en', { sensitivity: 'base' });
const titleOrder = (a: PublicRecord, b: PublicRecord): number => collator.compare(String(a.title), String(b.title)) || collator.compare(String(a.slug), String(b.slug));

/** The records of a family that these essays list under `field`, once each; a reference with no record in the input is dropped. */
function listed(essays: readonly PublicRecord[], field: 'maps' | 'layers', family: string, byId: ReadonlyMap<string, PublicRecord>): PublicRecord[] {
  const found = new Map<string, PublicRecord>();
  for (const id of essays.flatMap((e) => list(e[field]))) {
    const record = byId.get(id);
    if (record?.family === family) found.set(id, record);
  }
  return [...found.values()].sort(titleOrder);
}

/** Each room that is in the input, in the canonical order of the seven, with the public essays, maps and layers that belong to it. */
export function membership(records: readonly PublicRecord[]): RoomMembership[] {
  const present = new Set(records.filter((r) => r.family === 'room').map((r) => r.id));
  const essays = records.filter((r) => r.family === 'essay');
  const byId = new Map(records.map((r) => [r.id, r]));
  return ROOM_IDS.filter((name) => present.has(`tc:tc:room:${name}`)).map((name) => {
    const id = `tc:tc:room:${name}`;
    const rooms = (essay: PublicRecord) => (essay.rooms ?? {}) as { primary?: unknown; secondary?: unknown };
    const primaryEssays = essays.filter((e) => rooms(e).primary === id).sort(titleOrder);
    const secondaryEssays = essays.filter((e) => rooms(e).primary !== id && list(rooms(e).secondary).includes(id)).sort(titleOrder);
    const inRoom = [...primaryEssays, ...secondaryEssays];
    return { room: name, primaryEssays, secondaryEssays, maps: listed(inRoom, 'maps', 'map', byId), layers: listed(inRoom, 'layers', 'layer', byId) };
  });
}
