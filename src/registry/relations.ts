import { isFamily, parseRef, qualifiedIdOf as qualifiedId, qualify } from './ids.ts';
import { referenceSites } from './integrity.ts';
import type { LoadedRecord } from './load.ts';
import { applyMappings, type VocabMappings } from './mappings.ts';
import { isReleased } from './public.ts';

export interface Relation {
  /** Essays that reference the entity. */
  cited_in: string[];
  /** Every other entity that references it (layers, maps, collections, …). */
  used_by: string[];
}

/** Qualified ID → its reverse relations (contracts/relations-and-cli.md). */
export type RelationsIndex = Record<string, Relation>;

export interface RelationsOptions {
  /** Public view: only released entities appear, as keys or as values. */
  releasedOnly: boolean;
  /** Specialist vocabulary mappings, so a mapped lifecycle term decides release. */
  vocabMappings?: VocabMappings;
}

/**
 * Derive "Cited in" and "Used by" for every entity from the references other
 * records declare (spec 001 FR-007, US4). Pure and deterministic.
 */
export function buildRelations(loaded: readonly LoadedRecord[], options: RelationsOptions): RelationsIndex {
  const records = loaded.map(({ file, record }) => ({ file, record: applyMappings(record, options.vocabMappings) }));
  const index: RelationsIndex = {};
  for (const { record } of records) {
    const id = qualifiedId(record);
    if (id === undefined) continue;
    if (options.releasedOnly && !isReleased(record)) continue;
    index[id] = { cited_in: [], used_by: [] };
  }

  for (const { record } of records) {
    const source = qualifiedId(record);
    const family = record['family'];
    if (source === undefined || typeof family !== 'string' || !isFamily(family)) continue;
    if (options.releasedOnly && !isReleased(record)) continue;

    for (const site of referenceSites(family, record)) {
      // Supersession is lineage, not use: the successor's page links back through its tombstone instead.
      if (site.field === 'superseded_by' || typeof site.value !== 'string') continue;
      const ref = parseRef(site.value);
      if (ref === undefined) continue;
      const target = index[qualify(ref.authority, ref.family, ref.id)];
      if (target === undefined) continue;
      const list = family === 'essay' ? target.cited_in : target.used_by;
      if (!list.includes(source)) list.push(source);
    }
  }

  for (const relation of Object.values(index)) {
    relation.cited_in.sort();
    relation.used_by.sort();
  }
  return index;
}
