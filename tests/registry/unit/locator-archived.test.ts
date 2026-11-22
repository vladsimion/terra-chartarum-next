import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { evidence } from '../support/builders.js';

/*
 * Spec 010 T042 (FR-018, data-model.md "Evidence locator: archived_copy, archived_on"): an archived
 * copy comes with the date it was taken, as an https URL, never in the future, at every lifecycle.
 */
const NOW = new Date('2026-11-22T12:00:00Z');

const VERIFIED = {
  value: 'p. 12',
  state: 'verified',
  proposed_by: 'person',
  verified_by: 'V. Simion',
  verified_on: '2026-10-01',
  consulted_copy: 'Venice 1548, scan https://example.org/scan/1',
};

const hits = (locator: Record<string, unknown>, lifecycle = 'researching') =>
  validateRegistry([evidence(1, { lifecycle, locator })], { now: NOW }).violations.filter((v) => v.rule === 'LOC-ARCHIVED');

describe('LOC-ARCHIVED', () => {
  it('accepts a locator with neither field', () => {
    expect(hits(VERIFIED)).toEqual([]);
  });

  it('accepts an https archived copy with a past date', () => {
    expect(hits({ ...VERIFIED, archived_copy: 'https://web.archive.org/web/20261101000000/https://example.org/scan/1', archived_on: '2026-11-01' })).toEqual([]);
  });

  it('accepts today', () => {
    expect(hits({ ...VERIFIED, archived_copy: 'https://web.archive.org/web/2026/x', archived_on: '2026-11-22' })).toEqual([]);
  });

  it.each([
    ['an archived copy with no date', { archived_copy: 'https://web.archive.org/web/2026/x' }, 'locator.archived_on'],
    ['a date with no archived copy', { archived_on: '2026-11-01' }, 'locator.archived_copy'],
    ['an http URL', { archived_copy: 'http://web.archive.org/web/2026/x', archived_on: '2026-11-01' }, 'locator.archived_copy'],
    ['a date not in YYYY-MM-DD', { archived_copy: 'https://web.archive.org/web/2026/x', archived_on: '1 Nov 2026' }, 'locator.archived_on'],
    ['an impossible date', { archived_copy: 'https://web.archive.org/web/2026/x', archived_on: '2026-02-30' }, 'locator.archived_on'],
    ['a future date', { archived_copy: 'https://web.archive.org/web/2026/x', archived_on: '2026-12-01' }, 'locator.archived_on'],
  ])('fails for %s', (_name, extra, field) => {
    const found = hits({ ...VERIFIED, ...extra });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field, severity: 'error' });
  });

  it('is an error at every lifecycle', () => {
    expect(hits({ ...VERIFIED, archived_on: '2026-11-01' }, 'proposed')[0]?.severity).toBe('error');
  });

  it('is a field the evidence family defines, so FAM-UNKNOWN stays quiet', () => {
    const report = validateRegistry([evidence(1, { locator: { ...VERIFIED, archived_copy: 'https://web.archive.org/web/2026/x', archived_on: '2026-11-01' } })], { now: NOW });
    expect(report.violations.filter((v) => v.field?.startsWith('locator.archived'))).toEqual([]);
  });
});
