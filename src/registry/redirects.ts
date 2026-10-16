import { isPublic, isRetired } from './publication.js';
import type { RegistryRecord } from './types.js';

export interface Redirect {
  from: string;
  to: string;
  status: 301;
}

export interface Withdrawn {
  path: string;
  id: string;
}

/** Public page of a record. The family is part of the url, so slugs only need to be unique per family. */
export function pagePath(record: RegistryRecord, slug: string = String(record.slug)): string {
  return `/${record.family}/${slug}/`;
}

/** Follow `superseded_by` to a live record, or null when the chain ends, loops or hits a held entity. */
function successorOf(record: RegistryRecord, index: ReadonlyMap<string, RegistryRecord>): RegistryRecord | null {
  const seen = new Set<string>([record.id]);
  let current: RegistryRecord = record;
  while (isRetired(current)) {
    const nextId = current.superseded_by;
    if (!nextId || seen.has(nextId)) return null;
    seen.add(nextId);
    const next = index.get(nextId);
    if (!next) return null;
    current = next;
  }
  return isPublic(current) ? current : null;
}

/**
 * One 301 per former slug (FR-013). A superseded entity redirects, under its current and former
 * slugs, to its successor; a retired entity with no successor gets a withdrawn page and its former
 * slugs redirect to it. Held entities produce nothing.
 */
export function redirects(records: readonly RegistryRecord[]): { rules: Redirect[]; withdrawn: Withdrawn[] } {
  const index = new Map<string, RegistryRecord>();
  for (const r of records) if (!index.has(r.id)) index.set(r.id, r);

  const rules: Redirect[] = [];
  const withdrawn: Withdrawn[] = [];

  for (const record of records) {
    const history = (record.slug_history ?? []).filter((s) => s !== record.slug);
    if (isPublic(record)) {
      for (const slug of history) rules.push({ from: pagePath(record, slug), to: pagePath(record), status: 301 });
    } else if (isRetired(record)) {
      const successor = successorOf(record, index);
      if (successor) {
        for (const slug of [String(record.slug), ...history]) {
          rules.push({ from: pagePath(record, slug), to: pagePath(successor), status: 301 });
        }
      } else {
        withdrawn.push({ path: pagePath(record), id: record.id });
        for (const slug of history) rules.push({ from: pagePath(record, slug), to: pagePath(record), status: 301 });
      }
    }
  }
  return { rules, withdrawn };
}
