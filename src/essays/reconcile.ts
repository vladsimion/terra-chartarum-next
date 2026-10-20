import { stageAtLeast } from '../registry/stages.js';
import type { Cell } from './cells.js';

/*
 * The pit cells against the legacy attestation CSV (spec 009, contracts/review-tooling.md). Pure: cells and
 * CSV rows in, one row per pairing out. The essay's table is the source of truth; a difference is
 * something for the author to resolve, not an error in the essay.
 */
export interface CsvRow {
  attestation_id: string;
  place_id: string;
  source_id: string;
  attestation_class: string;
  name_original: string;
  language: string;
  name_transliterated: string;
  name_normalized: string;
  note: string;
}

export interface ReconRow {
  pit: string;
  stratum: number;
  essayName: string;
  csvId: string;
  csvName: string;
  csvNormalized: string;
  csvClass: string;
  difference: 'none' | 'name' | 'language' | 'note' | 'missing in CSV' | 'missing in essay';
  resolution: string;
  resolvedBy: string;
}

/** The places each pit is sunk on: the Sarmizegetusa pit stands on the colonia, and the legacy data also has a row for Regia. */
const PIT_PLACES: Record<string, string[]> = {
  sarmizegetusa: ['plc-ulpia-traiana-sarmizegetusa', 'plc-sarmizegetusa-regia'],
  apulum: ['plc-apulum'],
  napoca: ['plc-napoca'],
  drobeta: ['plc-drobeta'],
};

/** The source each stratum rests on; stratum 0 (the present survey) is local and has none. */
const STRATUM_SOURCES: Record<number, string> = {
  1: 'src-secret-century',
  2: 'src-szathmari-charta',
  3: 'src-russian-staff-1835',
  4: 'src-iosephina-survey',
  5: 'src-cantemir-moldavia',
  6: 'src-cantacuzino-wallachia',
  7: 'src-ortelius-parergon',
  8: 'src-honterus-chorographia',
  9: 'src-vesconte-portolan',
  10: 'src-hereford-mappa',
  11: 'src-tabula-peutingeriana',
  12: 'src-ptolemy-geographia',
};

