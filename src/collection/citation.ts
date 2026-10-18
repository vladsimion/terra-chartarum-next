import { formatBibliographyItem, type CslItem } from '../essays/citations.js';
import { bibtexEscape, dateParts } from '../essays/exports.js';

/*
 * Citing a map record (spec 004 FR-006): spec 003's generator with the map as input. The item is CSL
 * type `map`; the exports are written at build time, from the same item, so what the page prints and
 * what a reader downloads cannot disagree. Pure: the same record and access date give the same bytes.
 */
export interface CitableMap {
  title: string;
  /** Names of the makers, as the record page shows them. */
  makers: readonly string[];
  /** EDTF date; only its first year is cited. */
  date_published?: string;
  place?: string;
  /** The holder of the copy, for an institutional witness. */
  repository?: string;
  /** The record's stable address on terra-chartarum.org. */
  url: string;
}

export interface MapExports {
  bibtex: string;
  ris: string;
  csljson: string;
  /** The Chicago bibliography entry, as text. */
  chicago: string;
}

const slugOf = (url: string): string => url.replace(/\/+$/, '').split('/').pop() ?? 'map';

export function mapCsl(map: CitableMap, accessed: string): CslItem {
  const year = dateParts(map.date_published)?.[0];
  return {
    id: slugOf(map.url),
    type: 'map',
    title: map.title,
    ...(map.makers.length > 0 ? { author: map.makers.map((literal) => ({ literal })) } : {}),
    ...(year !== undefined ? { issued: { 'date-parts': [[year]] } } : {}),
    ...(map.place ? { 'publisher-place': map.place } : {}),
    ...(map.repository ? { publisher: map.repository } : {}),
    URL: map.url,
    accessed: { 'date-parts': [dateParts(accessed)!] },
  };
}

export function mapExports(map: CitableMap, accessed: string): MapExports {
  const item = mapCsl(map, accessed);
  const year = dateParts(map.date_published)?.[0];
  const key = `map-${slugOf(map.url)}`.replace(/[^A-Za-z0-9_-]/g, '');
  const bibtex = [
    `@misc{${key},`,
    `  title = {${bibtexEscape(map.title)}},`,
    ...(map.makers.length > 0 ? [`  author = {${map.makers.map((m) => `{${bibtexEscape(m)}}`).join(' and ')}},`] : []),
    ...(year !== undefined ? [`  year = {${year}},`] : []),
    ...(map.place ? [`  address = {${bibtexEscape(map.place)}},`] : []),
    ...(map.repository ? [`  publisher = {${bibtexEscape(map.repository)}},`] : []),
    `  url = {${map.url}},`,
    `  urldate = {${accessed}},`,
    '}',
  ];
  const ris = [
    'TY  - MAP',
    `TI  - ${map.title}`,
    ...map.makers.map((m) => `AU  - ${m}`),
    ...(year !== undefined ? [`PY  - ${year}`] : []),
    ...(map.place ? [`CY  - ${map.place}`] : []),
    ...(map.repository ? [`PB  - ${map.repository}`] : []),
    `UR  - ${map.url}`,
    `Y2  - ${accessed.replace(/-/g, '/')}`,
    'ER  - ',
  ];
  return {
    bibtex: `${bibtex.join('\n')}\n`,
    ris: `${ris.join('\r\n')}\r\n`,
    csljson: `${JSON.stringify(item, null, 2)}\n`,
    chicago: formatBibliographyItem(item),
  };
}
