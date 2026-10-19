import { publicEntryIds } from '../registry/citations.js';
import type { PublicRecord } from '../registry/project.js';

/*
 * Which bibliography entries are public (spec 006 FR-007, ADR 0014): published and released, and
 * cited by at least one public record, by either route. The projection already drops what is held,
 * so `records` are what the site sees; an entry reached only through a held Source, held Evidence or
 * a held record is simply not cited here. An entry with no section is not public (a warning from
 * `ready_for_build` tells the editor). The rule itself lives in the registry (`citations.ts`), where
 * the registry's own build uses it too. Pure: public records in, public entries out.
 */
export function publicEntries(records: readonly PublicRecord[]): PublicRecord[] {
  const ids = publicEntryIds(records);
  return records.filter((r) => ids.has(r.id));
}
