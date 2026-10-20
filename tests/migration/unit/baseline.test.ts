import { describe, expect, it } from 'vitest';
import { baselineDocument, baselineFileName, baselineRecord, baselineTable, requireUrls } from '../../../src/migration/baseline.js';

/*
 * Spec 008 T041 (US4 scenario 3): the one-off baseline of the live site's key templates, recorded before
 * the freeze as a comparison (not a gate). Built from canned Lighthouse results, so no browser runs here.
 */
const lh = (url: string, over: { perf?: number; a11y?: number; lcp?: number; cls?: number; tbt?: number; script?: number } = {}) => ({
  requestedUrl: url,
  finalDisplayedUrl: url,
  lighthouseVersion: '12.6.1',
  categories: { performance: { score: over.perf ?? 0.91 }, accessibility: { score: over.a11y ?? 1 } },
  audits: {
    'largest-contentful-paint': { numericValue: over.lcp ?? 2100.4 },
    'cumulative-layout-shift': { numericValue: over.cls ?? 0.02 },
    'total-blocking-time': { numericValue: over.tbt ?? 120 },
    'resource-summary': { details: { items: [{ resourceType: 'script', transferSize: over.script ?? 80000 }, { resourceType: 'total', transferSize: 500000 }] } },
  },
});

describe('baselineRecord', () => {
  it('keeps the ADR 0004 numbers per URL, scores as percentages and times rounded', () => {
    expect(baselineRecord(lh('https://terra-chartarum.pages.dev/'))).toEqual({
      url: 'https://terra-chartarum.pages.dev/',
      performance: 91,
      accessibility: 100,
      lcp_ms: 2100,
      cls: 0.02,
      tbt_ms: 120,
      script_bytes: 80000,
    });
  });
  it('records a missing audit as null rather than inventing a number', () => {
    expect(baselineRecord({ requestedUrl: 'https://x/', categories: {}, audits: {} })).toEqual({ url: 'https://x/', performance: null, accessibility: null, lcp_ms: null, cls: null, tbt_ms: null, script_bytes: null });
  });
});

describe('baselineTable', () => {
  it('writes one row per URL under a header, with a dash for a missing value', () => {
    const table = baselineTable([baselineRecord(lh('https://a/')), baselineRecord({ requestedUrl: 'https://b/', categories: {}, audits: {} })]);
    const rows = table.trim().split('\n');
    expect(rows[0]).toMatch(/URL.*Performance.*Accessibility.*LCP.*CLS.*TBT.*Script/);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toContain('https://a/');
    expect(rows[3]).toMatch(/https:\/\/b\/ \| – \|/);
  });
});

describe('baselineFileName', () => {
  it('carries the date', () => {
    expect(baselineFileName('2026-11-02')).toBe('live-site-2026-11-02.json');
  });
  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(() => baselineFileName('02/11/2026')).toThrow(/YYYY-MM-DD/);
  });
});

describe('baselineDocument', () => {
  it('names the profile, the date and the Lighthouse version beside the records', () => {
    const doc = baselineDocument([lh('https://a/')], '2026-11-02');
    expect(doc).toMatchObject({ date: '2026-11-02', profile: 'lighthouse mobile (ADR 0004)', lighthouse: '12.6.1' });
    expect(doc.results).toHaveLength(1);
  });
});

describe('requireUrls', () => {
  it('refuses to run without URLs', () => {
    expect(() => requireUrls([])).toThrow(/at least one URL/);
    expect(() => requireUrls(['--'])).toThrow(/at least one URL/);
  });
  it('returns the URLs, dropping the npm separator, and refuses a URL that is not http(s)', () => {
    expect(requireUrls(['--', 'https://a/', 'https://b/'])).toEqual(['https://a/', 'https://b/']);
    expect(() => requireUrls(['file:///etc/passwd'])).toThrow(/http/);
  });
});
