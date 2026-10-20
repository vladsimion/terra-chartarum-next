import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readCsv } from '../../../src/migration/read-csv.js';

/* Spec 008 T014: the Dacia CSVs are read directly, as text, by header; a quoted comma stays in its field. */
describe('readCsv', () => {
  it('reads rows by header, keeping a quoted comma and empty fields', () => {
    const rows = readCsv(readFileSync('tests/migration/fixtures/snapshot/data/dacia/places.csv', 'utf8'), 'data/dacia/places.csv');
    expect(rows).toEqual([
      { place_id: 'plc-nowhere', reference_name: 'Nowhere', place_type: 'settlement', region: 'Dacia', pleiades_id: '12345', whg_id: '' },
      { place_id: 'plc-elsewhere', reference_name: 'Elsewhere, Upper', place_type: 'fort', region: 'Dacia', pleiades_id: '', whg_id: '999' },
    ]);
  });

  it('reads a file with a byte-order mark and Windows line endings', () => {
    expect(readCsv('﻿a,b\r\n1,2\r\n', 'x.csv')).toEqual([{ a: '1', b: '2' }]);
  });

  it('names the file when a row has the wrong number of fields', () => {
    expect(() => readCsv('a,b\n1,2,3\n', 'data/x.csv')).toThrow(/data\/x\.csv/);
  });
});
