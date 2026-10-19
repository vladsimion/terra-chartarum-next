import type { PublicRecord } from '../registry/project.js';
import { list } from '../registry/values.js';
import { verificationOf, type Locator, type Verification } from '../essays/citations.js';

/*
 * Where each bibliography entry is cited (spec 006 FR-002, ADR 0014): nothing is stored, it is all
 * derived, by two routes, from public records only (a held record is not in the projection, so it
 * cannot appear here). Pure: public records in, plain data out.
 *
 *   listed    a public record's `bibliography[]`: essay, map, cartographer, dataset, layer
 *   evidence  a public essay's `evidence[]` -> Evidence -> Source (not a finding aid) -> `entry`
 */
export type Route = 'listed' | 'evidence';

export interface Citation {
  entry: string;
  route: Route;
  citing: {
    family: string;
    slug: string;
    title: string;
    /** For a dataset, which has no page: the public layers that use it. */
    layers?: { slug: string; title: string }[];
  };
  /** On the evidence route: the locator as recorded, and what it says about verification. */
  locator?: { value: string; state: string };
  verification?: Verification;
}

/** The families whose `bibliography[]` lists entries (FR-003). */
const LISTING_FAMILIES = ['essay', 'map', 'cartographer', 'dataset', 'layer'];

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const byTitle = (a: { title: string; slug: string }, b: { title: string; slug: string }): number => a.title.localeCompare(b.title, 'en') || a.slug.localeCompare(b.slug, 'en');

/** Every citation, grouped by the entry it is for, each group sorted by the citing record's title. */
export function citationIndex(records: readonly PublicRecord[]): Map<string, Citation[]> {
  const byId = new Map(records.map((r) => [r.id, r]));
  const index = new Map<string, Citation[]>();
  const add = (citation: Citation) => index.set(citation.entry, [...(index.get(citation.entry) ?? []), citation]);

  const layersOf = (dataset: PublicRecord) =>
    records
      .filter((r) => r.family === 'layer' && r.dataset === dataset.id)
      .map((r) => ({ slug: text(r.slug), title: text(r.title) }))
      .sort(byTitle);

  for (const record of records) {
    if (!LISTING_FAMILIES.includes(record.family)) continue;
    const citing = { family: record.family, slug: text(record.slug), title: text(record.title), ...(record.family === 'dataset' ? { layers: layersOf(record) } : {}) };
    for (const entryId of new Set(list(record.bibliography))) {
      if (byId.get(entryId)?.family === 'bibliography_entry') add({ entry: entryId, route: 'listed', citing });
    }
  }

  for (const essay of records.filter((r) => r.family === 'essay')) {
    const citing = { family: 'essay', slug: text(essay.slug), title: text(essay.title) };
    for (const evidenceId of list(essay.evidence)) {
      const evidence = byId.get(evidenceId);
      const source = typeof evidence?.source === 'string' ? byId.get(evidence.source) : undefined;
      // a finding aid is never evidence; a source with no public entry says nothing public
      if (!evidence || evidence.family !== 'evidence' || !source || source.is_finding_aid === true) continue;
      const entry = typeof source.entry === 'string' ? byId.get(source.entry) : undefined;
      if (entry?.family !== 'bibliography_entry') continue;
      const locator = (evidence.locator ?? {}) as Locator;
      add({
        entry: entry.id,
        route: 'evidence',
        citing,
        locator: { value: text(locator.value), state: text(locator.state) },
        verification: verificationOf(locator),
      });
    }
  }

  for (const [entry, citations] of index) {
    index.set(entry, citations.sort((a, b) => byTitle(a.citing, b.citing) || (a.locator?.value ?? '').localeCompare(b.locator?.value ?? '', 'en')));
  }
  return index;
}

/** The citations of one entry. For many entries build `citationIndex` once. */
export function citationsOf(entryId: string, records: readonly PublicRecord[]): Citation[] {
  return citationIndex(records).get(entryId) ?? [];
}

export type EditionRelation = 'edition_of' | 'translation_of' | 'has_edition' | 'has_translation';

export interface EditionLink {
  relation: EditionRelation;
  entry: { id: string; slug: string; title: string };
}

const RELATION_ORDER: EditionRelation[] = ['edition_of', 'translation_of', 'has_edition', 'has_translation'];

/**
 * The other editions and translations of an entry, in either direction. `publicEntries` are the
 * candidates: a link to an entry with no page would lead nowhere, so only public ones are returned.
 */
export function editionsOf(entryId: string, publicEntries: readonly PublicRecord[]): EditionLink[] {
  const byId = new Map(publicEntries.map((e) => [e.id, e]));
  const self = byId.get(entryId);
  const link = (relation: EditionRelation, other: PublicRecord | undefined): EditionLink[] =>
    other && other.id !== entryId ? [{ relation, entry: { id: other.id, slug: text(other.slug), title: text(other.title) } }] : [];
  const out: EditionLink[] = [
    ...link('edition_of', byId.get(text(self?.edition_of))),
    ...link('translation_of', byId.get(text(self?.translation_of))),
    ...publicEntries.flatMap((e) => (e.edition_of === entryId ? link('has_edition', e) : [])),
    ...publicEntries.flatMap((e) => (e.translation_of === entryId ? link('has_translation', e) : [])),
  ];
  return out.sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) || byTitle(a.entry, b.entry));
}

/**
 * Is the entry a finding aid (FR-015)? True when any public Source that points at it is flagged
 * `is_finding_aid`. A held Source is not in the public records, so it cannot decide this; the
 * flag has to be on a published Source for the badge to show.
 */
export function isFindingAid(entryId: string, records: readonly PublicRecord[]): boolean {
  return records.some((r) => r.family === 'source' && r.entry === entryId && r.is_finding_aid === true);
}
