/*
 * The three citation exports of an essay itself (spec 003 FR-009, contracts/citations-and-exports.md,
 * research R9): BibTeX, RIS and CSL-JSON, written as static files at build time. Pure: the same essay
 * and the same access date give the same bytes.
 */

export interface ExportableEssay {
  title: string;
  authors: readonly string[];
  /** EDTF date; only the year, month and day are used. */
  published_on?: string;
  /** The essay's stable address on terra-chartarum.org. */
  url: string;
}

export interface EssayExports {
  bibtex: string;
  ris: string;
  csljson: string;
}

/** An ISO calendar date (`YYYY-MM-DD`) that is a real day, or null. */
function isoDate(value: string | undefined): string | null {
  const text = value?.trim();
  if (text === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const day = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== text ? null : text;
}

/**
 * The date the build accessed the page, as a UTC calendar date, one for the whole site so an essay,
 * a map and a bibliography entry cannot disagree in one build: `BUILD_DATE` (an ISO date, spec 006
 * FR-009) when it is set, else `SOURCE_DATE_EPOCH` when it is a number, else `now`.
 */
export function accessDate(env: { BUILD_DATE?: string; SOURCE_DATE_EPOCH?: string }, now: Date = new Date()): string {
  const fixed = isoDate(env.BUILD_DATE);
  if (fixed !== null) return fixed;
  const epoch = env.SOURCE_DATE_EPOCH;
  const seconds = epoch !== undefined && /^\d+$/.test(epoch.trim()) ? Number(epoch.trim()) : null;
  return (seconds === null ? now : new Date(seconds * 1000)).toISOString().slice(0, 10);
}

interface Name {
  family?: string;
  given?: string;
  literal?: string;
}

/** The last word is the family name; a single word is kept as a literal rather than guessed at. */
function splitName(name: string): Name {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return { literal: words[0] ?? '' };
  return { family: words[words.length - 1]!, given: words.slice(0, -1).join(' ') };
}

const inverted = (n: Name) => (n.literal !== undefined ? n.literal : `${n.family}, ${n.given}`);

/** [year, month?, day?] from the leading digits of a date; null when there is no year. */
export function dateParts(value: string | undefined): number[] | null {
  const m = value === undefined ? null : /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  return [m[1], m[2], m[3]].filter((p): p is string => p !== undefined).map(Number);
}

const BIBTEX_SPECIAL = /[\\{}&%$#_~^]/g;
export const bibtexEscape = (text: string) =>
  text.replace(BIBTEX_SPECIAL, (c) => (c === '\\' ? '\\textbackslash{}' : c === '~' ? '\\textasciitilde{}' : c === '^' ? '\\textasciicircum{}' : `\\${c}`));

export function essayExports(essay: ExportableEssay, accessed: string): EssayExports {
  const names = essay.authors.map(splitName);
  const issued = dateParts(essay.published_on);
  const key = `essay-${essay.url.replace(/\/+$/, '').split('/').pop() ?? 'essay'}`.replace(/[^A-Za-z0-9_-]/g, '');

  const bibtexAuthor = names.map((n) => (n.literal !== undefined ? `{${bibtexEscape(n.literal)}}` : bibtexEscape(inverted(n)))).join(' and ');
  const bibtexLines = [
    `@online{${key},`,
    `  title = {${bibtexEscape(essay.title)}},`,
    ...(names.length > 0 ? [`  author = {${bibtexAuthor}},`] : []),
    ...(issued ? [`  year = {${issued[0]}},`, `  date = {${[issued[0], ...issued.slice(1).map((p) => String(p).padStart(2, '0'))].join('-')}},`] : []),
    `  url = {${essay.url}},`,
    `  urldate = {${accessed}},`,
    '}',
  ];

  const risDate = (parts: number[]) => [parts[0], ...parts.slice(1).map((p) => String(p).padStart(2, '0'))].join('/');
  const accessedParts = dateParts(accessed)!;
  const risLines = [
    'TY  - ELEC',
    `TI  - ${essay.title}`,
    ...names.map((n) => `AU  - ${inverted(n)}`),
    ...(issued ? [`DA  - ${risDate(issued)}`, `PY  - ${issued[0]}`] : []),
    `UR  - ${essay.url}`,
    `Y2  - ${risDate(accessedParts)}`,
    'ER  - ',
  ];

  const item = {
    id: key,
    type: 'webpage',
    title: essay.title,
    author: names,
    ...(issued ? { issued: { 'date-parts': [issued] } } : {}),
    accessed: { 'date-parts': [accessedParts] },
    URL: essay.url,
  };

  return {
    bibtex: `${bibtexLines.join('\n')}\n`,
    ris: `${risLines.join('\r\n')}\r\n`,
    csljson: `${JSON.stringify(item, null, 2)}\n`,
  };
}
