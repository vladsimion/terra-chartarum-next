import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence, record } from '../support/builders.js';

const hits = (records: ReturnType<typeof record>[], rule: string) =>
  validateRegistry(records).violations.filter((v) => v.rule === rule);

describe('DATE-INVALID (ADR 0007)', () => {
  it.each(['0106', '-0106', '1595-03-12', '159X', '1595?', '1595/1602'])('accepts %s', (value) => {
    expect(hits([evidence(1, { valid_from: value, valid_to: '1700' })], 'DATE-INVALID')).toEqual([]);
  });

  it.each([
    [106, 'an integer year, the first model'],
    ['106', 'fewer than four digits'],
    ['banana', 'not a date'],
    ['', 'empty'],
    ['2004-06-21T12:00:00', 'a time of day'],
  ])('fails %j (%s), naming the field and the format', (value, _why) => {
    const found = hits([evidence(1, { valid_from: value })], 'DATE-INVALID');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'valid_from', value, severity: 'error' });
    expect(found[0]?.expected).toMatch(/EDTF/);
  });

  it('checks valid_to as well', () => {
    expect(hits([evidence(1, { valid_to: 'soon' })], 'DATE-INVALID').map((v) => v.field)).toEqual(['valid_to']);
  });

  it('leaves an absent date alone: a missing date is unknown, not invalid', () => {
    expect(hits([evidence(1)], 'DATE-INVALID')).toEqual([]);
  });

  it('applies to every family that carries the dates, and is an error whatever the lifecycle', () => {
    const early = record('period', 1, { lifecycle: 'proposed', valid_from: 'nonsense' });
    expect(hits([early], 'DATE-INVALID')[0]?.severity).toBe('error');
  });
});

describe('DATE-ORDER: the start cannot be definitely later than the end', () => {
  it('fails when valid_from is after valid_to', () => {
    const found = hits([evidence(1, { valid_from: '0200', valid_to: '0100' })], 'DATE-ORDER');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'valid_from', severity: 'error' });
  });

  it('orders BCE years correctly', () => {
    expect(hits([evidence(1, { valid_from: '-0101', valid_to: '0106' })], 'DATE-ORDER')).toEqual([]);
    expect(hits([evidence(1, { valid_from: '0106', valid_to: '-0101' })], 'DATE-ORDER')).toHaveLength(1);
  });

  it('accepts the same date at both ends', () => {
    expect(hits([evidence(1, { valid_from: '0106', valid_to: '0106' })], 'DATE-ORDER')).toEqual([]);
  });

  it('allows overlap where the dates are not precise enough to say they are out of order', () => {
    expect(hits([evidence(1, { valid_from: '15XX', valid_to: '1550' })], 'DATE-ORDER')).toEqual([]);
    expect(hits([evidence(1, { valid_from: '1595/1602', valid_to: '1600' })], 'DATE-ORDER')).toEqual([]);
    expect(hits([evidence(1, { valid_from: '1595-03', valid_to: '1595-03-15' })], 'DATE-ORDER')).toEqual([]);
  });

  it('fails when even the most generous reading puts the start after the end', () => {
    expect(hits([evidence(1, { valid_from: '1602', valid_to: '159X' })], 'DATE-ORDER')).toHaveLength(1);
  });

  it('is not raised for a date that is invalid: DATE-INVALID reports that', () => {
    expect(hits([evidence(1, { valid_from: 'later', valid_to: '0100' })], 'DATE-ORDER')).toEqual([]);
  });

  it('applies to route, event and period too', () => {
    expect(hits([record('period', 1, { valid_from: '0500', valid_to: '0100' })], 'DATE-ORDER')).toHaveLength(1);
  });

  it('is fine when either date is absent', () => {
    expect(hits([evidence(1, { valid_from: '0500' }), evidence(2, { valid_to: '0100' })], 'DATE-ORDER')).toEqual([]);
  });
});

describe('DATE-PRECISION-AUTHORED: precision is derived, so it cannot be written (ADR 0007)', () => {
  it('fails a record that sets date_precision, because it could contradict the date', () => {
    const found = hits([evidence(1, { valid_from: '1595', date_precision: 'day' })], 'DATE-PRECISION-AUTHORED');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: 'date_precision', value: 'day', severity: 'error' });
  });

  it('fails on any value, even one that happens to agree', () => {
    expect(hits([evidence(1, { valid_from: '1595', date_precision: 'year' })], 'DATE-PRECISION-AUTHORED')).toHaveLength(1);
  });

  it('is an error whatever the lifecycle, and applies to every family', () => {
    const early = record('event', 1, { lifecycle: 'proposed', date_precision: 'decade' });
    expect(hits([early], 'DATE-PRECISION-AUTHORED')[0]?.severity).toBe('error');
  });

  it('says nothing about a record that leaves precision to be derived', () => {
    expect(hits([evidence(1, { valid_from: '1595' })], 'DATE-PRECISION-AUTHORED')).toEqual([]);
  });
});

describe('date_label stays free text for display', () => {
  it('is not validated', () => {
    const found = validateRegistry([evidence(1, { valid_from: '1540', date_label: '1540 (this copy; plate dated 1531)' })]).violations;
    expect(found.filter((v) => v.rule.startsWith('DATE-'))).toEqual([]);
  });
});
