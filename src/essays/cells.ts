/*
 * Trench A name cells (spec 003 FR-016). Each cell is the essay's own local data, marked
 * `corpus: none` until the Corpus Chartarum Daciae holds its attestation. The retrofit adds the
 * `attestation` ID and nothing else; the ID's presence is what makes the cell corpus-backed, so what
 * the reader sees differs only in the label and the link target.
 */

export interface Cell {
  pit: string;
  stratum: number;
  name: string;
  language: string;
  reading: string;
  note: string;
  /** Marks the cell as the essay's own local data; it stays when the retrofit adds the ID. */
  corpus: 'none';
  attestation?: string;
}

export interface RenderedCell extends Omit<Cell, 'corpus' | 'attestation'> {
  corpusLabel: string;
  attestation: string | null;
}

export function renderCell(cell: Cell): RenderedCell {
  const { corpus: _local, attestation, ...own } = cell;
  if (attestation === undefined) return { ...own, corpusLabel: 'not yet corpus-backed', attestation: null };
  if (attestation.trim() === '') throw new Error(`cell ${cell.pit} / ${cell.name} has a blank attestation ID`);
  return { ...own, corpusLabel: 'corpus-backed', attestation };
}
