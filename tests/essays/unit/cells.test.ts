import { describe, expect, it } from 'vitest';
import { renderCell, stratumLabel, type Cell } from '../../../src/essays/cells.js';

/*
 * Spec 003 T040 (FR-016): a Trench A cell that will one day be backed by a CND attestation is the
 * essay's own data, marked `corpus: none` and shown as not yet corpus-backed. The retrofit adds an
 * `attestation` ID and changes nothing else about the cell, the marker included.
 */
const local: Cell = { pit: 'Sondaj 1', stratum: 3, name: 'terra sigillata', language: 'la', reading: 'terra sigillata', note: 'Found in the lower fill.', corpus: 'none' };
const ATTESTATION = 'tc:tc:attestation:attestation-000001';
const backed: Cell = { ...local, attestation: ATTESTATION };

describe('renderCell', () => {
  it('shows a corpus: none cell as not yet corpus-backed, with no attestation', () => {
    expect(renderCell(local)).toMatchObject({ corpusLabel: 'not yet corpus-backed', attestation: null });
  });

  it('shows a backed cell as corpus-backed and names its attestation', () => {
    expect(renderCell(backed)).toMatchObject({ corpusLabel: 'corpus-backed', attestation: ATTESTATION });
  });

  it('treats the ID alone as the retrofit: the cell keeps its corpus: none marker', () => {
    expect(backed.corpus).toBe('none');
    expect(renderCell(backed).corpusLabel).toBe('corpus-backed');
  });

  it('rejects a blank attestation ID', () => {
    expect(() => renderCell({ ...local, attestation: ' ' })).toThrow(/Sondaj 1.*terra sigillata.*attestation/);
  });

  it('changes nothing but the corpus label and the attestation when the retrofit adds the ID', () => {
    const { corpusLabel: _a, attestation: _b, ...before } = renderCell(local);
    const { corpusLabel: _c, attestation: _d, ...after } = renderCell(backed);
    expect(after).toEqual(before);
  });

  it('keeps the cell’s own fields as the reader sees them', () => {
    expect(renderCell(local)).toMatchObject({ pit: 'Sondaj 1', stratum: 3, name: 'terra sigillata', language: 'la', reading: 'terra sigillata', note: 'Found in the lower fill.' });
  });
});

/*
 * Spec 009 T021: a pit's strata are numbered 0 to XII, as the legacy pit tables number them: the
 * present layer is 0 and the Roman layer XII, so the numeral is the depth.
 */
describe('stratumLabel', () => {
  it('writes the present layer as 0 and the rest as Roman numerals to XII', () => {
    expect(Array.from({ length: 13 }, (_, i) => stratumLabel(i))).toEqual(['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
  });

  it('refuses a stratum outside the thirteen, so a mis-keyed cell cannot print a blank label', () => {
    expect(() => stratumLabel(13)).toThrow(/stratum/);
    expect(() => stratumLabel(-1)).toThrow(/stratum/);
  });
});
