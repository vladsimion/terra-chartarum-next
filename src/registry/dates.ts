import edtf from 'edtf';

/**
 * Historical dates are EDTF levels 0–1 with four-digit signed years (ADR 0006),
 * e.g. `0106`, `-0106`, `159X`, `1595?`, `1595/1602`.
 */
export function isEdtf(value: string): boolean {
  try {
    edtf(value, { level: 1 });
    return true;
  } catch {
    return false;
  }
}
