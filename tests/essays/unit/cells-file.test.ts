import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { stageAtLeast } from '../../../src/registry/stages.js';
import { renderCell, type Cell } from '../../../src/essays/cells.js';
import { validateCellFile } from '../../../src/essays/cells-file.js';

/*
 * Spec 009 T011 (data-model.md "Cell file"): the essay's own 52 pit cells. Exactly 52 entries; four pits of
 * thirteen strata each, in order; every row `corpus: 'none'` with no `attestation`; every row rendered
 * "not yet corpus-backed". Pure: a parsed JSON value in, a list of problems out.
 */
const PITS = ['sarmizegetusa', 'apulum', 'napoca', 'drobeta'] as const;
const cells = (): Cell[] =>
  PITS.flatMap((pit) =>
    Array.from({ length: 13 }, (_, stratum): Cell => ({ pit, stratum, name: `name ${pit} ${stratum}`, language: 'Latin', reading: '', note: 'a note', corpus: 'none' })),
  );

describe('validateCellFile', () => {
  it('accepts four pits of thirteen strata, in order, every cell local', () => {
    expect(validateCellFile(cells())).toEqual([]);
  });

  it('renders every cell of a valid file as not yet corpus-backed', () => {
    for (const cell of cells()) expect(renderCell(cell).corpusLabel).toBe('not yet corpus-backed');
  });
});

describe('validateCellFile: the count and the shape', () => {
  it('asks for exactly 52 cells', () => {
    expect(validateCellFile(cells().slice(0, 51))).toContain('expected 52 cells, found 51');
    expect(validateCellFile([...cells(), cells()[0]])).toContain('expected 52 cells, found 53');
  });

  it('is a problem when the file is not a list, or an entry is not an object', () => {
    expect(validateCellFile({})).toEqual(['the cell file must be a list of cells']);
    expect(validateCellFile([...cells().slice(0, 51), 'text'])).toContain('cell 51 is not an object');
  });
});

describe('validateCellFile: the order', () => {
  it('wants the four pits in order, each with strata 0 to XII in order', () => {
    const swapped = cells();
    [swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!];
    expect(validateCellFile(swapped)).toEqual(['cell 1 should be sarmizegetusa stratum 1, found sarmizegetusa stratum 2', 'cell 2 should be sarmizegetusa stratum 2, found sarmizegetusa stratum 1']);
    const wrongPit = cells();
    wrongPit[20] = { ...wrongPit[20]!, pit: 'athens' };
    expect(validateCellFile(wrongPit)).toEqual(['cell 20 should be apulum stratum 7, found athens stratum 7']);
  });
});

describe('validateCellFile: a cell is local data', () => {
  const withCell = (i: number, over: Record<string, unknown>) => cells().map((c, k) => (k === i ? { ...c, ...over } : c));

  it('is `corpus: none` with no attestation, so it renders as not yet corpus-backed', () => {
    expect(validateCellFile(withCell(3, { corpus: 'cnd' }))).toEqual(['cell 3 must have corpus "none"']);
    expect(validateCellFile(withCell(3, { attestation: 'att-0001' }))).toEqual(['cell 3 must not have an attestation yet (it is local data until the corpus holds one)']);
  });

  it('has a name, a tongue, a note and a reading as text (the reading may be empty until the author confirms it)', () => {
    expect(validateCellFile(withCell(5, { name: '' }))).toEqual(['cell 5 has no name']);
    expect(validateCellFile(withCell(5, { language: 7 }))).toEqual(['cell 5 needs language as text']);
    expect(validateCellFile(withCell(5, { note: undefined }))).toEqual(['cell 5 needs note as text']);
    expect(validateCellFile(withCell(5, { reading: undefined }))).toEqual(['cell 5 needs reading as text']);
    expect(validateCellFile(withCell(5, { reading: '' }))).toEqual([]);
  });
});

describe('the essay\'s real cell file', () => {
  it('is valid once it exists, and must exist by the time the essay is at Draft', async () => {
    const { records } = await loadRegistry('.');
    const essay = records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
    if (!essay) return;
    const file = essay.file.replace(/\.yaml$/, '.cells.json');
    if (!existsSync(file)) {
      expect(stageAtLeast(essay.stage, 'Draft')).toBe(false);
      return;
    }
    expect(validateCellFile(JSON.parse(readFileSync(file, 'utf8')))).toEqual([]);
  });
});

