import { describe, expect, it } from 'vitest';
import { collectUrls } from '../../src/linkcheck/collect.js';
import { evidence, map, record } from '../registry/support/builders.js';

/*
 * Spec 010 T044 (FR-015, contracts/link-check.md "URLs checked"): every external URL the records
 * depend on, once, with every record and field that uses it; held records included.
 */
describe('collectUrls', () => {
  const records = [
    evidence(1, { locator: { value: 'p. 1', state: 'verified', consulted_copy: 'Venice 1548, scan https://example.org/scan/1 and https://example.org/scan/2.' } }),
    evidence(2, { locator: { value: 'p. 2', state: 'pending', consulted_copy: 'https://example.org/scan/1' } }),
    map(1, {
      images: [
        { type: 'iiif', url: 'https://iiif.example.org/manifest.json', static_url: 'https://iiif.example.org/full.jpg' },
        { type: 'static', url: 'https://img.example.org/a.jpg' },
      ],
    }),
    record('bibliography_entry', 1, { digital_copy: 'https://books.example.org/b1' }),
    record('dataset', 1, { upstream: { url: 'https://data.example.org/v1', pin: 'tag:v1' } }),
    record('place', 1, { same_as: [{ authority: 'pleiades', id: '12345' }] }),
  ];
  const collected = collectUrls(records);
  const byUrl = new Map(collected.map((c) => [c.url, c]));

  it('lists each URL once, with every record and field using it', () => {
    expect(collected.filter((c) => c.url === 'https://example.org/scan/1')).toHaveLength(1);
    expect(byUrl.get('https://example.org/scan/1')?.uses).toEqual([
      { id: 'tc:tc:evidence:evidence-000001', file: 'content/evidence/evidence-000001.yaml', field: 'locator.consulted_copy' },
      { id: 'tc:tc:evidence:evidence-000002', file: 'content/evidence/evidence-000002.yaml', field: 'locator.consulted_copy' },
    ]);
  });

  it('finds every URL in the consulted copy text, without trailing punctuation', () => {
    expect(byUrl.has('https://example.org/scan/2')).toBe(true);
    expect(byUrl.has('https://example.org/scan/2.')).toBe(false);
  });

  it('collects map images, marking an IIIF manifest', () => {
    expect(byUrl.get('https://iiif.example.org/manifest.json')).toMatchObject({ manifest: true, uses: [{ id: 'tc:tc:map:map-000001', field: 'images[0].url' }] });
    expect(byUrl.get('https://iiif.example.org/full.jpg')).toMatchObject({ manifest: false, uses: [{ field: 'images[0].static_url' }] });
    expect(byUrl.get('https://img.example.org/a.jpg')).toMatchObject({ manifest: false, uses: [{ field: 'images[1].url' }] });
  });

  it('collects bibliography digital copies and dataset upstream URLs', () => {
    expect(byUrl.get('https://books.example.org/b1')?.uses[0]?.field).toBe('digital_copy');
    expect(byUrl.get('https://data.example.org/v1')?.uses[0]?.field).toBe('upstream.url');
  });

  it('includes held records (every builder record here is held)', () => {
    expect(collected.length).toBe(7);
  });

  it('does not collect same_as identifiers', () => {
    expect(collected.some((c) => c.url.includes('12345'))).toBe(false);
  });
});
