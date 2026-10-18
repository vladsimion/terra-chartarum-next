import type { EssayBody } from '../registry/essay-body.js';
import type { PublicRecord } from '../registry/project.js';
import { groupBibliography, type BibliographyGroup } from './bibliography.js';
import { CitationError, formatBibliographyItem, formatNote, type CslItem, type Locator, type Verification } from './citations.js';
import { figureFor, literalCopies, type Figure } from './figure.js';
import { relatedEssays, roomLinks, type RelatedEssay, type RoomLink } from './related.js';

/*
 * Everything an essay page shows, decided from the public records and the scan of the body, before
 * any component runs (spec 003 US1). Pure: the components only print it. It reads public records
 * only, so a held map, source or essay cannot reach a page through it.
 */

export interface NoteDetail {
  evidence: string;
  /** Chicago note text. */
  note: string;
  sourceTitle: string;
  locator: string | null;
  consultedCopy: string | null;
  verification: Verification;
}

/** What an interaction shows above itself: the declared question and expected interpretation, with its evidence (FR-007). */
export interface InteractionDetail {
  id: string;
  component: string;
  question: string;
  interpretation: string;
  evidence: NoteDetail[];
}

export interface EssayPageModel {
  essay: PublicRecord;
  /** A figure for each map the body shows, by map id. */
  figures: ReadonlyMap<string, Figure>;
  /** The claim citations in the order they first appear in the body; a note's number is its index plus one. */
  notes: readonly NoteDetail[];
  /** The note for any public evidence record: what a citation shows, and what a stand-alone panel shows. */
  detail(evidence: string): NoteDetail;
  noteNumber(evidence: string): number | undefined;
  /** The declaration of an interaction the body uses, by its id in the record's `interactions[]`. */
  interaction(id: string): InteractionDetail;
  bibliography: BibliographyGroup[];
  rooms: RoomLink[];
  related: RelatedEssay[];
}

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

export function buildEssayPage(input: {
  essay: PublicRecord;
  records: readonly PublicRecord[];
  body: EssayBody;
  /** The CSL-JSON item of a bibliography entry, by entry id. */
  cslFor(entryId: string): CslItem;
}): EssayPageModel {
  const { essay, records, body, cslFor } = input;
  const byId = new Map(records.map((r) => [r.id, r]));
  const fail = (message: string): never => {
    throw new CitationError(`essay ${essay.id}: ${message}`);
  };

  const figures = new Map<string, Figure>();
  const figureRecords: { id: string; title: string; caption: string }[] = [];
  for (const tag of body.tags) {
    if (tag.tag !== 'MapFigure') continue;
    const id = tag.props.map ?? '';
    if (figures.has(id)) continue;
    const map = byId.get(id);
    if (!map || map.family !== 'map') return fail(`<MapFigure> names ${id || '(nothing)'}, which is not a public map`);
    const makers = list(map.makers).map((m) => str(byId.get(m)?.title)).filter((t): t is string => t !== null);
    const rights = map.rights as { licence?: string; attribution?: string } | undefined;
    const figure = figureFor({ id, title: String(map.title), slug: String(map.slug), makers, rights });
    figures.set(id, figure);
    figureRecords.push({ id, title: figure.title, caption: figure.caption });
  }
  const copies = literalCopies(body.text, figureRecords);
  if (copies.length > 0) {
    return fail(`the body types text that belongs to a map record instead of taking it from the figure: ${copies.map((c) => `"${c.copied}" (${c.id})`).join(', ')}`);
  }

  const detailOf = (evidenceId: string): NoteDetail => {
    const evidence = byId.get(evidenceId);
    if (!evidence || evidence.family !== 'evidence') return fail(`a citation names ${evidenceId || '(nothing)'}, which is not public evidence`);
    const source = byId.get(String(evidence.source));
    if (!source || source.family !== 'source') return fail(`evidence ${evidenceId} has no public source`);
    const entryId = str(source.entry);
    if (entryId === null) return fail(`source ${source.id} (cited by ${evidenceId}) has no public bibliography entry`);
    const locator = (evidence.locator ?? {}) as Locator;
    const { note, verification } = formatNote(cslFor(entryId), locator);
    return {
      evidence: evidenceId,
      note,
      sourceTitle: String(source.title),
      locator: str(locator.value),
      consultedCopy: str(locator.consulted_copy),
      verification,
    };
  };

  const order: string[] = [];
  for (const tag of body.tags) {
    if (tag.tag !== 'Cite') continue;
    const id = tag.props.evidence ?? '';
    if (!order.includes(id)) order.push(id);
  }
  const notes = order.map(detailOf);

  const declarations = (Array.isArray(essay.interactions) ? essay.interactions : []) as Record<string, unknown>[];
  const interactions = new Map<string, InteractionDetail>();
  for (const tag of body.tags) {
    if (tag.tag !== 'Interaction') continue;
    const id = tag.props.id ?? '';
    if (interactions.has(id)) continue;
    const declared = declarations.find((d) => d.id === id);
    if (!declared) return fail(`<Interaction> names ${id || '(nothing)'}, which is not declared in the record's interactions`);
    for (const evidenceId of list(declared.evidence)) {
      if (byId.get(evidenceId)?.family !== 'evidence') return fail(`interaction ${id} declares ${evidenceId}, which is not public evidence`);
    }
    interactions.set(id, {
      id,
      component: String(declared.component),
      question: String(declared.question),
      interpretation: String(declared.interpretation),
      evidence: list(declared.evidence).map(detailOf),
    });
  }

  const entries = list(essay.bibliography).map((id) => {
    const entry = byId.get(id);
    if (!entry || entry.family !== 'bibliography_entry') return fail(`bibliography names ${id}, which is not a public bibliography entry`);
    return { id, section: String(entry.section), text: formatBibliographyItem(cslFor(id)) };
  });

  const rooms = records.filter((r) => r.family === 'room').map((r) => ({ id: r.id, title: String(r.title), slug: String(r.slug) }));

  return {
    essay,
    figures,
    notes,
    detail: detailOf,
    interaction: (id) => interactions.get(id) ?? fail(`<Interaction> names ${id || '(nothing)'}, which this page did not declare`),
    noteNumber: (evidence) => (order.includes(evidence) ? order.indexOf(evidence) + 1 : undefined),
    bibliography: groupBibliography(entries),
    rooms: roomLinks(essay.rooms as { primary?: string; secondary?: string[] } | undefined, rooms),
    related: relatedEssays(list(essay.relations), records as { id: string; family: string; title: string; slug: string }[], essay.id),
  };
}
