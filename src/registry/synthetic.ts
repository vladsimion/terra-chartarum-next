import type { ProvenanceStep } from './schemas/provenance-step.js';
import { ESSAY_STAGES, type EssayStage } from './stages.js';
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
        record.stage = ({ proposed: 'Concept', researching: 'Research', verified: 'Outline' } as Record<string, string>)[String(record.lifecycle)];
        record.question = 'What does this synthetic essay ask?';
        record.authors = ['Synthetic Author'];
        record.rooms = { primary: 'tc:tc:room:map' };
        record.stage_history = ESSAY_STAGES.slice(0, ESSAY_STAGES.indexOf(record.stage as EssayStage) + 1).map((stage, i) => ({
          stage,
          on: `2026-01-${String(i + 1).padStart(2, '0')}`,
          by: 'Synthetic Author',
        }));
        record.open_questions = [];
        if (record.lifecycle === 'verified') record.thesis = 'A synthetic thesis.';
        record.rights = rights();
        record.maps = unique(some('map', 2));
        record.places = unique(some('place', 3));
        record.sources = unique(some('source', 2));
        record.evidence = unique(some('evidence', 2));
        break;
      case 'cartographer':
        record.kind = 'person';
        break;
      case 'map':
        record.witness_kind = 'institutional';
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

const MAP_DATES = ['1595', '1595-03', '159X', '1595?', '1595/1602', '1648', '1701', '1750?', '1800/1815', '1861'];
const MAP_LANGUAGES = ['la', 'de', 'nl', 'fr', 'it'];
const PLACE_TYPES = ['region', 'country', 'settlement'] as const;

/**
 * `count` valid, public maps with everything they point at: makers (some of them workshops), places
 * of three types, scholarly sources and one piece of evidence per map, and held essays that cite
 * them (spec 004 T003; 60 for the browse tests, 500 for SC-004). Deterministic for a seed. Every
 * record is released and published except the essays, which are at Corpus: the registry has no
 * cheap way to make a public essay, and where-used on a public essay is tested on hand-authored
 * records. Does not include the seven rooms.
 */
