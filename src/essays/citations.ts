import { Cite, plugins } from '@citation-js/core';
import '@citation-js/plugin-csl';
import chicagoStyle from './csl/chicago-notes-bibliography.csl?raw';
import localeEnUs from './csl/locales-en-US.xml?raw';

/*
 * Citations at build time, offline, from CSL-JSON (spec 003 contracts/citations-and-exports.md,
 * research R2). Pure and framework-free: CSL-JSON and a locator go in, strings go out. Nothing here
 * ships to the browser. The style and the locale are the vendored, unmodified files in `csl/`.
 */

const TEMPLATE = 'chicago-notes-bibliography';
const csl = plugins.config.get('@csl') as {
  styles: { add(name: string, xml: string): void };
  locales: { add(code: string, xml: string): void };
};
csl.styles.add(TEMPLATE, chicagoStyle);
csl.locales.add('en-US', localeEnUs);

/** The CSL-JSON fields the essays use; any other CSL field passes through to the style untouched. */
export interface CslItem {
  id: string;
  type: string;
  title?: string;
  author?: { family?: string; given?: string; literal?: string }[];
  issued?: { 'date-parts': number[][] };
  [field: string]: unknown;
}

/** A locator on an Evidence record (ADR 0003 §4). */
export interface Locator {
  value?: string;
  state?: string;
  verified_by?: string;
  verified_on?: string;
  consulted_copy?: string;
}

export type Verification =
  | { state: 'verified'; label: string; by: string; on: string }
  | { state: 'pending'; label: string };

export class CitationError extends Error {}

/** Splits `p. 12` or `pp. 12–14` into a page label and the pages; anything else is passed to the style as it stands. */
export function parseLocator(value: string | undefined): { label: 'page' | undefined; locator: string | undefined } {
  if (value === undefined) return { label: undefined, locator: undefined };
  const page = /^pp?\.\s*(.+)$/.exec(value.trim());
  return page ? { label: 'page', locator: page[1]! } : { label: undefined, locator: value.trim() };
}

const present = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** `verified` only when a person and a date are recorded; anything less is shown as pending, in words (ADR 0003 §4). */
function verificationOf(locator: Locator): Verification {
  if (locator.state === 'verified' && present(locator.verified_by) && present(locator.verified_on)) {
    const by = locator.verified_by.trim();
    const on = locator.verified_on.trim();
    return { state: 'verified', by, on, label: `Verified by ${by} on ${on}` };
  }
  return { state: 'pending', label: 'Locator pending verification' };
}

/** The Chicago note for a source at a locator, and the verification state to show beside it. */
export function formatNote(item: CslItem, locator: Locator): { note: string; verification: Verification } {
  const { label, locator: where } = parseLocator(locator.value);
  const citationItem = where === undefined ? { id: item.id } : { id: item.id, locator: where, ...(label ? { label } : {}) };
  const note = new Cite([item]).format('citation', {
    format: 'text',
    template: TEMPLATE,
    lang: 'en-US',
    // a note style needs a note position to print the full form
    entry: { citationItems: [citationItem], properties: { noteIndex: 1 } },
  } as never) as string;
  return { note: note.trim(), verification: verificationOf(locator) };
}

/** The Chicago bibliography entry for a source. */
export function formatBibliographyItem(item: CslItem): string {
  const text = new Cite([item]).format('bibliography', { format: 'text', template: TEMPLATE, lang: 'en-US' }) as string;
  return text.trim();
}

/**
 * The CSL-JSON a bibliography entry points to, as an item carrying the entry's id. `read` gives the
 * file's text or null; an entry with no usable file is a clear error naming the entry, never a
 * silent gap in the bibliography.
 */
export function cslItemFor(entry: { id: string; csl?: string }, read: (path: string) => string | null): CslItem {
  if (!present(entry.csl)) throw new CitationError(`bibliography entry ${entry.id} has no CSL file`);
  const text = read(entry.csl);
  if (text === null) throw new CitationError(`bibliography entry ${entry.id}: cannot read its CSL file ${entry.csl}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CitationError(`bibliography entry ${entry.id}: ${entry.csl} is not valid CSL-JSON (it does not parse)`);
  }
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (item === null || typeof item !== 'object' || !present((item as { type?: unknown }).type)) {
    throw new CitationError(`bibliography entry ${entry.id}: ${entry.csl} is not valid CSL-JSON (an item needs a type)`);
  }
  return { ...(item as CslItem), id: entry.id };
}
