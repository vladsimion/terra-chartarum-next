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
