/** Closed list of entity families (spec FR-001, ADR 0006 item 10). Adding one needs a spec amendment. */
export const FAMILIES = [
  'essay',
  'map',
  'cartographer',
  'place',
  'source',
  'attestation',
  'dataset',
  'layer',
  'collection',
  'route',
  'event',
  'period',
  'room',
  'bibliography_entry',
  'evidence',
] as const;

export type Family = (typeof FAMILIES)[number];

/** Authority namespaces allowed in a Stable ID: `tc` for this project, plus external codes. */
export const AUTHORITIES = ['tc', 'pleiades', 'whg'] as const;

export type Authority = (typeof AUTHORITIES)[number];

/** The seven fixed rooms, in canonical order (ADR 0003 §7). */
export const ROOM_IDS = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'] as const;

export function isFamily(value: string): value is Family {
  return (FAMILIES as readonly string[]).includes(value);
}
