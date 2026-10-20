/*
 * Legacy catalogue years are signed integers (spec 008 research R2, ADR 0007). The registry wants a
 * four-digit signed EDTF year, and an uncertain date is part of the value, so a year the label marks
 * approximate becomes `<year>~` and is reported as a lossy guess with the original label.
 */
export interface EdtfYear {
  value: string;
  lossy: boolean;
  note?: string;
}

const APPROXIMATE = /~|\bc\.|\bca\.?|\bcirca\b|\babout\b/i;

export function yearToEdtf(year: number, label?: string): EdtfYear {
  if (!Number.isInteger(year)) throw new RangeError(`a legacy year must be an integer, not ${String(year)}`);
  if (Math.abs(year) > 9999) throw new RangeError(`the year ${year} does not fit a four-digit EDTF year`);
  const value = `${year < 0 ? '-' : ''}${String(Math.abs(year)).padStart(4, '0')}`;
  if (label !== undefined && APPROXIMATE.test(label)) return { value: `${value}~`, lossy: true, note: `approximate: read from the label "${label}"` };
  return { value, lossy: false };
}
