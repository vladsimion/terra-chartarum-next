import type { PublicRecord } from './project.js';
import { BIBLIOGRAPHY_SECTIONS } from './schemas/bibliography-section.js';
import { list } from './values.js';

/*
 * Who cites a bibliography entry, and so which entries are public (spec 006 FR-002, FR-007, ADR
 * 0014). Nothing is stored: it is derived from public records, by two routes. This lives in the
 * registry, with no citation library in it, because the registry's own build needs the answer too
 * (`data/relations.json` must not name an entry the site does not list) and the bibliography's pure
 * modules build on it. Public records in, plain data out: a held record is not in the projection,
 * so it cannot cite anything here.
 *
 *   listed    a public record's `bibliography[]`: essay, map, cartographer, dataset, layer, person
 *   evidence  a public essay's `evidence[]` -> Evidence -> Source (not a finding aid) -> `entry`
 *
 * And one route that is not a citation (ADR 0014 as amended 2026-11-22, spec 012 FR-014): an
 * edition that says where it was made or kept is a record of its own, public when published and
 * released. Its place roles, as projected, name only public places, so a role on a held place does
 * not count.
 */
/** The families whose `bibliography[]` lists entries (FR-003). */
export const LISTING_FAMILIES = ['essay', 'map', 'cartographer', 'dataset', 'layer', 'person'];

export interface ListedCitation {
  entry: string;
  citing: PublicRecord;
}

export interface EvidenceCitation {
  entry: string;
  essay: PublicRecord;
  evidence: PublicRecord;
}

/** The entries each public record lists, once per record. */
export function listedCitations(records: readonly PublicRecord[]): ListedCitation[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  return records
    .filter((r) => LISTING_FAMILIES.includes(r.family))
    .flatMap((citing) => [...new Set(list(citing.bibliography))].filter((id) => byId.get(id)?.family === 'bibliography_entry').map((entry) => ({ entry, citing })));
}

/** The entries public essays rest an argument on: one citation per piece of evidence. A finding aid is never evidence. */
export function evidenceCitations(records: readonly PublicRecord[]): EvidenceCitation[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const out: EvidenceCitation[] = [];
  for (const essay of records.filter((r) => r.family === 'essay')) {
    for (const evidenceId of list(essay.evidence)) {
      const evidence = byId.get(evidenceId);
      const source = typeof evidence?.source === 'string' ? byId.get(evidence.source) : undefined;
      if (!evidence || evidence.family !== 'evidence' || !source || source.is_finding_aid === true) continue;
      const entry = typeof source.entry === 'string' ? byId.get(source.entry) : undefined;
      if (entry?.family === 'bibliography_entry') out.push({ entry: entry.id, essay, evidence });
    }
  }
  return out;
}

/** True when a public entry carries at least one place role (projected, so on a public place). */
export function hasPlaceRoles(record: PublicRecord): boolean {
  return Array.isArray(record.place_roles) && record.place_roles.length > 0;
}

/** The ids of the public entries: in a section, and cited by a public record by either route, or an edition with place roles. */
export function publicEntryIds(records: readonly PublicRecord[]): Set<string> {
  const cited = new Set([...listedCitations(records), ...evidenceCitations(records)].map((c) => c.entry));
  return new Set(
    records
      .filter((r) => r.family === 'bibliography_entry' && (BIBLIOGRAPHY_SECTIONS as readonly string[]).includes(String(r.section)) && (cited.has(r.id) || hasPlaceRoles(r)))
      .map((r) => r.id),
  );
}
