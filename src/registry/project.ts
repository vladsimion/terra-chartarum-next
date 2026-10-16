import { isPublic } from './publication.js';
import type { RegistryRecord } from './types.js';

export type PublicRecord = { id: string; family: string } & Record<string, unknown>;

/*
 * Public output is projected from an allowlist per family (FR-009, ADR 0006 item 15). A field that
 * is not listed is private by default, so a new field stays out of every page, payload, index and
 * export until someone adds it here. Never listed: `private`, `file`, `origin`, `slug_history`,
 * `provenance_chain`, editorial stage and every `legacy_*` / `editor_confirmed` field.
 */
const COMMON = ['id', 'family', 'title', 'slug', 'lifecycle', 'release', 'same_as'];
/** Lists of references; entries that are not public are dropped. */
const COMMON_LIST_REFS = ['relations'];

interface Allow {
  fields?: string[];
  listRefs?: string[];
  scalarRefs?: string[];
}

const DATES = ['valid_from', 'valid_to', 'date_precision', 'date_label'];

const BY_FAMILY: Record<string, Allow> = {
  place: { fields: ['place_type', 'location_status', ...DATES] },
  map: { fields: ['edition_state', 'repository', 'images', 'rights'], listRefs: ['makers'] },
  cartographer: { fields: ['life_dates'] },
  source: { fields: ['source_kind'] },
  dataset: { fields: ['version', 'licence', 'rights'] },
  layer: { fields: ['role', 'asset', 'geometry', 'geometry_provenance', 'images', 'rights'], scalarRefs: ['dataset'] },
  collection: { listRefs: ['members', 'default_layers'] },
  essay: { listRefs: ['evidence', 'maps', 'places', 'sources'] },
  route: { fields: DATES },
  event: { fields: DATES },
  period: { fields: DATES },
  room: {},
  bibliography_entry: { fields: ['csl'] },
  attestation: { fields: ['form', 'silence_state', 'confidence'], scalarRefs: ['place', 'source'] },
  evidence: {
    fields: ['evidence_type', 'geometry_provenance', 'reconstruction', 'confidence', 'rights', 'last_verified', ...DATES],
    scalarRefs: ['source'],
  },
};

/** The parts of a locator that readers may see. */
const LOCATOR_FIELDS = ['value', 'state', 'consulted_copy', 'verified_by', 'verified_on'];

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = structuredClone(source[key]);
  return out;
}

function targetEntity(record: RegistryRecord): unknown {
  return (record.target as { entity?: unknown } | undefined)?.entity;
}

/**
 * The public face of a registry: exactly the entities that are `published` and `released`, with
 * only allowlisted fields, and only references to other public entities (FR-015). Evidence about
 * an entity that is not public is left out rather than describing a held entity.
 */
export function projectPublic(records: readonly RegistryRecord[]): PublicRecord[] {
  let candidates = records.filter(isPublic);
  // evidence needs a public target; dropping it may in turn remove what only it linked to
  for (;;) {
    const ids = new Set(candidates.map((r) => r.id));
    const kept = candidates.filter((r) => r.family !== 'evidence' || ids.has(String(targetEntity(r))));
    if (kept.length === candidates.length) break;
    candidates = kept;
  }
  const publicIds = new Set(candidates.map((r) => r.id));

  const out: PublicRecord[] = candidates.map((record) => {
    const allow = BY_FAMILY[record.family] ?? {};
    const projected: Record<string, unknown> = pick(record, [...COMMON, ...(allow.fields ?? [])]);
    for (const field of [...COMMON_LIST_REFS, ...(allow.listRefs ?? [])]) {
      const value = record[field];
      if (Array.isArray(value)) projected[field] = value.filter((id) => typeof id === 'string' && publicIds.has(id));
    }
    for (const field of allow.scalarRefs ?? []) {
      const value = record[field];
      if (typeof value === 'string' && publicIds.has(value)) projected[field] = value;
    }
    if (record.family === 'evidence') {
      const target = record.target as { entity?: unknown; feature?: unknown };
      projected.target = pick(target as Record<string, unknown>, ['entity', 'feature']);
      if (record.locator && typeof record.locator === 'object') {
        projected.locator = pick(record.locator as Record<string, unknown>, LOCATOR_FIELDS);
      }
    }
    if (record.family === 'attestation' && record.locator && typeof record.locator === 'object') {
      projected.locator = pick(record.locator as Record<string, unknown>, LOCATOR_FIELDS);
    }
    return projected as PublicRecord;
  });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
