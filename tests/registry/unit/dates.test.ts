import { describe, expect, it } from 'vitest';
import { datePrecision, isEdtf, parseDate } from '../../../src/registry/dates.js';

describe('EDTF level 0-1 with four-digit signed years (ADR 0007)', () => {
  it.each(['0106', '-0106', '1595', '1595-03', '1595-03-12', '159X', '15XX', '1595/1602', '-0101/0106', '1595?', '1595~', '1595%', '1595-03?'])(
    'accepts %s',
    (value) => {
      expect(isEdtf(value)).toBe(true);
      expect(parseDate(value)).not.toBeNull();
    },
  );

  it.each([
    ['106', 'a year of fewer than four digits'],
    ['banana', 'not a date'],
    ['', 'empty'],
    ['unknown', 'a missing date is left out, not written'],
    ['1595-13', 'month 13'],
    ['1595-02-30', 'a day that does not exist'],
    ['2004-06-21T12:00:00', 'a time of day'],
    ['Y170000002', 'a long year (level 2)'],
    ['2001-21', 'a season'],
    ['1XXX', 'a millennium: the vocabulary stops at a century'],
    ['XXXX', 'no year digits at all'],
  ])('rejects %s (%s)', (value) => {
    expect(isEdtf(value)).toBe(false);
    expect(parseDate(value)).toBeNull();
  });

  it('rejects anything that is not a string, including the integer years the first model used', () => {
    for (const value of [106, -106, null, undefined, true, {}, ['1595']]) {
      expect(isEdtf(value as never), String(value)).toBe(false);
    }
  });
});

describe('date precision is derived from the value, never authored', () => {
  it.each([
    ['1595-03-12', 'day'],
    ['1595-03', 'month'],
    ['1595', 'year'],
    ['-0106', 'year'],
    ['159X', 'decade'],
    ['15XX', 'century'],
    ['1595/1602', 'range'],
    ['-0101/0106', 'range'],
  ])('%s is %s', (value, precision) => {
    expect(datePrecision(value)).toBe(precision);
  });

  it('is unknown for a missing, empty or invalid date', () => {
    expect(datePrecision(undefined)).toBe('unknown');
    expect(datePrecision('')).toBe('unknown');
    expect(datePrecision('banana')).toBe('unknown');
  });

  it('keeps the precision of the underlying value when it is uncertain or approximate', () => {
    expect(datePrecision('1595?')).toBe('year');
    expect(datePrecision('1595-03~')).toBe('month');
    expect(datePrecision('1595%')).toBe('year');
  });
});

describe('uncertainty and approximation are data (Constitution III)', () => {
  it.each([
    ['1595', false, false],
    ['1595?', true, false],
    ['1595~', false, true],
    ['1595%', true, true],
    ['1595-03?', true, false],
    ['1595/1602', false, false],
  ])('%s: uncertain=%s approximate=%s', (value, uncertain, approximate) => {
    expect(parseDate(value)).toMatchObject({ uncertain, approximate });
  });
});

describe('earliest and latest instants, for ordering', () => {
  const earliest = (v: string) => parseDate(v)!.earliest;
  const latest = (v: string) => parseDate(v)!.latest;

  it('orders years, including BCE', () => {
    expect(earliest('-0106')).toBeLessThan(earliest('-0101'));
    expect(earliest('-0101')).toBeLessThan(earliest('0106'));
    expect(earliest('0106')).toBeLessThan(earliest('1595'));
  });

  it('a less precise date spans everything it could mean', () => {
    expect(earliest('15XX')).toBeLessThanOrEqual(earliest('1500-01-01'));
    expect(latest('15XX')).toBeGreaterThanOrEqual(latest('1599-12-31'));
    expect(earliest('159X')).toBeLessThanOrEqual(earliest('1590'));
    expect(latest('159X')).toBeGreaterThanOrEqual(latest('1599'));
    expect(latest('1595-03')).toBeGreaterThanOrEqual(latest('1595-03-31'));
  });

  it('an interval runs from the start of its first date to the end of its last', () => {
    expect(earliest('1595/1602')).toBe(earliest('1595'));
    expect(latest('1595/1602')).toBe(latest('1602'));
  });

  it('an open-ended interval has no latest bound', () => {
    expect(latest('1595/..')).toBe(Number.POSITIVE_INFINITY);
    expect(datePrecision('1595/..')).toBe('range');
  });

  it('a date is not later than itself', () => {
    expect(earliest('0106')).toBeLessThanOrEqual(latest('0106'));
  });
});
