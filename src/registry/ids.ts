import { FAMILIES, type Family } from './vocab.ts';

/**
 * Identifier grammar (research.md R3). Stored IDs are local IDs, unique within
 * (authority, family). At export boundaries they are qualified as
 * `tc:{authority}:{family}:{local-id}` (TC-D016).
 */

export const DEFAULT_AUTHORITY = 'tc';

export const LOCAL_ID_RULE = '[a-z0-9][a-z0-9._-]{0,127}';
export const AUTHORITY_RULE = '[a-z][a-z0-9]{1,15}';

const LOCAL_ID = new RegExp(`^${LOCAL_ID_RULE}$`);
const AUTHORITY = new RegExp(`^${AUTHORITY_RULE}$`);

export function isLocalId(value: string): boolean {
  return LOCAL_ID.test(value);
}

export function isAuthority(value: string): boolean {
  return AUTHORITY.test(value);
}

export function isFamily(value: string): value is Family {
  return (FAMILIES as readonly string[]).includes(value);
}

/** The qualified export form of an identity. */
export function qualify(authority: string, family: string, localId: string): string {
  return `tc:${authority}:${family}:${localId}`;
}

/** A reference inside a record: `family:local-id` or `authority:family:local-id`. */
export const REF_RULE = `(${AUTHORITY_RULE}:)?[a-z]+:${LOCAL_ID_RULE}`;
const REF = new RegExp(`^(?:(${AUTHORITY_RULE}):)?([a-z]+):(${LOCAL_ID_RULE})$`);

export interface Ref {
  authority: string;
  family: string;
  id: string;
}

/** Parse a reference string; `undefined` when it is malformed. */
export function parseRef(value: string): Ref | undefined {
  const match = REF.exec(value);
  if (match === null) return undefined;
  const [, authority, family, id] = match;
  return { authority: authority ?? DEFAULT_AUTHORITY, family: family!, id: id! };
}

/** A record's qualified ID, or `undefined` when it lacks a family or id. */
export function qualifiedIdOf(record: Record<string, unknown>): string | undefined {
  const family = record['family'];
  const id = record['id'];
  if (typeof family !== 'string' || typeof id !== 'string') return undefined;
  const authority = typeof record['authority'] === 'string' ? record['authority'] : DEFAULT_AUTHORITY;
  return qualify(authority, family, id);
}