export function generateMapRegistry(count: number, seed: number): RegistryRecord[] {
  const rng = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const idOf = (family: string, n: number) => `tc:tc:${family}:${localId(family, n)}`;
  const base = (family: string, n: number, title: string, extra: Record<string, unknown>): RegistryRecord => ({
    id: idOf(family, n),
    family,
    origin: 'minted',
    title,
    slug: `${family}-${n}-${pick(WORDS)}`,
    slug_history: [],
    lifecycle: 'published',
    release: 'released',
    relations: [],
    file: `content/${family}/${localId(family, n)}.yaml`,
    ...extra,
  });
  const records: RegistryRecord[] = [];

  const cartographers = Math.ceil(count / 4);
  const workshop = (n: number) => n % 5 === 0;
  for (let n = 1; n <= cartographers; n += 1) {
    records.push(
      base('cartographer', n, `${pick(WORDS)} ${pick(WORDS)} ${n}`, workshop(n) ? { kind: 'workshop', roles: ['publisher'], active: '1600/1650' } : { kind: 'person', roles: ['cartographer'], life_dates: '1527-1598' }),
    );
  }
  const places = 3 + Math.ceil(count / 10);
  for (let n = 1; n <= places; n += 1) {
    const title = `${pick(WORDS)} ${n}`;
    records.push(
      base('place', n, title, {
        place_type: PLACE_TYPES[(n - 1) % PLACE_TYPES.length],
        names: [{ name: title, language: 'la', kind: 'historic' }],
        location: { lon: 20 + (n % 10), lat: 44 + (n % 5) },
      }),
    );
  }
  // the entry the source is cited as (spec 006 SRC-ENTRY); built without `base`, so the draws that follow are the same as before
  records.push({
    id: idOf('bibliography_entry', 1),
    family: 'bibliography_entry',
    origin: 'minted',
    title: 'A scholarly study',
    slug: 'bibliography_entry-1-a-scholarly-study',
    slug_history: [],
    lifecycle: 'published',
    release: 'released',
    relations: [],
    file: `content/bibliography_entry/${localId('bibliography_entry', 1)}.yaml`,
    csl: `content/bibliography_entry/${localId('bibliography_entry', 1)}.csl.json`,
    section: 'specialised_studies',
  });
  records.push(base('source', 1, 'A scholarly study', { source_kind: 'scholarly', entry: idOf('bibliography_entry', 1) }));

  for (let n = 1; n <= count; n += 1) {
    const makers = [idOf('cartographer', 1 + Math.floor(rng() * cartographers))];
    const unresolved = makers.some((id) => workshop(Number(id.split('-').pop())));
    const held = rng() < 0.35;
    const withImage = rng() < 0.5;
    const witness = held ? 'held' : 'institutional';
    const place = idOf('place', 1 + Math.floor(rng() * places));
    records.push(
      base('evidence', n, `Evidence ${n}`, {
        target: { entity: idOf('map', n) },
        source: idOf('source', 1),
        locator: { value: `p. ${n}`, state: 'pending', proposed_by: 'person' },
        evidence_type: 'textual',
        confidence: 'probable',
        rights: { licence: 'CC-BY-4.0' },
      }),
    );
    records.push(
      base('map', n, `${pick(WORDS)} ${pick(WORDS)} sheet ${n}`, {
        witness_kind: witness,
        makers,
        attribution: unresolved ? 'unresolved' : 'exact',
        attribution_evidence: [idOf('evidence', n)],
        title_original: `Tabula ${pick(WORDS)} ${n}`,
        date_published: pick(MAP_DATES),
        publication_place: place,
        edition_state: 'first state',
        atlas_context: `from the atlas ${pick(WORDS)}`,
        dimensions: { height_mm: 300 + Math.floor(rng() * 300), width_mm: 400 + Math.floor(rng() * 300) },
        language: pick(MAP_LANGUAGES),
        coverage: [...new Set([place, idOf('place', 1 + Math.floor(rng() * places))])],
        significance: `Why sheet ${n} matters.`,
        provenance: `Bequest ${n}.`,
        georeferencing_status: 'none',
        verification: held ? 'inspected' : 'checked_online',
        last_verified: '2026-10-01',
        ...(held ? { basis: { provenance: 'observed', atlas_context: 'inferred' } } : {}),
        ...(withImage
          ? { images: [{ type: 'iiif', url: `https://example.org/iiif/${n}/info.json`, static_url: `https://example.org/iiif/${n}/full/800,/0/default.jpg`, attribution: 'Example Library', witness_kind: witness, alt: `Sheet ${n}` }] }
          : { field_status: { images: 'not_yet_verified' } }),
        rights: { licence: 'CC-BY-4.0', reproduction_cleared: true },
      }),
    );
  }

  for (let n = 1; n <= Math.ceil(count / 20); n += 1) {
    const cited = Array.from({ length: 2 }, () => idOf('map', 1 + Math.floor(rng() * count)));
    records.push(
      base('essay', n, `An essay on maps ${n}`, {
        lifecycle: 'researching',
        release: 'held',
        stage: 'Corpus',
        question: 'What do these sheets show?',
        authors: ['Synthetic Author'],
        rooms: { primary: 'tc:tc:room:map' },
        stage_history: [
          { stage: 'Concept', on: '2026-01-01', by: 'Synthetic Author' },
          { stage: 'Corpus', on: '2026-01-02', by: 'Synthetic Author' },
        ],
        rights: { licence: 'CC-BY-4.0' },
        maps: [...new Set(cited)],
      }),
    );
  }
  return records;
}

const THEMES = [
  'territories-boundaries',
  'networks-circulation',
  'places-settlements',
  'names-peoples-attestations',
  'conflict-campaigns-frontiers',
  'cartographic-evidence',
  'historical-map-overlays',
] as const;

/** Deterministic GeoJSON source of a generated layer: a few features in Dacia, each timed when the layer is per-feature. */
export function generatedLayerSource(layer: RegistryRecord, seed: number): unknown {
  const rng = mulberry32(seed + Number(String(layer.id).split('-').pop()));
  const [from, to] = String(layer.envelope).split('/').map(Number) as [number, number];
  const features = Array.from({ length: 3 }, (_, i) => {
    const start = Math.round(from + rng() * (to - from) * 0.5);
    const end = Math.round(start + rng() * (to - start));
    const pad = (year: number) => String(year).padStart(4, '0');
    return {
      type: 'Feature',
      id: `f-${i + 1}`,
      properties: {
        name: `Feature ${i + 1}`,
        status: ['attested', 'proposed', 'reconstructed'][i % 3],
        ...(layer.time_mode === 'per_feature' ? { valid_from: pad(start), valid_to: pad(end) } : {}),
      },
      geometry: { type: 'Point', coordinates: [Number((22 + rng() * 4).toFixed(4)), Number((44.5 + rng() * 2.5).toFixed(4))] },
    };
  });
  return { type: 'FeatureCollection', features };
}

