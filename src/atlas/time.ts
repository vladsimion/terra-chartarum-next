import { parseDate } from '../registry/dates.js';

/*
 * When a feature is valid, from EDTF dates (spec 005 FR-013, research R1). Pure: no DOM, no
 * framework. The build writes these bounds into each feature, and the map applies the same rule as
 * an expression, so this module is the tested definition of both.
 */

/** The years an EDTF value can mean, from its earliest to its latest reading. */
export interface YearBounds {
  min: number;
  max: number;
  /** The value carries `?`, `~` or `%`. */
  uncertain: boolean;
}

/** When a feature is valid: how early and how late it can start, and how early and how late it can end. */
export interface YearInterval {
  fromMin: number;
  fromMax: number;
  toMin: number;
  toMax: number;
  fromUncertain: boolean;
  toUncertain: boolean;
}

export type FeatureState = 'certain' | 'possible' | 'outside';
export type EnvelopeState = 'in_range' | 'out_of_range';

/** The year (signed, astronomical) a point in time falls in. */
const yearOfMs = (ms: number): number => new Date(ms).getUTCFullYear();

/** The years an EDTF value covers, or null when it is not an accepted date or is open-ended. */
export function yearBounds(value: unknown): YearBounds | null {
  const parsed = parseDate(value);
  if (!parsed || !Number.isFinite(parsed.earliest) || !Number.isFinite(parsed.latest)) return null;
  return { min: yearOfMs(parsed.earliest), max: yearOfMs(parsed.latest), uncertain: parsed.uncertain || parsed.approximate };
}

/** The bounds of an envelope `from/to`: its start and its end. */
function envelopeBounds(envelope: unknown): { start: YearBounds; end: YearBounds } | null {
  if (typeof envelope !== 'string') return null;
  const parts = envelope.split('/');
  if (parts.length !== 2) return null;
  const start = yearBounds(parts[0]);
  const end = yearBounds(parts[1]);
  return start && end ? { start, end } : null;
}

/**
 * The interval of a feature. A start or end it does not state is the layer envelope's own, so an
 * undated feature is valid for the whole envelope. Null when a stated date, or the envelope, cannot be read.
 */
export function intervalOf(validFrom: unknown, validTo: unknown, envelope: unknown): YearInterval | null {
  const bounds = envelopeBounds(envelope);
  if (!bounds) return null;
  const start = validFrom === undefined || validFrom === null ? bounds.start : yearBounds(validFrom);
  const end = validTo === undefined || validTo === null ? bounds.end : yearBounds(validTo);
  if (!start || !end) return null;
  return { fromMin: start.min, fromMax: start.max, toMin: end.min, toMax: end.max, fromUncertain: start.uncertain, toUncertain: end.uncertain };
}

/**
 * Whether a feature shows at `year`. It shows when the year is inside its earliest-start to
 * latest-end span; it is certain only inside the span every reading of its dates agrees on, and an
 * uncertain endpoint is possible, not certain, on its own boundary year.
 */
export function featureState(interval: YearInterval, year: number): FeatureState {
  if (year < interval.fromMin || year > interval.toMax) return 'outside';
  const afterStart = year > interval.fromMax || (year === interval.fromMax && !interval.fromUncertain);
  const beforeEnd = year < interval.toMin || (year === interval.toMin && !interval.toUncertain);
  return afterStart && beforeEnd ? 'certain' : 'possible';
}

/** Whether a layer's envelope covers `year`; an envelope that cannot be read never counts as covering it. */
export function envelopeState(envelope: unknown, year: number): EnvelopeState {
  const bounds = envelopeBounds(envelope);
  return bounds && year >= bounds.start.min && year <= bounds.end.max ? 'in_range' : 'out_of_range';
}
