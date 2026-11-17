import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { CONFIDENCE_VALUES, EVIDENCE_TYPE_VALUES, LOCATOR_STATE_VALUES } from '../../../src/registry/schemas/shared.js';

/*
 * Spec 009 T030 (US3, data-model.md "Evidence records"): the twelve evidence records behind the
 * stones that have a source. Each rests on one of the twelve sources, carries the locator the author
 * supplies, names what kind of evidence it is and how confident the essay is, and cites no finding
 * aid. The author gives the twelve locators at T031, so until a record exists for a source these
 * tests hold the registry to what is true before it: the source itself is there to rest on, and no
 * evidence record names it yet. The moment one exists, it is checked in full.
 */
const SOURCES = [
  'src-ptolemy-geographia',
  'src-tabula-peutingeriana',
  'src-hereford-mappa',
  'src-vesconte-portolan',
  'src-honterus-chorographia',
  'src-ortelius-parergon',
  'src-cantacuzino-wallachia',
  'src-cantemir-moldavia',
  'src-iosephina-survey',
  'src-russian-staff-1835',
  'src-szathmari-charta',
  'src-secret-century',
];

const registry = await loadRegistry('.');
const byId = new Map(registry.records.map((r) => [r.id, r]));
const sourceId = (slug: string) => `tc:tc:source:${slug}`;
const evidenceFor = (slug: string) => registry.records.filter((r) => r.family === 'evidence' && r.source === sourceId(slug));

/** The locator as the schema shapes it; the author fills `value` and a person later verifies it. */
const locatorOf = (record: RegistryRecord) => (record.locator ?? {}) as { value?: unknown; state?: unknown };

describe('the twelve stone sources', () => {
  it('are all in the registry, so each evidence record has something to rest on', () => {
    expect(SOURCES.filter((slug) => byId.get(sourceId(slug))?.family !== 'source')).toEqual([]);
  });

  it('are none of them a finding aid, which no evidence record may cite (REF-FINDING-AID)', () => {
    expect(SOURCES.filter((slug) => byId.get(sourceId(slug))?.is_finding_aid === true)).toEqual([]);
  });
});

describe.each(SOURCES)('the evidence record for %s', (slug) => {
  const records = evidenceFor(slug);

  it('is one record, or none while the author is still supplying the twelve locators (T031)', () => {
    expect(records.length).toBeLessThanOrEqual(1);
  });

  describe.runIf(records.length === 1)('once it exists', () => {
    const record = records[0] as RegistryRecord;

    it('carries a locator the reader can follow, pending until a person verifies it', () => {
      const locator = locatorOf(record);
      expect(typeof locator.value === 'string' && locator.value.trim() !== '').toBe(true);
      expect(LOCATOR_STATE_VALUES).toContain(locator.state);
    });

    it('says what kind of evidence it is and how far the essay trusts it', () => {
      expect(EVIDENCE_TYPE_VALUES).toContain(record.evidence_type);
      expect(CONFIDENCE_VALUES).toContain(record.confidence);
    });

    it('points at an entity that resolves', () => {
      const target = record.target as { entity?: string } | undefined;
      expect(typeof target?.entity).toBe('string');
      expect(byId.has(target!.entity as string)).toBe(true);
    });
  });
});

describe('the twelve together', () => {
  const all = SOURCES.flatMap(evidenceFor);

  it('rest on twelve different sources, one each, once they are all written', () => {
    expect(new Set(all.map((r) => r.source)).size).toBe(all.length);
    if (all.length === SOURCES.length) expect(new Set(all.map((r) => r.id)).size).toBe(SOURCES.length);
  });
});
