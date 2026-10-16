import { isPublic } from './publication.js';
import { referenceFields } from './schemas/references.js';
import type { RegistryRecord } from './types.js';

/**
 * For each public target, the public entities that reference it ("Cited in", "Used by").
 * Only `published` and `released` referrers count (FR-007), so a held essay never appears on the
 * page of the map it cites, although its reference stays valid. Only public targets get an entry,
 * so the id of a held entity is not handed to a caller that forgets to filter. One pass over
 * declared references; a referrer is listed once, a self-reference is ignored, lists are sorted.
 */
export function reverseRelationships(records: readonly RegistryRecord[]): Map<string, string[]> {
  const publicIds = new Set(records.filter(isPublic).map((r) => r.id));
  const referrers = new Map<string, Set<string>>();
  for (const record of records) {
    if (!isPublic(record)) continue;
    for (const { id } of referenceFields(record)) {
      if (id === record.id || !publicIds.has(id)) continue;
      const set = referrers.get(id);
      if (set) set.add(record.id);
      else referrers.set(id, new Set([record.id]));
    }
  }
  const result = new Map<string, string[]>();
  for (const [id, set] of referrers) result.set(id, [...set].sort());
  return result;
}
