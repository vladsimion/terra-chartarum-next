import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { validateRegistry } from '../../src/registry/integrity.ts';
import { loadRecords } from '../../src/registry/load.ts';
import { REFERENCE_FIELDS } from '../../src/registry/schemas/families.ts';
import { FAMILIES } from '../../src/registry/vocab.ts';

// The shared valid fixture (T031) must stay complete: every family present,
// every kind of reference exercised, and the whole registry passing seam 1.

const VALID = resolve(import.meta.dirname, 'fixtures/valid');

describe('valid fixture', async () => {
  const loaded = await loadRecords(VALID);

  test('loads without errors and passes the integrity check', () => {
    expect(loaded.errors).toEqual([]);
    const result = validateRegistry({ records: loaded.records, loadErrors: loaded.errors });
    expect(result.violations).toEqual([]);
    expect(result.status).toBe('pass');
  });

  test('has at least one record of every family', () => {
    const families = new Set(loaded.records.map(({ record }) => record['family']));
    expect([...FAMILIES].filter((f) => !families.has(f))).toEqual([]);
  });

  test('exercises every reference field of every family', () => {
    const missing: string[] = [];
    for (const [family, fields] of Object.entries(REFERENCE_FIELDS)) {
      for (const field of Object.keys(fields)) {
        const used = loaded.records.some(({ record }) => {
          const value = record['family'] === family ? record[field] : undefined;
          return Array.isArray(value) ? value.length > 0 : value !== undefined;
        });
        if (!used) missing.push(`${family}.${field}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('uses room assignments, superseded_by and an explicit authority', () => {
    const records = loaded.records.map(({ record }) => record);
    expect(records.some((r) => r['rooms'] !== undefined)).toBe(true);
    expect(records.some((r) => r['superseded_by'] !== undefined)).toBe(true);
    expect(records.some((r) => r['authority'] !== undefined && r['authority'] !== 'tc')).toBe(true);
  });
});

describe('valid fixture: evidence coverage (T038)', async () => {
  const loaded = await loadRecords(VALID);
  const evidence = loaded.records.flatMap(({ record }) =>
    Array.isArray(record['evidence']) ? (record['evidence'] as Record<string, unknown>[]) : [],
  );

  test('includes a source-geometry claim and a scholarly reconstruction', () => {
    const provenance = new Set(evidence.map((e) => e['geometry_provenance']));
    expect(provenance.has('source_geometry')).toBe(true);
    expect(provenance.has('scholarly_reconstruction')).toBe(true);
  });

  test('includes a secure claim on a fully verified locator', () => {
    expect(
      evidence.some(
        (e) =>
          e['confidence'] === 'secure' &&
          e['locator_state'] === 'verified' &&
          e['verified_by'] !== undefined &&
          e['verified_on'] !== undefined &&
          e['consulted_copy'] !== undefined,
      ),
    ).toBe(true);
  });

  test('includes a published record with rights and an adjudicated automated extraction', () => {
    const records = loaded.records.map(({ record }) => record);
    expect(records.some((r) => r['lifecycle'] === 'published' && r['rights'] !== undefined)).toBe(true);
    expect(
      records.some((r) => {
        const x = r['extraction'] as Record<string, unknown> | undefined;
        return x !== undefined && x['method'] !== 'manual' && x['adjudicated_by'] !== undefined;
      }),
    ).toBe(true);
  });
});
