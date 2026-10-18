import type { RegistryRecord } from '../../../src/registry/types.js';
import type { ValidateOptions } from '../../../src/registry/rules/framework.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { layer, map, place, record } from './builders.js';

/** Spec 005: builders for layer and place records that satisfy every Atlas rule, so a test breaks one thing. */
export const DATASET = 'tc:tc:dataset:dataset-000001';
export const OVERLAY_MAP = 'tc:tc:map:map-000001';

export const validLayer = (n = 1, o: Partial<RegistryRecord> = {}) =>
  layer(n, {
    role: 'historical',
    asset: `data/layers/layer-${n}.geojson`,
    dataset: DATASET,
    geometry_provenance: 'georeferenced_trace',
    theme: 'territories-boundaries',
    tags: ['frontier'],
    synonyms: ['border'],
    envelope: '0106/0271',
    time_mode: 'per_feature',
    facets: [{ property: 'status', label: 'Status', kind: 'category' }],
    documentation: [{ label: 'Method', url: 'https://example.org/method' }],
    rights: { licence: 'CC-BY-4.0' },
    ...o,
  });

export const GEOREF = {
  map: OVERLAY_MAP,
  annotation: 'data/layers/overlay-1.annotation.json',
  transformation: 'polynomial1',
  residual_error_m: 120,
  control_points: 6,
  confidence: 'probable',
};

export const validOverlay = (n = 1, o: Partial<RegistryRecord> = {}) =>
  validLayer(n, { role: 'map-overlay', time_mode: 'envelope_only', geometry_provenance: undefined, facets: undefined, georef: { ...GEOREF }, ...o });

export const validPlace = (n = 1, o: Partial<RegistryRecord> = {}) =>
  place(n, {
    names: [
      { name: 'Apulum', language: 'la', kind: 'historic', valid_from: '0106', valid_to: '0271' },
      { name: 'Alba Iulia', language: 'ro', kind: 'modern' },
    ],
    location: { lon: 23.57, lat: 46.07 },
    ...o,
  });

/** The records a valid layer or overlay points at. */
export const atlasNeighbours = (): RegistryRecord[] => [record('dataset', 1, { version: '1', rights: { licence: 'CC-BY-4.0' } }), map(1)];

/** Violations of one rule over some records. */
export const hitsOf = (rule: string, records: RegistryRecord[], options?: ValidateOptions) =>
  validateRegistry(records, options).violations.filter((v) => v.rule === rule);

/** `hitsOf` for one record at a lifecycle, with its neighbours. */
export const atLifecycle = (rule: string, lifecycle: string, subject: RegistryRecord, extra: RegistryRecord[] = atlasNeighbours(), options?: ValidateOptions) =>
  hitsOf(rule, [{ ...subject, lifecycle }, ...extra], options);
