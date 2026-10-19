import type { RegistryRecord } from '../../../src/registry/types.js';
import { isPublic } from '../../../src/registry/publication.js';
import { list } from '../../../src/registry/values.js';

/** A citation by a public essay that does not end at a public entry page. */
export interface Unresolved {
  essay: string;
  entry: string | null;
  route: 'listed' | 'evidence';
  why: string;
}

/**
 * Every citation a public essay makes, by either route, that does not reach an entry with a page
 * (spec 006 SC-001). Judged on the registry's own records, not the projection, because the
 * projection drops what is held and would hide the very thing this looks for. `hasPage` says
 * whether an entry id has a page.
 */
export function unresolvedCitations(records: readonly RegistryRecord[], hasPage: (entryId: string) => boolean): Unresolved[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const out: Unresolved[] = [];
  for (const essay of records.filter((r) => r.family === 'essay' && isPublic(r))) {
    for (const id of list(essay.bibliography)) {
      if (byId.get(id)?.family !== 'bibliography_entry') out.push({ essay: essay.id, entry: id, route: 'listed', why: 'it is not an entry' });
      else if (!hasPage(id)) out.push({ essay: essay.id, entry: id, route: 'listed', why: 'the entry has no page' });
    }
    for (const evidenceId of list(essay.evidence)) {
      const evidence = byId.get(evidenceId);
      const source = typeof evidence?.source === 'string' ? byId.get(evidence.source) : undefined;
      const entry = typeof source?.entry === 'string' ? byId.get(source.entry) : undefined;
      if (!source || source.is_finding_aid === true) continue; // a finding aid is never evidence: REF-FINDING-AID, not a citation
      if (!entry) out.push({ essay: essay.id, entry: null, route: 'evidence', why: 'the evidence rests on a source with no entry' });
      else if (!hasPage(entry.id)) out.push({ essay: essay.id, entry: entry.id, route: 'evidence', why: 'the entry has no page' });
    }
  }
  return out;
}
