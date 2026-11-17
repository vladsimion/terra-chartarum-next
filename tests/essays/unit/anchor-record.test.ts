import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T024 (US3, data-model.md "Essay record"): what the anchor essay's record must say. The
 * record is minted by the author at T025, so until it exists these tests hold the registry to the
 * one thing that is true before it: nothing claims the essay's slug or its legacy URL. From the
 * moment it exists they bite, on every field the data model fixes and on every legacy field the
 * port drops.
 */
const SLUG = 'dacia-lapidarium';
const TITLE = 'Terra Sigillata · Lapidarium Dacicum';
const LEGACY_URL = '/essays/dacia/';
const BORDER = 'tc:tc:room:border';
const ARCHIVE = 'tc:tc:room:archive';

/** The legacy frontmatter fields the port drops (data-model.md); none may reappear on the record. */
const DROPPED = [
  'eras',
  'regions',
  'mapCount',
  'yearFrom',
  'yearTo',
  'readingMinutes',
  'metaScores',
  'featured',
  'order',
  'status',
  'cover',
  'hero',
  'publishedAt',
  'updatedAt',
];

const registry = await loadRegistry('.');
const essays = registry.records.filter((r) => r.family === 'essay');
const anchor = essays.find((r) => r.slug === SLUG);

describe('the anchor essay record', () => {
  it('is the only record that claims the slug or the legacy URL', () => {
    expect(essays.filter((r) => r.slug === SLUG)).toHaveLength(anchor ? 1 : 0);
    expect(registry.records.filter((r) => r.legacy_url === LEGACY_URL).map((r) => r.id)).toEqual(anchor ? [anchor.id] : []);
  });

  describe.runIf(anchor !== undefined)('once the author has minted it (T025)', () => {
    const record = anchor as RegistryRecord;

    it('is a minted essay with the title and slug the port fixes', () => {
      expect(record.family).toBe('essay');
      expect(record.origin).toBe('minted');
      expect(record.id).toMatch(/^tc:tc:essay:essay-\d{6}$/);
      expect(record.title).toBe(TITLE);
      expect(record.slug).toBe(SLUG);
    });

    it('is Vlad Simion’s, in gold', () => {
      expect(record.authors).toEqual(['Vlad Simion']);
      expect(record.accent).toBe('gold');
    });

    it('sits in Border, and in Archive after it', () => {
      expect(record.rooms).toMatchObject({ primary: BORDER, secondary: [ARCHIVE] });
    });

    it('reads the trench along Measure and Silence', () => {
      expect(record.portal_dimensions).toEqual(['Measure', 'Silence']);
    });

    it('names the legacy URL the redirect will come from', () => {
      expect(record.legacy_url).toBe(LEGACY_URL);
    });

    it('stays held until it reaches Publish', () => {
      if (stageAtLeast(record.stage, 'Publish')) expect(record.release).toBe('released');
      else expect(record.release).toBe('held');
    });

    it('carries none of the legacy frontmatter the port drops', () => {
      expect(DROPPED.filter((field) => record[field] !== undefined)).toEqual([]);
    });
  });
});