const fold = (text: string): string =>
  text
    .replace(/[_*]/g, '')
    .replace(/\(uncertain\)/gi, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** The author's marks for a stratum a sheet does not cover (`extra muros`) or covers and leaves unnamed (`absent`), and the CSV class each corresponds to. */
const MARKS: Record<string, string> = { 'extra muros': 'extra_muros', absent: 'source_silent' };

function sameName(essayName: string, row: CsvRow): boolean {
  const name = fold(essayName);
  const mark = MARKS[name];
  if (mark !== undefined) return row.attestation_class === mark;
  // one cell may list several names ("Klausenburg / Kolozsvár"): it matches when any of them is a spelling the CSV has
  const parts = essayName.split(/ \/ | · | - /).map(fold);
  const spellings = [row.name_transliterated, row.name_original, row.name_normalized].filter((n) => n !== '' && n !== 'pending').map(fold);
  return parts.some((part) => spellings.includes(part));
}

/** The tongues the legacy language codes stand for in the pit rows. */
const LANGUAGES: Record<string, string> = { la: 'latin', ro: 'romanian', de: 'german', grc: 'greek', hu: 'hungarian' };

function sameLanguage(essayTongue: string, code: string): boolean {
  const tongue = fold(essayTongue);
  const none = tongue === '' || tongue === '-';
  if (code === '') return none;
  const named = LANGUAGES[code];
  return named !== undefined && !none && tongue.includes(named);
}

function difference(cell: Cell, row: CsvRow): ReconRow['difference'] {
  if (!sameName(cell.name, row)) return 'name';
  if (!sameLanguage(cell.language, row.language)) return 'language';
  if ((cell.note.trim() === '') !== (row.note.trim() === '')) return 'note';
  return 'none';
}

const pitOf = (placeId: string): string => Object.entries(PIT_PLACES).find(([, places]) => places.includes(placeId))?.[0] ?? '';
const stratumOf = (sourceId: string): number => Number(Object.entries(STRATUM_SOURCES).find(([, source]) => source === sourceId)?.[0] ?? -1);

const fromRow = (row: CsvRow): Pick<ReconRow, 'csvId' | 'csvName' | 'csvNormalized' | 'csvClass'> => ({
  csvId: row.attestation_id,
  csvName: row.name_transliterated || row.name_original,
  csvNormalized: row.name_normalized,
  csvClass: row.attestation_class,
});
const none = { csvId: '', csvName: '', csvNormalized: '', csvClass: '' };

/** One row per cell, then one for each CSV row of a pit's place that no cell claims (stratum -1 when its source belongs to no stratum). */
export function reconcile(cells: readonly Cell[], csv: readonly CsvRow[]): ReconRow[] {
  const pitRows = csv.filter((r) => pitOf(r.place_id) !== '');
  const claimed = new Set<string>();
  const out: ReconRow[] = [];
  const base = (cell: Cell) => ({ pit: cell.pit, stratum: cell.stratum, essayName: cell.name, resolution: '', resolvedBy: '' });
  for (const cell of cells) {
    if (cell.stratum === 0) {
      // the present survey is the essay's own local stratum: no CSV row exists by design
      out.push({ ...base(cell), ...none, csvClass: 'local', difference: 'none' });
      continue;
    }
    const candidates = pitRows.filter((r) => PIT_PLACES[cell.pit]?.includes(r.place_id) && r.source_id === STRATUM_SOURCES[cell.stratum] && !claimed.has(r.attestation_id));
    const match = candidates.find((r) => sameName(cell.name, r)) ?? candidates[0];
    if (!match) {
      out.push({ ...base(cell), ...none, difference: 'missing in CSV' });
      continue;
    }
    claimed.add(match.attestation_id);
    out.push({ ...base(cell), ...fromRow(match), difference: difference(cell, match) });
  }
  for (const row of pitRows) {
    if (!claimed.has(row.attestation_id)) {
      out.push({ pit: pitOf(row.place_id), stratum: stratumOf(row.source_id), essayName: '', ...fromRow(row), difference: 'missing in essay', resolution: '', resolvedBy: '' });
    }
  }
  return out;
}

const HEADER = ['pit', 'stratum', 'essay name', 'CSV id', 'CSV name', 'CSV normalized', 'CSV class', 'difference', 'resolution', 'resolved by'];

/** The report as a Markdown table (the file the author edits to resolve differences). */
export function renderReconciliation(rows: readonly ReconRow[]): string {
  const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;
  return [
    line(HEADER),
    line(HEADER.map(() => '---')),
    ...rows.map((r) => line([r.pit, String(r.stratum), r.essayName, r.csvId, r.csvName, r.csvNormalized, r.csvClass, r.difference, r.resolution, r.resolvedBy])),
    '',
  ].join('\n');
}

/** The rows of the report's table; any other text is ignored. */
export function parseReconciliation(markdown: string): ReconRow[] {
  const rows: ReconRow[] = [];
  let inTable = false;
  for (const raw of markdown.split('\n')) {
    const text = raw.trim();
    if (!text.startsWith('|')) continue;
    const cells = text.replace(/^\|\s?|\s?\|$/g, '').split(' | ');
    if (cells[0] === 'pit') {
      inTable = true;
      continue;
    }
    if (!inTable || cells.length !== HEADER.length || /^-+$/.test(cells[0] ?? '')) continue;
    const [pit, stratum, essayName, csvId, csvName, csvNormalized, csvClass, diff, resolution, resolvedBy] = cells as [string, string, string, string, string, string, string, string, string, string];
    rows.push({ pit, stratum: Number(stratum), essayName, csvId, csvName, csvNormalized, csvClass, difference: diff as ReconRow['difference'], resolution, resolvedBy });
  }
  return rows;
}

const key = (r: ReconRow) => `${r.pit}/${r.stratum}/${r.csvId}`;

/** A fresh run with the resolutions the author already wrote, matched by pit, stratum and CSV row. */
export function mergeResolutions(fresh: readonly ReconRow[], previous: readonly ReconRow[]): ReconRow[] {
  const old = new Map(previous.map((r) => [key(r), r]));
  return fresh.map((r) => {
    const before = old.get(key(r));
    return before ? { ...r, resolution: before.resolution, resolvedBy: before.resolvedBy } : r;
  });
}

/** What is wrong with the report for an essay at `stage`: an unresolved difference from Build on, and a resolution that names nobody. */
export function reconcileProblems(rows: readonly ReconRow[], stage: string | undefined): string[] {
  const problems: string[] = [];
  for (const r of rows) {
    const where = `${r.pit} stratum ${r.stratum} (${r.csvId || 'no CSV row'})`;
    if (r.resolution !== '' && r.resolvedBy === '') problems.push(`${where} is resolved but names nobody`);
    else if (r.difference !== 'none' && r.resolution === '' && stageAtLeast(stage, 'Build')) problems.push(`${where} has a ${r.difference} difference with no resolution and the essay is at ${stage}`);
  }
  return problems;
}

