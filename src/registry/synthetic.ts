import type { ProvenanceStep } from './schemas/provenance-step.js';
import type { RegistryRecord } from './types.js';

const localId = (family: string, n: number) => `${family}-${String(n).padStart(6, '0')}`;

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
  'attestation',
  'evidence',
] as const;

/** Lifecycles that never trigger an error on a minimal record. */
const LIFECYCLES = ['proposed', 'researching', 'verified'] as const;

export const GEOMETRY_FILE = 'data/layer.geojson';
export const STEP_ID = 'prov-0001';

/** The one logged step the generated evidence refers to. */
export function generatedProvenance(): Map<string, ProvenanceStep> {
  return new Map([
    [
      STEP_ID,
      {
        id: STEP_ID,
        tool: 'tesseract',
        tool_version: '5.3.0',
        input: { source: 'scan-1' },
        ran_on: '2026-09-01',
        status: 'adjudicated',
        adjudicated_by: 'V. Simion',
        adjudicated_on: '2026-09-02',
      },
    ],
  ]);
}

/** Feature ids of the one geometry file the generated layers point to. */
export function generatedFeatures(): Map<string, Set<string>> {
  return new Map([[GEOMETRY_FILE, new Set(['f-1', 'f-2'])]]);
}

/**
 * A valid registry of exactly `count` records, deterministic for a given seed. References between
 * records resolve. Does not include the seven rooms (`rooms()` in builders.ts does). Validate it
 * with `generatedProvenance()` and `generatedFeatures()` as options.
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

  // Second pass: family fields and references, once every id exists.
  const some = (family: string, max: number): string[] => {
    const ids = idsByFamily.get(family) ?? [];
    return ids.length === 0 ? [] : Array.from({ length: Math.min(max, 1 + Math.floor(rng() * max)) }, () => pick(ids));
  };
  const first = (family: string): string | undefined => some(family, 1)[0];
  const unique = (ids: string[]) => [...new Set(ids)];
  const rights = () => ({ licence: 'CC-BY-4.0' });
  let evidenceSeen = 0;

  for (const record of records) {
    if (rng() < 0.2) record.relations = unique(some(pick(GENERATED_FAMILIES), 2)).filter((id) => id !== record.id);
    switch (record.family) {
      case 'place':
        record.place_type = 'settlement';
        break;
      case 'essay':
        // an essay's lifecycle is derived from its stage, so pick the stage that yields it
        record.stage = ({ proposed: 'Concept', researching: 'Corpus', verified: 'Draft' } as Record<string, string>)[String(record.lifecycle)];
        record.rights = rights();
        record.maps = unique(some('map', 2));
        record.places = unique(some('place', 3));
        record.sources = unique(some('source', 2));
        record.evidence = unique(some('evidence', 2));
        break;
      case 'map':
        record.makers = unique(some('cartographer', 1));
        record.rights = rights();
        break;
      case 'dataset':
        record.version = '1.0.0';
        record.rights = rights();
        break;
      case 'layer': {
        record.role = 'historical';
        record.asset = `data/${record.id.split(':').pop()}.pmtiles`;
        record.geometry = GEOMETRY_FILE;
        record.geometry_provenance = 'georeferenced_trace';
        record.rights = rights();
        const dataset = first('dataset');
        if (dataset) record.dataset = dataset;
        break;
      }
      case 'collection': {
        const members = unique(some('layer', 3));
        record.members = members;
        record.default_layers = members.slice(0, 1);
        break;
      }
      case 'attestation':
        record.place = first('place');
        record.source = first('source');
        record.form = 'name';
        record.rights = rights();
        record.confidence = 'probable';
        break;
      case 'evidence': {
        evidenceSeen += 1;
        record.source = first('source');
        record.locator = { value: `p. ${evidenceSeen}`, state: 'pending', proposed_by: 'person' };
        record.evidence_type = 'textual';
        record.confidence = 'probable';
        record.rights = rights();
        if (evidenceSeen === 1) {
          // a claim about a whole map, resting on a logged automated step
          record.target = { entity: first('map') };
          record.provenance_chain = [STEP_ID];
        } else if (evidenceSeen === 2) {
          // a claim about one feature, so geometry provenance is required
          record.target = { entity: first('layer'), feature: 'f-1' };
          record.geometry_provenance = 'source_geometry';
        } else {
          record.target = { entity: first('map') };
        }
        break;
      }
      default:
        break;
    }
  }
  return records;
}

const ROOM_NAMES = ['earth', 'map', 'city', 'border', 'road', 'archive', 'theatre'] as const;

/** The seven fixed rooms (ADR 0003 §7): permanent ids, not counters. */
export function syntheticRooms(): RegistryRecord[] {
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

/**
 * Write a synthetic registry to disk: `count` generated entities plus the seven rooms, the logged
 * step, the geometry file and the layer assets. Deterministic for a given count and seed. The
 * `file` of a record is its path, so it is not written into the record.
 */
export async function writeSyntheticRegistry(outDir: string, count: number, seed: number): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const nodePath = await import('node:path');
  const { stringify } = await import('yaml');
  const records = [...syntheticRooms(), ...generateRegistry(count, seed)];
  const write = async (rel: string, text: string) => {
    const full = nodePath.join(outDir, rel);
    await mkdir(nodePath.dirname(full), { recursive: true });
    await writeFile(full, text);
  };

  const BATCH = 200;
  for (let i = 0; i < records.length; i += BATCH) {
    await Promise.all(
      records.slice(i, i + BATCH).map(async ({ file, ...rest }) => {
        await write(file, stringify(rest));
        if (typeof rest.asset === 'string') await write(rest.asset, 'synthetic asset\n');
      }),
    );
  }
  for (const step of generatedProvenance().values()) await write(`provenance/${step.id}.yaml`, stringify(step));
  const features = [...(generatedFeatures().get(GEOMETRY_FILE) ?? [])].map((id) => ({
    type: 'Feature',
    id,
    properties: {},
    geometry: { type: 'Point', coordinates: [23.3, 45.6] },
  }));
  await write(GEOMETRY_FILE, `${JSON.stringify({ type: 'FeatureCollection', features }, null, 2)}\n`);
}
