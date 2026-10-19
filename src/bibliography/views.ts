import { formatBibliographyItem, type CslItem } from '../essays/citations.js';
import { layerAddress } from './addresses.js';
import type { PublicRecord } from '../registry/project.js';
import { BIBLIOGRAPHY_SECTIONS, BIBLIOGRAPHY_SECTION_LABELS, type BibliographySection } from '../registry/schemas/bibliography-section.js';
import { PAGE_ROUTES } from '../registry/routes.js';
import { citationIndex, editionsOf, isFindingAid, type Citation, type EditionRelation } from './cited-in.js';
import { publicEntries } from './entry-public.js';
import { buildIndex, type IndexEntry } from './index-data.js';

/*
 * What the Bibliography pages show (spec 006 contracts/bibliography-pages.md): plain view models
 * made from the public records and the entries' CSL items, so the pages hold no logic and nothing
 * about an entry is typed in a template. The Chicago form comes from spec 003's generator.
 */
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const address = (slug: string) => `/bibliography/${slug}/`;

export interface IndexItem {
  slug: string;
  href: string;
  /** The entry as the Chicago bibliography form. */
  chicago: string;
  section: string;
  essays: string[];
}

export interface IndexSection {
  section: BibliographySection;
  label: string;
  items: IndexItem[];
}

export interface IndexView {
  sections: IndexSection[];
  /** The essays that cite at least one public entry, for the filter. */
  essays: { slug: string; title: string }[];
  total: number;
}

export function indexView(records: readonly PublicRecord[], cslFor: (entryId: string) => CslItem): IndexView {
  const entries = publicEntries(records);
  const byId = new Map(entries.map((e) => [text(e.slug), e]));
  const index: IndexEntry[] = buildIndex(records, cslFor);
  const items = index.map((e): IndexItem => ({ slug: e.slug, href: address(e.slug), chicago: formatBibliographyItem(cslFor(byId.get(e.slug)!.id)), section: e.section, essays: e.essays }));
  const essayTitles = new Map(records.filter((r) => r.family === 'essay').map((r) => [text(r.slug), text(r.title)]));
  return {
    sections: BIBLIOGRAPHY_SECTIONS.map((section) => ({ section, label: BIBLIOGRAPHY_SECTION_LABELS[section], items: items.filter((i) => i.section === section) })).filter((s) => s.items.length > 0),
    essays: [...new Set(index.flatMap((e) => e.essays))].map((slug) => ({ slug, title: essayTitles.get(slug) ?? slug })).sort((a, b) => a.title.localeCompare(b.title, 'en')),
    total: items.length,
  };
}

export interface Identifier {
  /** The CSL field it came from: `DOI`, `ISBN`, `URL`, `call-number`, `archive_location`. */
  kind: string;
  label: string;
  value: string;
  href: string | null;
}

/** The identifiers of the CSL-JSON a reader may use to find the work. */
export function identifiersOf(item: CslItem): Identifier[] {
  const found: Identifier[] = [];
  const add = (kind: string, label: string, href: (v: string) => string | null) => {
    const value = item[kind];
    if (typeof value === 'string' && value.trim() !== '') found.push({ kind, label, value: value.trim(), href: href(value.trim()) });
  };
  add('DOI', 'DOI', (v) => `https://doi.org/${v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`);
  add('ISBN', 'ISBN', () => null);
  add('URL', 'Web address', (v) => (/^https:\/\//i.test(v) ? v : null));
  add('call-number', 'Call number', () => null);
  add('archive_location', 'Catalogue reference', () => null);
  return found;
}

const RELATION_LABELS: Record<EditionRelation, string> = {
  edition_of: 'Edition of',
  translation_of: 'Translation of',
  has_edition: 'Edition',
  has_translation: 'Translation',
};

export interface CitedItem {
  title: string;
  /** Where the citing record is; null for a record with no page (a dataset). */
  href: string | null;
  /** What kind of record cites it, in words. */
  kind: string;
  /** A dataset's public layers, which do have an address. */
  layers: { title: string; href: string }[];
  locator: { value: string; state: string } | null;
  verification: { state: 'verified' | 'pending'; label: string } | null;
}

export interface EntryView {
  slug: string;
  title: string;
  chicago: string;
  sectionLabel: string;
  /** A guide to a collection, not itself evidence (FR-015). */
  findingAid: boolean;
  identifiers: Identifier[];
  digitalCopy: string | null;
  editions: { relation: EditionRelation; label: string; title: string; href: string }[];
  evidence: CitedItem[];
  listed: CitedItem[];
}

const KIND: Record<string, string> = { essay: 'Essay', map: 'Map', cartographer: 'Cartographer', dataset: 'Dataset', layer: 'Layer' };

export function entryView(entry: PublicRecord, records: readonly PublicRecord[], cslFor: (entryId: string) => CslItem, citations = citationIndex(records)): EntryView {
  const item = cslFor(entry.id);
  const layerAt = layerAddress(records);
  const open = (c: Citation['citing']): string | null => {
    if (c.family === 'dataset') return null;
    // a layer has no page: it opens in the Atlas with the layer on the map
    if (c.family === 'layer') return layerAt(c.slug);
    return `/${PAGE_ROUTES[c.family] ?? c.family}/${c.slug}/`;
  };
  const cited = (c: Citation): CitedItem => ({
    title: c.citing.title,
    href: open(c.citing),
    kind: KIND[c.citing.family] ?? c.citing.family,
    layers: (c.citing.layers ?? []).map((l) => ({ title: l.title, href: layerAt(l.slug) })),
    locator: c.locator ?? null,
    verification: c.verification ? { state: c.verification.state, label: c.verification.label } : null,
  });
  const mine = citations.get(entry.id) ?? [];
  const section = BIBLIOGRAPHY_SECTION_LABELS[text(entry.section) as BibliographySection] ?? text(entry.section);
  return {
    slug: text(entry.slug),
    title: typeof item.title === 'string' && item.title !== '' ? item.title : text(entry.title),
    chicago: formatBibliographyItem(item),
    sectionLabel: section,
    findingAid: isFindingAid(entry.id, records),
    identifiers: identifiersOf(item),
    digitalCopy: typeof entry.digital_copy === 'string' ? entry.digital_copy : null,
    editions: editionsOf(entry.id, publicEntries(records)).map((e) => ({ relation: e.relation, label: RELATION_LABELS[e.relation], title: e.entry.title, href: address(e.entry.slug) })),
    evidence: mine.filter((c) => c.route === 'evidence').map(cited),
    listed: mine.filter((c) => c.route === 'listed').map(cited),
  };
}
