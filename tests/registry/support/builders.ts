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
  return {
    id: `tc:tc:${family}:${local}`,
    family,
    origin: 'minted',
    title: `${family} ${n}`,
    slug: `${family}-${n}`,
    slug_history: [],
    lifecycle: 'researching',
    release: 'held',
    relations: [],
    file: `content/${family}/${local}.yaml`,
    ...overrides,
  };
}

export const place = (n = 1, o: Partial<RegistryRecord> = {}) => record('place', n, o);
export const source = (n = 1, o: Partial<RegistryRecord> = {}) => record('source', n, o);
export const map = (n = 1, o: Partial<RegistryRecord> = {}) => record('map', n, o);
