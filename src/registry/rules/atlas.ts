import { parseDate } from '../dates.js';
import {
  FACET_KIND_VALUES,
  GEOREF_CONFIDENCE_VALUES,
  GEOREF_PARTS,
  NAME_KIND_VALUES,
  STATIC_ASSET_LIMIT_BYTES,
  THEME_VALUES,
  TIME_MODE_VALUES,
  TRANSFORMATION_VALUES,
} from '../schemas/atlas-values.js';
import type { RegistryRecord } from '../types.js';
import { isObject, present } from '../values.js';
import { defineRule, severityFor, type Finding, type Rule } from './framework.js';

/*
 * Rules for layers and places (spec 005, contracts/atlas-rule-ids.md). A rule with a "warn from"
 * lifecycle says nothing before it; from it, a finding is a warning until the "error from"
 * lifecycle. Rules with no "warn from" are errors at every lifecycle or, for LAYER-GEOREF, a
 * warning below ready_for_build as everywhere else in the registry.
 */

const includes = (values: readonly string[], value: unknown): boolean => typeof value === 'string' && values.includes(value);

/** True from `ready_for_build`, where the Atlas rules start to speak. */
const started = (record: RegistryRecord): boolean => severityFor('ready_for_build', record.lifecycle) === 'error';

const layers = (records: readonly RegistryRecord[]) => records.filter((r) => r.family === 'layer');
const places = (records: readonly RegistryRecord[]) => records.filter((r) => r.family === 'place');

/** One side of an interval, parsed; null when it is not an accepted EDTF year-or-finer value. */
const side = (value: string) => parseDate(value);

/** `from/to` with both sides valid: the earliest reading of `from` may not come after the latest reading of `to`. */
function intervalProblem(value: unknown): string | null {
  if (typeof value !== 'string') return 'an EDTF interval from/to';
  const parts = value.split('/');
  if (parts.length !== 2) return 'an EDTF interval from/to';
  const from = side(parts[0] ?? '');
  const to = side(parts[1] ?? '');
  if (!from || !to) return 'an EDTF interval from/to';
  return from.earliest > to.latest ? 'an interval whose start is not after its end' : null;
}

/** A layer is placed in one of the seven themes (FR-001). */
export const layerTheme = defineRule({
  id: 'LAYER-THEME',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of layers(records)) {
      if (!started(record) || includes(THEME_VALUES, record.theme)) continue;
      findings.push({ record, field: 'theme', value: record.theme ?? null, expected: `one of ${THEME_VALUES.join(', ')}` });
    }
    return findings;
  },
});

/** A layer says when it covers and how its features are timed (FR-001, FR-013). */
export const layerTime = defineRule({
  id: 'LAYER-TIME',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of layers(records)) {
      if (!started(record)) continue;
      const problem = intervalProblem(record.envelope);
      if (problem) findings.push({ record, field: 'envelope', value: record.envelope ?? null, expected: problem });
      if (!includes(TIME_MODE_VALUES, record.time_mode)) {
        findings.push({ record, field: 'time_mode', value: record.time_mode ?? null, expected: `one of ${TIME_MODE_VALUES.join(', ')}` });
      }
    }
    return findings;
  },
});

/** Facets are declared whole, once per property, and never on the dates a per-feature layer is timed by (FR-014). */
export const layerFacet = defineRule({
  id: 'LAYER-FACET',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of layers(records)) {
      if (record.facets === undefined) continue;
      if (!Array.isArray(record.facets)) {
        findings.push({ record, field: 'facets', value: record.facets, expected: 'a list of { property, label, kind }' });
        continue;
      }
      const seen = new Set<string>();
      record.facets.forEach((facet: unknown, i: number) => {
        const at = `facets[${i}]`;
        if (!isObject(facet)) {
          findings.push({ record, field: at, value: facet, expected: 'an object with property, label and kind' });
          return;
        }
        for (const part of ['property', 'label'] as const) {
          if (!present(facet[part])) findings.push({ record, field: `${at}.${part}`, value: null, expected: `a ${part}` });
        }
        if (!includes(FACET_KIND_VALUES, facet.kind)) {
          findings.push({ record, field: `${at}.kind`, value: facet.kind ?? null, expected: `one of ${FACET_KIND_VALUES.join(', ')}` });
        }
        if (typeof facet.property !== 'string' || facet.property.trim() === '') return;
        if (seen.has(facet.property)) {
          findings.push({ record, field: `${at}.property`, value: facet.property, expected: 'a property used by one facet only' });
        } else if (record.time_mode === 'per_feature' && (facet.property === 'valid_from' || facet.property === 'valid_to')) {
          findings.push({ record, field: `${at}.property`, value: facet.property, expected: 'not valid_from or valid_to, which already time a per-feature layer' });
        }
        seen.add(facet.property);
      });
    }
    return findings;
  },
});

