import type { Vocabulary } from '../../registry/vocab-map.js';
import { Collector, ImportError, idOf, text, type Row } from '../context.js';
import type { EntryBook } from '../entries.js';
import { mapSpecialistTerm } from '../vocab.js';
import { base, defined } from './common.js';

/** The CSV columns the places adapter reads; the rest are set aside by name and count. */
const PLACE_MAPPED = new Set(['place_id', 'reference_name', 'place_type', 'location_status', 'ref_lon', 'ref_lat', 'ref_geometry_provenance', 'pleiades_id', 'whg_id', 'review_state', 'normalization_method', 'reviewer', 'review_date']);
const SOURCE_MAPPED = new Set(['source_id', 'short_title', 'title', 'creator', 'source_family', 'witness', 'edition_state', 'repository', 'repository_object_id', 'citation', 'scope', 'review_state', 'normalization_method', 'reviewer', 'review_date']);

const num = (value: string | undefined): number | undefined => (value !== undefined && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined);
const str = (row: Row, key: string): string | undefined => text(row, key);

/**
 * The CND places the anchor needs (the pilot places). The geometry provenance term is checked against
 * the vocabulary and an unmapped one fails the import (FR-016); the place keeps the term as written, beside
 * `vocabulary: cnd`, and the rules read its shared meaning (TC-D016).
 */
export function importDaciaPlaces(rows: Row[], pilot: ReadonlySet<string>, vocabulary: Vocabulary, out: Collector): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const local = str(row, 'place_id');
    if (!local) throw new ImportError('a row of places.csv has no place_id');
    if (!pilot.has(local)) continue;
    const name = str(row, 'reference_name');
    if (!name) throw new ImportError(`the CND place ${local} has no reference_name`);
    const provenance = str(row, 'ref_geometry_provenance');
    if (provenance) mapSpecialistTerm(vocabulary, 'geometry_provenance', provenance, idOf('place', local));
    const lon = num(row.ref_lon as string | undefined);
    const lat = num(row.ref_lat as string | undefined);
    const pleiades = str(row, 'pleiades_id');
    const whg = str(row, 'whg_id');
    out.record(
      defined({
        ...base('place', idOf('place', local), local, name),
        place_type: str(row, 'place_type'),
        location_status: str(row, 'location_status'),
        names: [{ name, language: 'und', kind: 'modern' }],
        location: lon !== undefined && lat !== undefined ? { lon, lat } : undefined,
        vocabulary: provenance ? vocabulary.name : undefined,
        geometry_provenance: provenance,
        same_as: pleiades || whg ? [...(pleiades ? [{ authority: 'pleiades', id: pleiades }] : []), ...(whg ? [{ authority: 'whg', id: whg }] : [])] : undefined,
        legacy_review_state: str(row, 'review_state'),
        legacy_normalization_method: str(row, 'normalization_method'),
        legacy_reviewer: str(row, 'reviewer'),
        legacy_review_date: str(row, 'review_date'),
      }),
    );
    ids.add(local);
    out.rest('cnd-places', row, PLACE_MAPPED);
  }
  return ids;
}

/** The CND sources of Trench A: a Source that keeps its id and points at a minted entry. */
export function importDaciaSources(rows: Row[], book: EntryBook, out: Collector): void {
  for (const row of rows) {
    const local = str(row, 'source_id');
    if (!local) throw new ImportError('a row of sources.csv has no source_id');
    if (!str(row, 'trench_a_stela')) continue;
    const title = str(row, 'title') ?? str(row, 'short_title');
    if (!title) throw new ImportError(`the CND source ${local} has no title`);
    const from = num(row.year_from as string | undefined);
    const citation = str(row, 'citation') ?? title;
    const entry = book.resolve({ citation, title, author: str(row, 'creator'), year: from, note: citation }, out);
    out.record(
      defined({
        ...base('source', idOf('source', local), local, title),
        is_finding_aid: false,
        source_kind: str(row, 'source_family'),
        entry,
        legacy_review_state: str(row, 'review_state'),
        legacy_normalization_method: str(row, 'normalization_method'),
        legacy_reviewer: str(row, 'reviewer'),
        legacy_review_date: str(row, 'review_date'),
      }),
    );
    out.rest('cnd-sources', row, SOURCE_MAPPED);
  }
}
