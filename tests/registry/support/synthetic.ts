import type { RegistryRecord } from '../../../src/registry/types.js';
import { localId } from './builders.js';

/** Small seeded PRNG (mulberry32), no dependency. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ['alba', 'dacia', 'limes', 'tabula', 'via', 'portus', 'castra', 'flumen', 'mons', 'urbs', 'ager', 'pons'];

/** Families the generator cycles through. Later stories add the shapes they need. */
export const GENERATED_FAMILIES = [
  'place',
  'source',
  'map',
  'cartographer',
  'dataset',
  'route',
  'event',
  'period',
  'layer',
  'collection',
  'essay',
] as const;

/** Lifecycles that never trigger an error on a minimal record. */
const LIFECYCLES = ['proposed', 'researching', 'verified'] as const;

/**
 * A valid registry of exactly `count` records, deterministic for a given seed. References between
 * records resolve. Does not include the seven rooms (`rooms()` in builders.ts does).
 * Used by the mutation suite (SC-003) and the timing test (SC-004).
 */
export function generateRegistry(count: number, seed: number): RegistryRecord[] {
  const rng = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const counters = new Map<string, number>();
  const records: RegistryRecord[] = [];
  const idsByFamily = new Map<string, string[]>();

  for (let i = 0; i < count; i += 1) {
    const family = GENERATED_FAMILIES[i % GENERATED_FAMILIES.length] as string;
    const n = (counters.get(family) ?? 0) + 1;
    counters.set(family, n);
    const local = localId(family, n);
    const id = `tc:tc:${family}:${local}`;
    idsByFamily.set(family, [...(idsByFamily.get(family) ?? []), id]);
    records.push({
      id,
      family,
      origin: 'minted',
      title: `${pick(WORDS)} ${pick(WORDS)} ${n}`,
      slug: `${family}-${n}-${pick(WORDS)}`,
      slug_history: [],
      lifecycle: pick(LIFECYCLES),
      release: 'held',
      relations: [],
      file: `content/${family}/${local}.yaml`,
    });
  }

  // Second pass: references, once every id exists.
  const some = (family: string, max: number): string[] => {
    const ids = idsByFamily.get(family) ?? [];
    return ids.length === 0 ? [] : Array.from({ length: Math.min(max, 1 + Math.floor(rng() * max)) }, () => pick(ids));
  };
  const unique = (ids: string[]) => [...new Set(ids)];
  for (const record of records) {
    if (rng() < 0.2) record.relations = unique(some(pick(GENERATED_FAMILIES), 2)).filter((id) => id !== record.id);
    if (record.family === 'essay') {
      record.maps = unique(some('map', 2));
      record.places = unique(some('place', 3));
      record.sources = unique(some('source', 2));
    } else if (record.family === 'map') {
      record.makers = unique(some('cartographer', 1));
    } else if (record.family === 'layer') {
      const dataset = some('dataset', 1)[0];
      if (dataset) record.dataset = dataset;
    } else if (record.family === 'collection') {
      const members = unique(some('layer', 3));
      record.members = members;
      record.default_layers = members.slice(0, 1);
    }
  }
  return records;
}
