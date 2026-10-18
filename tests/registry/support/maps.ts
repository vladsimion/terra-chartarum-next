import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, map, place, record, source } from './builders.js';

/** Spec 004: builders for map and cartographer records that satisfy every map rule, so a test breaks one thing. */
export const CART = 'tc:tc:cartographer:cartographer-000001';
export const MAP = 'tc:tc:map:map-000001';
export const PLACE = 'tc:tc:place:place-000001';
export const EVIDENCE = 'tc:tc:evidence:evidence-000001';

export const IMAGE = {
  type: 'iiif',
  url: 'https://example.org/iiif/1/info.json',
  static_url: 'https://example.org/iiif/1/full/800,/0/default.jpg',
  attribution: 'Example Library',
  witness_kind: 'institutional',
  alt: 'A hand-coloured sheet showing a river valley',
};

export const FILLED = {
  title_original: 'Tabula Daciae',
  makers: [CART],
  date_published: '1595',
  publication_place: PLACE,
  edition_state: 'first state',
  atlas_context: 'from the Theatrum',
  dimensions: { height_mm: 400, width_mm: 500 },
  language: 'la',
  coverage: [PLACE],
  significance: 'An early printed view of the province.',
  provenance: 'Example Library, bequest.',
  georeferencing_status: 'none',
  images: [IMAGE],
};

export const validMap = (o: Partial<RegistryRecord> = {}) =>
  map(1, {
    witness_kind: 'institutional',
    verification: 'unverified',
    attribution: 'exact',
    attribution_evidence: [EVIDENCE],
    rights: { licence: 'CC-BY-4.0', reproduction_cleared: true },
    ...FILLED,
    ...o,
  });

export const cartographer = (o: Partial<RegistryRecord> = {}) =>
  record('cartographer', 1, { kind: 'person', roles: ['cartographer'], life_dates: '1527-1598', ...o });

/** The neighbours a valid map points at. */
export const neighbours = (o: { maker?: Partial<RegistryRecord>; sourceKind?: string } = {}): RegistryRecord[] => [
  cartographer(o.maker),
  place(1),
  source(1, { source_kind: o.sourceKind ?? 'scholarly' }),
  evidence(1, { target: { entity: MAP } }),
];

/** Violations of one rule over a map (and its neighbours) at a lifecycle. */
export function hitsOf(rule: string, lifecycle: string, over: Partial<RegistryRecord> = {}, extra: RegistryRecord[] = neighbours()) {
  const records = [validMap({ lifecycle, ...over }), ...extra];
  return validateRegistry(records).violations.filter((v) => v.rule === rule);
}
