import type { RegistryRecord } from '../../../src/registry/types.js';

export function localId(family: string, n: number): string {
  return `${family}-${String(n).padStart(6, '0')}`;
}

export function stableId(family: string, n: number, authority = 'tc'): string {
  return `tc:${authority}:${family}:${localId(family, n)}`;
}

/**
 * A valid, minted record by default, so a test states only what it changes.
 * Family-specific required fields are added by the builders for those families.
 */
export function record(family: string, n = 1, overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  const local = localId(family, n);
  const merged: RegistryRecord = {
    id: `tc:tc:${family}:${local}`,
    family,
    origin: 'minted',
    title: `${family} ${n}`,
    slug: `${family}-${n}`,
    slug_history: [],
    lifecycle: 'researching',
    release: 'held',
    relations: [],
    file: '',
    ...overrides,
  };
  // The file follows the id unless a test sets it, so path rules stay quiet in unrelated tests.
  if (overrides.file === undefined) {
    const m = /^tc:[^:]*:([^:]*):(.*)$/.exec(merged.id);
    merged.file = m ? `content/${m[1]}/${m[2]}.yaml` : `content/${family}/${local}.yaml`;
  }
  return merged;
}

export const ROOM_NAMES = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'] as const;

/** The seven fixed rooms (ADR 0003 §7): permanent ids, not counters. */
export function rooms(): RegistryRecord[] {
  return ROOM_NAMES.map((name) => ({
    id: `tc:tc:room:${name}`,
    family: 'room',
    origin: 'minted',
    title: name.charAt(0).toUpperCase() + name.slice(1),
    slug: name,
    slug_history: [],
    lifecycle: 'researching',
    release: 'held',
    relations: [],
    file: `content/room/${name}.yaml`,
  }));
}

export const place =(n = 1, o: Partial<RegistryRecord> = {}) => record('place', n, o);
export const source = (n = 1, o: Partial<RegistryRecord> = {}) => record('source', n, o);
export const map = (n = 1, o: Partial<RegistryRecord> = {}) => record('map', n, o);
