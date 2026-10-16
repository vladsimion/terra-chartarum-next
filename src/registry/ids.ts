export interface ParsedId {
  authority: string;
  family: string;
  localId: string;
}

/*
 * Boundary form `tc:{authority}:{family}:{local-id}` (ADR 0001, ADR 0006 item 11). The live site's
 * pattern, with `_` allowed in the family segment so `bibliography_entry` fits. Every legacy id
 * still matches.
 */
const BOUNDARY = /^tc:([a-z0-9][a-z0-9-]*):([a-z][a-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9._:-]*)$/;

export const BOUNDARY_FORM = 'tc:{authority}:{family}:{local-id}';

export function parseStableId(id: string): ParsedId | null {
  const match = BOUNDARY.exec(id);
  if (!match) return null;
  return { authority: match[1] as string, family: match[2] as string, localId: match[3] as string };
}

export function formatStableId(parts: ParsedId): string {
  return `tc:${parts.authority}:${parts.family}:${parts.localId}`;
}

/** Minted local-ids are opaque, family-prefixed counters: `place-000123`. */
export function isCounterLocalId(family: string, localId: string): boolean {
  return new RegExp(`^${family}-\\d{6}$`).test(localId);
}

/** The counter of a minted local-id, or null when it is not in counter form. */
export function counterOf(family: string, localId: string): number | null {
  const match = new RegExp(`^${family}-(\\d{6})$`).exec(localId);
  return match ? Number(match[1]) : null;
}

export function formatCounterLocalId(family: string, counter: number): string {
  return `${family}-${String(counter).padStart(6, '0')}`;
}
