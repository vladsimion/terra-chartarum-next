import edtf from 'edtf';

/*
 * Historical dates are EDTF levels 0 and 1 with four-digit signed years (ADR 0007): `0106`,
 * `-0106`, `1595-03`, `159X`, `15XX`, `1595?`, `1595/1602`. Precision is derived from the value and
 * never authored. Only what the ADR lists is accepted: no times of day, seasons, long years or
 * lists, even though the parser would read them.
 */

export type DerivedPrecision = 'day' | 'month' | 'year' | 'decade' | 'century' | 'range';
export type DatePrecision = DerivedPrecision | 'unknown';

export interface ParsedDate {
  precision: DerivedPrecision;
  uncertain: boolean;
  approximate: boolean;
  /** Earliest instant the value can mean, in ms since the epoch; -Infinity when open. */
  earliest: number;
  /** Latest instant the value can mean; +Infinity when open. */
  latest: number;
}

/** Unspecified digits in the year: one is a decade (`159X`), two a century (`15XX`). */
function unspecifiedYearDigits(value: string): number {
  const year = /^-?([0-9X]{4})/.exec(value)?.[1] ?? '';
  return (year.match(/X/g) ?? []).length;
}

/** The parsed date, or null when the value is not an accepted EDTF string. */
export function parseDate(value: unknown): ParsedDate | null {
  if (typeof value !== 'string' || value === '') return null;
  let parsed;
  try {
    parsed = edtf(value, { level: 1 });
  } catch {
    return null;
  }

  let precision: DerivedPrecision;
  if (parsed.type === 'Interval') {
    precision = 'range';
  } else if (parsed.type === 'Date' && parsed.precision !== undefined && parsed.precision >= 1) {
    const unspecified = unspecifiedYearDigits(value);
    if (unspecified > 2) return null; // no millennium in the vocabulary
    precision =
      unspecified === 2 ? 'century' : unspecified === 1 ? 'decade' : parsed.precision === 3 ? 'day' : parsed.precision === 2 ? 'month' : 'year';
  } else {
    return null; // times of day, seasons, long years, sets and lists
  }

  return {
    precision,
    uncertain: /[?%]/.test(value),
    approximate: /[~%]/.test(value),
    earliest: Number.isNaN(parsed.min) ? Number.NEGATIVE_INFINITY : parsed.min,
    latest: Number.isNaN(parsed.max) ? Number.POSITIVE_INFINITY : parsed.max,
  };
}

export function isEdtf(value: unknown): boolean {
  return parseDate(value) !== null;
}

/** Precision derived from the value; `unknown` for a missing, empty or invalid date. */
export function datePrecision(value: unknown): DatePrecision {
  return parseDate(value)?.precision ?? 'unknown';
}