/**
 * `count` valid, public layers with everything around them: a dataset, collections that list the
 * layers (the first of each is a default), places with historic and modern names, and held essays
 * at Concept that list layers (a public essay needs the whole Publish stage, which the registry
 * has no cheap way to make; derived rooms on public essays are tested on hand-authored records).
 * Deterministic for a seed. Does not include the seven rooms.
 */
export function generateAtlasRegistry(count: number, seed: number): RegistryRecord[] {
  const rng = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const idOf = (family: string, n: number) => `tc:tc:${family}:${localId(family, n)}`;
  const base = (family: string, n: number, title: string, extra: Record<string, unknown>): RegistryRecord => ({
    id: idOf(family, n),
    family,
    origin: 'minted',
    title,
    slug: `${family}-${n}-${pick(WORDS)}`,
    slug_history: [],
    lifecycle: 'published',
    release: 'released',
    relations: [],
    file: `content/${family}/${localId(family, n)}.yaml`,
    ...extra,
  });
  const records: RegistryRecord[] = [base('dataset', 1, 'A synthetic dataset', { version: '1.0.0', rights: { licence: 'CC-BY-4.0' } })];

  const places = 3 + Math.ceil(count / 10);
  for (let n = 1; n <= places; n += 1) {
    const title = `${pick(WORDS)} ${n}`;
    records.push(
      base('place', n, title, {
        place_type: PLACE_TYPES[(n - 1) % PLACE_TYPES.length],
        names: [
          { name: title, language: 'la', kind: 'historic', valid_from: '0106', valid_to: '0271' },
          { name: `${title} (today)`, language: 'ro', kind: 'modern' },
        ],
        location: { lon: Number((22 + rng() * 4).toFixed(4)), lat: Number((44.5 + rng() * 2.5).toFixed(4)) },
      }),
    );
  }

  const layerIds: string[] = [];
  for (let n = 1; n <= count; n += 1) {
    const theme = THEMES[(n - 1) % THEMES.length] as string;
    const context = n % 11 === 0;
    const start = 100 + Math.floor(rng() * 100);
    layerIds.push(idOf('layer', n));
    records.push(
      base('layer', n, `${pick(WORDS)} ${pick(WORDS)} layer ${n}`, {
        role: context ? 'context' : 'historical',
        asset: `data/layers/${localId('layer', n)}.geojson`,
        dataset: idOf('dataset', 1),
        geometry_provenance: context ? 'modern_reference' : pick(['source_geometry', 'georeferenced_trace', 'scholarly_reconstruction', 'generalized_editorial']),
        theme,
        tags: [pick(WORDS), pick(WORDS)].filter((tag, i, all) => all.indexOf(tag) === i),
        synonyms: [pick(WORDS)],
        envelope: `${String(start).padStart(4, '0')}/${String(start + 60 + Math.floor(rng() * 100)).padStart(4, '0')}`,
        time_mode: n % 2 === 0 ? 'per_feature' : 'envelope_only',
        facets: [{ property: 'status', label: 'Status', kind: 'category' }],
        rights: { licence: 'CC-BY-4.0' },
      }),
    );
  }

  const perCollection = 12;
  for (let n = 1; n <= Math.ceil(count / perCollection); n += 1) {
    const members = layerIds.slice((n - 1) * perCollection, n * perCollection);
    records.push(base('collection', n, `Collection ${n}`, { members, default_layers: members.slice(0, 2) }));
  }

  for (let n = 1; n <= Math.ceil(count / 20); n += 1) {
    records.push(
      base('essay', n, `An essay on layers ${n}`, {
        lifecycle: 'proposed',
        release: 'held',
        stage: 'Concept',
        question: 'What do these layers show?',
        authors: ['Synthetic Author'],
        rooms: { primary: 'tc:tc:room:map' },
        stage_history: [{ stage: 'Concept', on: '2026-01-01', by: 'Synthetic Author' }],
        rights: { licence: 'CC-BY-4.0' },
        layers: [...new Set(Array.from({ length: 3 }, () => pick(layerIds)))],
      }),
    );
  }
  return records;
}

