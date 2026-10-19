import type { PublicRecord } from '../registry/project.js';
import { BIBLIOGRAPHY_SECTIONS } from '../registry/schemas/bibliography-section.js';
import { citationIndex } from './cited-in.js';

/*
 * Which bibliography entries are public (spec 006 FR-007, ADR 0014): published and released, and
 * cited by at least one public record, by either route. The projection already drops what is held,
 * so `records` are what the site sees; an entry reached only through a held Source, held Evidence or
 * a held record is simply not cited here. An entry with no section is not public (a warning from
 * `ready_for_build` tells the editor). Pure: public records in, public entries out.
 */
export function publicEntries(records: readonly PublicRecord[]): PublicRecord[] {
  const cited = citationIndex(records);
  return records.filter(
    (r) => r.family === 'bibliography_entry' && (BIBLIOGRAPHY_SECTIONS as readonly string[]).includes(String(r.section)) && (cited.get(r.id)?.length ?? 0) > 0,
  );
}