/** An overlay carries a complete georeferencing; no other layer does (FR-019). */
export const layerGeoref = defineRule({
  id: 'LAYER-GEOREF',
  from: 'ready_for_build',
  check: ({ records, index }) => {
    const findings: Finding[] = [];
    for (const record of layers(records)) {
      const overlay = record.role === 'map-overlay';
      if (!overlay) {
        if (record.georef !== undefined) findings.push({ record, field: 'georef', value: '[georef]', expected: 'no georef on a layer that is not a map-overlay' });
        continue;
      }
      if (record.time_mode === 'per_feature') {
        findings.push({ record, field: 'time_mode', value: record.time_mode, expected: 'envelope_only, because an overlay is one image' });
      }
      if (!isObject(record.georef)) {
        findings.push({ record, field: 'georef', value: null, expected: `georef with ${GEOREF_PARTS.join(', ')}` });
        continue;
      }
      const georef = record.georef;
      for (const part of GEOREF_PARTS) {
        if (!present(georef[part]) && georef[part] !== 0) findings.push({ record, field: `georef.${part}`, value: null, expected: `${part} on a map-overlay` });
      }
      if (present(georef.map) && index.get(String(georef.map))?.family !== 'map') {
        findings.push({ record, field: 'georef.map', value: georef.map, expected: 'the id of a map record' });
      }
      const residual = georef.residual_error_m;
      if (present(residual) && !(typeof residual === 'number' && Number.isFinite(residual) && residual >= 0)) {
        findings.push({ record, field: 'georef.residual_error_m', value: residual, expected: 'a number of metres, 0 or more' });
      }
      const points = georef.control_points;
      if (present(points) && !(typeof points === 'number' && Number.isInteger(points) && points >= 3)) {
        findings.push({ record, field: 'georef.control_points', value: points, expected: 'a whole number, 3 or more' });
      }
      if (present(georef.transformation) && !includes(TRANSFORMATION_VALUES, georef.transformation)) {
        findings.push({ record, field: 'georef.transformation', value: georef.transformation, expected: `one of ${TRANSFORMATION_VALUES.join(', ')}` });
      }
      if (present(georef.confidence) && !includes(GEOREF_CONFIDENCE_VALUES, georef.confidence)) {
        findings.push({ record, field: 'georef.confidence', value: georef.confidence, expected: `one of ${GEOREF_CONFIDENCE_VALUES.join(', ')}` });
      }
    }
    return findings;
  },
});

/** A layer source fits in one static asset on the host (FR-006). Sizes come from the loader. */
export const layerAssetSize = defineRule({
  id: 'LAYER-ASSET-SIZE',
  from: 'always',
  check: ({ records, options }) => {
    const findings: Finding[] = [];
    if (!options.assetSizes) return findings;
    for (const record of layers(records)) {
      if (typeof record.asset !== 'string') continue;
      const size = options.assetSizes.get(record.asset);
      if (size !== undefined && size > STATIC_ASSET_LIMIT_BYTES) {
        findings.push({ record, field: 'asset', value: size, expected: `a source of at most ${STATIC_ASSET_LIMIT_BYTES} bytes (25 MiB, the host's limit for one static asset)` });
      }
    }
    return findings;
  },
});

/** BCP 47 in the shape the Atlas needs: a primary language subtag and optional further subtags. */
const isLanguageTag = (value: unknown): boolean => typeof value === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value);

/** A place has names, each of a kind, a language and, when given, a valid span (FR-009). */
export const placeNames = defineRule({
  id: 'PLACE-NAMES',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of places(records)) {
      if (!started(record)) continue;
      if (!Array.isArray(record.names) || record.names.length === 0) {
        findings.push({ record, field: 'names', value: null, expected: 'at least one name' });
        continue;
      }
      const seen = new Set<string>();
      record.names.forEach((entry: unknown, i: number) => {
        const at = `names[${i}]`;
        if (!isObject(entry)) {
          findings.push({ record, field: at, value: entry, expected: 'an object with name, language and kind' });
          return;
        }
        if (!present(entry.name)) findings.push({ record, field: `${at}.name`, value: null, expected: 'a name' });
        if (!isLanguageTag(entry.language)) findings.push({ record, field: `${at}.language`, value: entry.language ?? null, expected: 'a BCP 47 language tag' });
        if (!includes(NAME_KIND_VALUES, entry.kind)) findings.push({ record, field: `${at}.kind`, value: entry.kind ?? null, expected: `one of ${NAME_KIND_VALUES.join(', ')}` });
        const from = entry.valid_from === undefined ? null : parseDate(entry.valid_from);
        const to = entry.valid_to === undefined ? null : parseDate(entry.valid_to);
        if (entry.valid_from !== undefined && !from) findings.push({ record, field: `${at}.valid_from`, value: entry.valid_from, expected: 'an EDTF date' });
        if (entry.valid_to !== undefined && !to) findings.push({ record, field: `${at}.valid_to`, value: entry.valid_to, expected: 'an EDTF date' });
        if (from && to && from.earliest > to.latest) {
          findings.push({ record, field: `${at}.valid_to`, value: entry.valid_to, expected: 'a date not before valid_from' });
        }
        const key = JSON.stringify([entry.name, entry.language, entry.kind]);
        if (seen.has(key)) findings.push({ record, field: at, value: entry.name ?? null, expected: 'a name not repeated with the same language and kind' });
        seen.add(key);
      });
    }
    return findings;
  },
});

const inRange = (value: unknown, limit: number): boolean => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/** A place has a position the Atlas can put a marker on (FR-009). */
export const placeLocation = defineRule({
  id: 'PLACE-LOCATION',
  from: 'publishable',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of places(records)) {
      if (!started(record)) continue;
      if (record.location === undefined || record.location === null) {
        findings.push({ record, field: 'location', value: null, expected: 'a location { lon, lat }' });
        continue;
      }
      if (!isObject(record.location)) {
        findings.push({ record, field: 'location', value: record.location, expected: 'an object { lon, lat }' });
        continue;
      }
      if (!inRange(record.location.lon, 180)) findings.push({ record, field: 'location.lon', value: record.location.lon ?? null, expected: 'a number of degrees from -180 to 180' });
      if (!inRange(record.location.lat, 90)) findings.push({ record, field: 'location.lat', value: record.location.lat ?? null, expected: 'a number of degrees from -90 to 90' });
    }
    return findings;
  },
});

export const ATLAS_RULES: Rule[] = [layerTheme, layerTime, layerFacet, layerGeoref, layerAssetSize, placeNames, placeLocation];
