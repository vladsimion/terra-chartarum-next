import type { RegistryRecord } from '../types.js';

export interface RefField {
  /** Field path, with the index for list fields: `maps[0]`. */
  field: string;
  /** The referenced entity id. */
  id: string;
}

/*
 * Reference fields per family, from data-model.md "Reference fields". `provenance_chain[]` points
 * at provenance steps, not entities, and is checked separately.
 */
const SCALARS: Record<string, string[]> = {
  '*': ['superseded_by'],
  evidence: ['source'],
  attestation: ['place', 'source'],
  layer: ['dataset'],
};

const LISTS: Record<string, string[]> = {
  '*': ['relations'],
  collection: ['members', 'default_layers'],
  map: ['makers'],
  essay: ['evidence', 'maps', 'places', 'sources'],
};

/** Every entity reference a record declares, in a stable order. */
export function referenceFields(record: RegistryRecord): RefField[] {
  const refs: RefField[] = [];
  const listFields = [...(LISTS['*'] ?? []), ...(LISTS[record.family] ?? [])];
  const scalarFields = [...(SCALARS['*'] ?? []), ...(SCALARS[record.family] ?? [])];

  for (const field of listFields) {
    const raw = record[field];
    if (!Array.isArray(raw)) continue;
    raw.forEach((value, i) => {
      if (typeof value === 'string') refs.push({ field: `${field}[${i}]`, id: value });
    });
  }
  for (const field of scalarFields) {
    const value = record[field];
    if (typeof value === 'string') refs.push({ field, id: value });
  }
  if (record.family === 'evidence') {
    const target = record.target as { entity?: unknown } | undefined;
    if (target && typeof target.entity === 'string') refs.push({ field: 'target.entity', id: target.entity });
  }
  return refs;
}
