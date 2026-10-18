import { describe, expect, it } from 'vitest';
import { envelopeState, featureState, intervalOf, yearBounds } from '../../../src/atlas/time.js';

/*
 * Spec 005 T021 (FR-013, research R1): EDTF dates to year bounds, and what a year makes of them.
 * An endpoint marked uncertain (`?`, `~`, `%`) is only possibly valid on its own boundary year.
 */
describe('yearBounds', () => {
  it('reads a plain year as one year', () => {
    expect(yearBounds('1595')).toEqual({ min: 1595, max: 1595, uncertain: false });
  });

  it('reads a decade, a century and a month as the span they cover', () => {
    expect(yearBounds('159X')).toEqual({ min: 1590, max: 1599, uncertain: false });
    expect(yearBounds('15XX')).toEqual({ min: 1500, max: 1599, uncertain: false });
    expect(yearBounds('1595-03')).toEqual({ min: 1595, max: 1595, uncertain: false });
  });

  it('flags an uncertain or approximate value without widening it', () => {
    expect(yearBounds('1595?')).toEqual({ min: 1595, max: 1595, uncertain: true });
    expect(yearBounds('1595~')).toEqual({ min: 1595, max: 1595, uncertain: true });
    expect(yearBounds('1595%')).toEqual({ min: 1595, max: 1595, uncertain: true });
  });

  it('reads an interval as its earliest start to its latest end', () => {
    expect(yearBounds('1595/1602')).toEqual({ min: 1595, max: 1602, uncertain: false });
  });

  it('reads BCE years as negative integers', () => {
    expect(yearBounds('-0106')).toEqual({ min: -106, max: -106, uncertain: false });
    expect(yearBounds('-0106/0010')).toEqual({ min: -106, max: 10, uncertain: false });
  });

  it('gives null for a value that is not an accepted date', () => {
    expect(yearBounds('about 1400')).toBeNull();
    expect(yearBounds(1400)).toBeNull();
    expect(yearBounds(undefined)).toBeNull();
  });
});

describe('intervalOf', () => {
  const envelope = '0106/0271';

  it('gives the four bounds of a dated feature', () => {
    expect(intervalOf('0120', '0200', envelope)).toEqual({ fromMin: 120, fromMax: 120, toMin: 200, toMax: 200, fromUncertain: false, toUncertain: false });
    expect(intervalOf('159X', '1602', '1500/1700')).toMatchObject({ fromMin: 1590, fromMax: 1599, toMin: 1602, toMax: 1602 });
  });

  it('takes the layer envelope for an undated start, end, or both (an open end)', () => {
    expect(intervalOf(undefined, '0200', envelope)).toMatchObject({ fromMin: 106, fromMax: 106, toMin: 200 });
    expect(intervalOf('0120', undefined, envelope)).toMatchObject({ fromMin: 120, toMin: 271, toMax: 271 });
    expect(intervalOf(undefined, undefined, envelope)).toEqual({ fromMin: 106, fromMax: 106, toMin: 271, toMax: 271, fromUncertain: false, toUncertain: false });
  });

  it('carries an uncertain endpoint', () => {
    expect(intervalOf('0120?', '0200', envelope)).toMatchObject({ fromUncertain: true, toUncertain: false });
    expect(intervalOf('0120', '0200~', envelope)).toMatchObject({ fromUncertain: false, toUncertain: true });
  });

  it('gives null when a date, or the envelope, cannot be read', () => {
    expect(intervalOf('soon', undefined, envelope)).toBeNull();
    expect(intervalOf('0120', 'later', envelope)).toBeNull();
    expect(intervalOf(undefined, undefined, 'x')).toBeNull();
  });
});

describe('featureState', () => {
  const certain = intervalOf('0120', '0200', '0106/0271')!;

  it('is certain inside the interval, edges included, and outside beyond it', () => {
    expect(featureState(certain, 120)).toBe('certain');
    expect(featureState(certain, 160)).toBe('certain');
    expect(featureState(certain, 200)).toBe('certain');
    expect(featureState(certain, 119)).toBe('outside');
    expect(featureState(certain, 201)).toBe('outside');
  });

  it('is possible between the earliest and the latest reading of an imprecise date', () => {
    const decade = intervalOf('159X', '1620', '1500/1700')!;
    expect(featureState(decade, 1589)).toBe('outside');
    expect(featureState(decade, 1590)).toBe('possible');
    expect(featureState(decade, 1598)).toBe('possible');
    expect(featureState(decade, 1599)).toBe('certain');
    expect(featureState(decade, 1620)).toBe('certain');
    const ending = intervalOf('1500', '162X', '1500/1700')!;
    expect(featureState(ending, 1620)).toBe('certain');
    expect(featureState(ending, 1621)).toBe('possible');
    expect(featureState(ending, 1629)).toBe('possible');
    expect(featureState(ending, 1630)).toBe('outside');
  });

  it('is only possible on the boundary year of an uncertain endpoint', () => {
    const uncertain = intervalOf('0120?', '0200~', '0106/0271')!;
    expect(featureState(uncertain, 119)).toBe('outside');
    expect(featureState(uncertain, 120)).toBe('possible');
    expect(featureState(uncertain, 121)).toBe('certain');
    expect(featureState(uncertain, 199)).toBe('certain');
    expect(featureState(uncertain, 200)).toBe('possible');
    expect(featureState(uncertain, 201)).toBe('outside');
  });

  it('works across the BCE boundary', () => {
    const bce = intervalOf('-0106', '0010', '-0200/0100')!;
    expect(featureState(bce, -107)).toBe('outside');
    expect(featureState(bce, -106)).toBe('certain');
    expect(featureState(bce, 0)).toBe('certain');
    expect(featureState(bce, 11)).toBe('outside');
  });

  it('gives an undated feature the layer envelope', () => {
    const undated = intervalOf(undefined, undefined, '0106/0271')!;
    expect(featureState(undated, 105)).toBe('outside');
    expect(featureState(undated, 106)).toBe('certain');
    expect(featureState(undated, 271)).toBe('certain');
    expect(featureState(undated, 272)).toBe('outside');
  });
});

describe('envelopeState', () => {
  it('is in range inside an envelope, edges included, and out of range beyond it', () => {
    expect(envelopeState('0106/0271', 106)).toBe('in_range');
    expect(envelopeState('0106/0271', 271)).toBe('in_range');
    expect(envelopeState('0106/0271', 105)).toBe('out_of_range');
    expect(envelopeState('0106/0271', 1400)).toBe('out_of_range');
  });

  it('reads the widest reading of an imprecise envelope', () => {
    expect(envelopeState('159X/160X', 1590)).toBe('in_range');
    expect(envelopeState('159X/160X', 1609)).toBe('in_range');
    expect(envelopeState('159X/160X', 1610)).toBe('out_of_range');
  });

  it('treats an envelope that cannot be read as out of range, never as always visible', () => {
    expect(envelopeState('nonsense', 1400)).toBe('out_of_range');
  });
});