const SECTIONS = ['primary_sources', 'historical_maps', 'reference_works', 'specialised_studies', 'digital_resources', 'datasets_licences', 'further_reading'] as const;
const FAMILY_NAMES = ['Marsh', 'Quill', 'Orme', 'Vale', 'Wells', 'Hale', 'Brand', 'Lenoir', 'Idle', 'Moe', 'Roe', 'Poe'];
const GIVEN_NAMES = ['Ada', 'Odo', 'Tilda', 'Rowan', 'Ida', 'Paul', 'Jane', 'Hal'];
const CSL_TYPES = ['book', 'article-journal', 'chapter', 'manuscript', 'map', 'webpage', 'dataset'] as const;

/** The CSL-JSON item of a generated entry: the entry's id and title, and the rest derived from its number and the seed. */
export function generatedCsl(entry: RegistryRecord, seed: number): Record<string, unknown> {
  const n = Number(String(entry.id).split('-').pop());
  const rng = mulberry32(seed * 1_000_003 + n);
  const family = FAMILY_NAMES[Math.floor(rng() * FAMILY_NAMES.length)] as string;
  const given = GIVEN_NAMES[Math.floor(rng() * GIVEN_NAMES.length)] as string;
  const item: Record<string, unknown> = {
    id: entry.id,
    type: CSL_TYPES[n % CSL_TYPES.length],
    title: entry.title,
    author: [{ family, given }],
    issued: { 'date-parts': [[1600 + Math.floor(rng() * 420)]] },
    keyword: `${WORDS[n % WORDS.length]}, ${WORDS[(n * 7) % WORDS.length]}`,
  };
  if (n % 3 === 0) item.DOI = `10.5555/synthetic.${n}`;
  if (n % 5 === 0) item.ISBN = `978-0-00-${String(100000 + n).slice(-6)}-0`;
  return item;
}

/**
 * `count` valid bibliography entries, all published and released, with a Source each (every 40th a
 * finding aid), Evidence on every third entry (verified and pending locators), public cartographers
 * that list the even entries, and held essays that list and cite others (so some entries are cited
 * only by held content and some by nothing). Editions and translations run through the entries.
 * For the discovery tests and the 1,000-entry timing test (spec 006 SC-005); CSL files come from
 * `generatedCsl` when written to disk.
 */
