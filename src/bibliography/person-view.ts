import type { CslItem } from '../essays/citations.js';
import type { PublicRecord } from '../registry/project.js';
import { publicEntryIds } from '../registry/citations.js';
import { parseDate } from '../registry/dates.js';
import { restsOnPending } from './places-view.js';

/*
 * A person's page (spec 012 contracts/pages.md "Person"; ADR 0023): names, life dates, and the
 * public editions that name the person, in date order, each with its production place and date. A
 * printer's movement is read from this list; no path is drawn (FR-009). Derived from `people[]` on
 * the public editions, never stored. Pure: public records in, plain strings out.
 */
export interface PersonEdition {
  title: string;
  href: string;
  /** The production place's title, or null when none is recorded. */
  place: string | null;
  /** The date as written: the production role's, else the CSL year. Null when neither is known. */
  date: string | null;
  role: string;
  basis: string;
  confidence: string;
  /** The link rests on pending locators only (FR-011). */
  pending: boolean;
}

export interface PersonView {
  name: string;
  names: { name: string; language: string; kind: string }[];
  lifeDates: string | null;
  editions: PersonEdition[];
}

const BASIS: Record<string, string> = { stated: 'stated in the book', attributed: 'attributed by scholarship' };
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const objects = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((i): i is Record<string, unknown> => i !== null && typeof i === 'object') : [];

/** The earliest moment a date can mean, for ordering; unknown dates go last. */
const sortKey = (date: string | null): number => {
  const parsed = date ? parseDate(date) : null;
  return parsed && Number.isFinite(parsed.earliest) ? parsed.earliest : Number.POSITIVE_INFINITY;
};

/** The CSL year of an item, as text, or null. */
function cslYear(item: CslItem): string | null {
  const parts = (item.issued as { 'date-parts'?: unknown[][] } | undefined)?.['date-parts']?.[0];
  const year = parts?.[0];
  return typeof year === 'number' ? String(year).padStart(4, '0') : null;
}

export function personView(person: PublicRecord, records: readonly PublicRecord[], cslFor: (id: string) => CslItem): PersonView {
  const byId = new Map(records.map((r) => [r.id, r]));
  const publicEditions = publicEntryIds(records);
  const editions: PersonEdition[] = [];
  for (const edition of records.filter((r) => r.family === 'bibliography_entry' && publicEditions.has(r.id))) {
    for (const link of objects(edition.people).filter((l) => l.person === person.id)) {
      const produced = objects(edition.place_roles).find((r) => r.role === 'produced_at');
      const item = cslFor(edition.id);
      editions.push({
        title: text(item.title) ?? text(edition.title) ?? edition.id,
        href: `/bibliography/${String(edition.slug)}/`,
        place: produced ? (text(byId.get(String(produced.place))?.title) ?? null) : null,
        date: text(produced?.valid_from) ?? cslYear(item),
        role: String(link.role),
        basis: BASIS[String(link.basis)] ?? String(link.basis),
        confidence: String(link.confidence),
        pending: restsOnPending(link.evidence, byId),
      });
    }
  }
  editions.sort((a, b) => sortKey(a.date) - sortKey(b.date) || a.title.localeCompare(b.title));
  return {
    name: text(person.title) ?? person.id,
    names: objects(person.names).map((n) => ({ name: String(n.name ?? ''), language: String(n.language ?? ''), kind: String(n.kind ?? '') })),
    lifeDates: text(person.life_dates),
    editions,
  };
}

/** The printers an edition names, said in words, each linked to their page. */
export interface Printer {
  name: string;
  href: string;
  basis: string;
  confidence: string;
  pending: boolean;
}

export function printersOf(edition: PublicRecord, records: readonly PublicRecord[]): Printer[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  return objects(edition.people)
    .filter((l) => l.role === 'printer')
    .flatMap((l) => {
      const person = byId.get(String(l.person));
      if (!person || person.family !== 'person') return [];
      return [{ name: text(person.title) ?? person.id, href: `/people/${String(person.slug)}/`, basis: BASIS[String(l.basis)] ?? String(l.basis), confidence: String(l.confidence), pending: restsOnPending(l.evidence, byId) }];
    });
}
