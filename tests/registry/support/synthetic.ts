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

/** Families the generator spreads records over. Later stories add the shapes they need. */
const GENERATED_FAMILIES = ['place', 'source', 'map', 'cartographer', 'dataset', 'route', 'event', 'period'] as const;

/** Lifecycles that never trigger an error on a minimal record. */
const LIFECYCLES = ['proposed', 'researching', 'verified'] as const;

/**
 * A valid registry of exactly `count` records, deterministic for a given seed.
 * Used by the mutation suite (SC-003) and the timing test (SC-004).
 */
export function generateRegistry(count: number, seed: number): RegistryRecord[] {
  const rng = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const counters = new Map<string, number>();
  const records: RegistryRecord[] = [];

  for (let i = 0; i < count; i += 1) {
    const family = GENERATED_FAMILIES[i % GENERATED_FAMILIES.length] as string;
    const n = (counters.get(family) ?? 0) + 1;
    counters.set(family, n);
    const local = localId(family, n);
    records.push({
      id: `tc:tc:${family}:${local}`,
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
  return records;
}
