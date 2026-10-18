import { isPublic, isRetired } from './publication.js';
import { routeSection } from './routes.js';
import type { RegistryRecord } from './types.js';

export interface Redirect {
  from: string;
  to: string;
  status: 301;
}


/**
 * The page a superseded record keeps at its own address (spec 002 FR-011). It links to the live
 * record that replaced it, or to nothing when there is no public successor; the shell renders it,
 * and an old citation of the retired record still resolves.
 */
export interface Tombstone {
  path: string;
  id: string;
  /** Page path of the live successor, or null when there is none. */
  successor: string | null;
}

/** Public page of a record, under its family's section (`routes.ts`), so slugs only need to be unique per family. */
export function pagePath(record: RegistryRecord, slug: string = String(record.slug)): string {
  return `/${routeSection(record.family)}/${slug}/`;
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
 * What keeps old addresses working (FR-013). A live record: one 301 per former slug to its current
 * page. A superseded record keeps its own address as a tombstone linking to the live successor (or
 * to nothing), and its former slugs redirect to that tombstone, never past it, so an old citation
 * lands on the record it cited. Nothing redirects away from a retired address. Held records, and
 * held successors, produce nothing and are never named.
 */
export function redirects(records: readonly RegistryRecord[]): { rules: Redirect[]; tombstones: Tombstone[] } {
  const index = new Map<string, RegistryRecord>();
  for (const r of records) if (!index.has(r.id)) index.set(r.id, r);

  const rules: Redirect[] = [];
  const tombstones: Tombstone[] = [];

  for (const record of records) {
    if (!isPublic(record) && !isRetired(record)) continue;
    const formerSlugs = (record.slug_history ?? []).filter((s) => s !== record.slug);
    for (const slug of formerSlugs) rules.push({ from: pagePath(record, slug), to: pagePath(record), status: 301 });
    if (isRetired(record)) {
      const successor = successorOf(record, index);
      tombstones.push({ path: pagePath(record), id: record.id, successor: successor ? pagePath(successor) : null });
    }
  }
  return { rules, tombstones };
}


/** Whitespace and control characters would split or inject lines in the `_redirects` file. */
const UNSAFE_IN_REDIRECT = /[\s\u0000-\u001f\u007f]/;

/**
 * The Cloudflare Pages `_redirects` text for these rules: `from to 301`, one per line, sorted, with
 * repeats and self-redirects dropped. A path with whitespace or a control character is refused
 * rather than written, since it could inject extra rules (FR-013).
 */
export function renderRedirects(rules: readonly Redirect[]): string {
  const lines = new Set<string>();
  for (const { from, to, status } of rules) {
    for (const path of [from, to]) {
      if (UNSAFE_IN_REDIRECT.test(path)) throw new Error(`unsafe path in redirect: ${JSON.stringify(path)}`);
    }
    if (from !== to) lines.add(`${from} ${to} ${status}`);
  }
  return lines.size === 0 ? '' : `${[...lines].sort().join('\n')}\n`;
}