export function generateBibliographyRegistry(count: number, seed: number): RegistryRecord[] {
  const rng = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const idOf = (family: string, n: number) => `tc:tc:${family}:${localId(family, n)}`;
  const base = (family: string, n: number, title: string, extra: Record<string, unknown>): RegistryRecord => ({
    id: idOf(family, n),
    family,
    origin: 'minted',
    title,
    slug: `${family}-${n}-${pick(WORDS)}`,
    slug_history: [],
    lifecycle: 'published',
    release: 'released',
    relations: [],
    file: `content/${family}/${localId(family, n)}.yaml`,
    ...extra,
  });
  const records: RegistryRecord[] = [];

  for (let n = 1; n <= count; n += 1) {
    const extra: Record<string, unknown> = {
      csl: `content/bibliography_entry/${localId('bibliography_entry', n)}.csl.json`,
      section: SECTIONS[(n - 1) % SECTIONS.length],
    };
    // an edition follows its first edition every 25th entry; a translation follows an edition every 50th
    if (n % 50 === 0) extra.translation_of = idOf('bibliography_entry', n - 1);
    else if (n % 25 === 0) extra.edition_of = idOf('bibliography_entry', n - 1);
    records.push(base('bibliography_entry', n, `${pick(WORDS)} ${pick(WORDS)} studies ${n}`, extra));
  }
  for (let n = 1; n <= count; n += 1) {
    records.push(base('source', n, `Source ${n}`, { entry: idOf('bibliography_entry', n), ...(n % 40 === 0 ? { is_finding_aid: true } : {}) }));
  }

  const cartographers = Math.max(1, Math.ceil(count / 4));
  const listed = new Map<number, string[]>();
  for (let n = 2; n <= count; n += 2) {
    const c = ((n / 2 - 1) % cartographers) + 1;
    listed.set(c, [...(listed.get(c) ?? []), idOf('bibliography_entry', n)]);
  }
  for (let n = 1; n <= cartographers; n += 1) records.push(base('cartographer', n, `Cartographer ${n}`, { kind: 'person', bibliography: listed.get(n) ?? [] }));

  let evidenceCount = 0;
  const evidenceBySource: string[] = [];
  for (let n = 3; n <= count; n += 3) {
    if (n % 40 === 0) continue; // a finding aid is never evidence
    evidenceCount += 1;
    const verified = evidenceCount % 2 === 0;
    records.push(
      base('evidence', evidenceCount, `Claim ${evidenceCount}`, {
        target: { entity: idOf('cartographer', 1) },
        source: idOf('source', n),
        locator: verified
          ? { value: `p. ${n}`, state: 'verified', proposed_by: 'person', verified_by: 'A. Editor', verified_on: '2026-10-10', consulted_copy: 'Synthetic copy' }
          : { value: `p. ${n}`, state: 'pending', proposed_by: 'person' },
        evidence_type: 'textual',
        confidence: 'probable',
        rights: { licence: 'CC-BY-4.0' },
      }),
    );
    evidenceBySource.push(idOf('evidence', evidenceCount));
  }

  for (let n = 1; n <= Math.max(1, Math.ceil(count / 20)); n += 1) {
    const mine = Array.from({ length: 4 }, (_, k) => idOf('bibliography_entry', Math.min(count, ((n * 5 + k * 5) % count) + 1)));
    records.push(
      base('essay', n, `An essay on sources ${n}`, {
        lifecycle: 'proposed',
        release: 'held',
        stage: 'Concept',
        question: 'What do these sources show?',
        authors: ['Synthetic Author'],
        rooms: { primary: 'tc:tc:room:archive' },
        stage_history: [{ stage: 'Concept', on: '2026-01-01', by: 'Synthetic Author' }],
        rights: { licence: 'CC-BY-4.0' },
        bibliography: [...new Set(mine)],
        evidence: evidenceBySource.length > 0 ? [evidenceBySource[(n - 1) % evidenceBySource.length] as string] : [],
      }),
    );
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
        if (rest.family === 'bibliography_entry' && typeof rest.csl === 'string') {
          await write(rest.csl, `${JSON.stringify({ id: rest.id, type: 'book', title: rest.title, author: [{ family: 'Synthetic', given: 'A.' }], issued: { 'date-parts': [[2000]] } }, null, 2)}\n`);
        }
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

/** Write `generateAtlasRegistry(layers, seed)` and the seven rooms to disk, with a small GeoJSON source per layer. */
export async function writeSyntheticAtlas(outDir: string, layers: number, seed: number): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const nodePath = await import('node:path');
  const { stringify } = await import('yaml');
  const write = async (rel: string, text: string) => {
    const full = nodePath.join(outDir, rel);
    await mkdir(nodePath.dirname(full), { recursive: true });
    await writeFile(full, text);
  };
  const records = [...syntheticRooms(), ...generateAtlasRegistry(layers, seed)];
  const BATCH = 200;
  for (let i = 0; i < records.length; i += BATCH) {
    await Promise.all(
      records.slice(i, i + BATCH).map(async (record) => {
        const { file, ...rest } = record;
        await write(file, stringify(rest));
        if (record.family === 'layer' && typeof record.asset === 'string') {
          await write(record.asset, `${JSON.stringify(generatedLayerSource(record, seed), null, 2)}\n`);
        }
      }),
    );
  }
}

/** Write `generateBibliographyRegistry(entries, seed)`, the seven rooms and a CSL-JSON file for each entry to disk. */
export async function writeSyntheticBibliography(outDir: string, entries: number, seed: number): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const nodePath = await import('node:path');
  const { stringify } = await import('yaml');
  const write = async (rel: string, text: string) => {
    const full = nodePath.join(outDir, rel);
    await mkdir(nodePath.dirname(full), { recursive: true });
    await writeFile(full, text);
  };
  const records = [...syntheticRooms(), ...generateBibliographyRegistry(entries, seed)];
  const BATCH = 200;
  for (let i = 0; i < records.length; i += BATCH) {
    await Promise.all(
      records.slice(i, i + BATCH).map(async (record) => {
        const { file, ...rest } = record;
        await write(file, stringify(rest));
        if (record.family === 'bibliography_entry' && typeof record.csl === 'string') await write(record.csl, `${JSON.stringify(generatedCsl(record, seed), null, 2)}\n`);
      }),
    );
  }
}
