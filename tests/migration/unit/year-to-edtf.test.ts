import { describe, expect, it } from 'vitest';
import { isEdtf } from '../../../src/registry/dates.js';
import { yearToEdtf } from '../../../src/migration/year-to-edtf.js';

/* Spec 008 T016 (research R2, ADR 0007): a legacy signed integer year becomes a four-digit signed EDTF year; a guess is flagged lossy. */
describe('yearToEdtf', () => {
  it.each([
    [-600, '-0600'],
    [106, '0106'],
    [1579, '1579'],
    [0, '0000'],
    [7, '0007'],
    [-1, '-0001'],
    [9999, '9999'],
  ])('%i becomes %s, exactly', (year, edtf) => {
    expect(yearToEdtf(year)).toEqual({ value: edtf, lossy: false });
  });

  it('gives values the registry reads as EDTF', () => {
    for (const year of [-600, -1, 0, 106, 1579]) expect(isEdtf(yearToEdtf(year).value)).toBe(true);
  });

  it('makes a year its label marks approximate an approximate year, and flags it lossy with the original', () => {
    expect(yearToEdtf(1450, 'c. 1450')).toEqual({ value: '1450~', lossy: true, note: 'approximate: read from the label "c. 1450"' });
    expect(yearToEdtf(-220, '~220 BC')).toMatchObject({ value: '-0220~', lossy: true });
    expect(yearToEdtf(1500, 'circa 1500')).toMatchObject({ value: '1500~', lossy: true });
  });

  it('does not guess from a label that says nothing about approximation', () => {
    expect(yearToEdtf(1700, 'Published 1700')).toEqual({ value: '1700', lossy: false });
  });

  it('refuses what it cannot express: a non-integer or a year beyond four digits', () => {
    expect(() => yearToEdtf(1.5)).toThrow(/integer/);
    expect(() => yearToEdtf(Number.NaN)).toThrow(/integer/);
    expect(() => yearToEdtf(10000)).toThrow(/four-digit/);
    expect(() => yearToEdtf(-10000)).toThrow(/four-digit/);
  });
});
