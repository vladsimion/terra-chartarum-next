import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { isPublic } from '../registry/publication.js';
import type { RegistryRecord } from '../registry/types.js';
import { ImportError, text, type Row } from './context.js';
import { extractRaw } from './extract-ts.js';
import type { Snapshot } from './snapshot.js';

/*
 * The redirect inventory (spec 008 FR-003, contracts/redirect-inventory.md): every old public URL with
 * exactly one outcome, built from the snapshot's routes (never the live site) and from the registry for
 * what has moved. The archive is the old site itself, so a URL whose content has not moved stays
 * `in-place` and needs no rule; only a page with a public successor gets a `rule`.
 */
export type Kind =
  | 'home' | 'error' | 'page' | 'essays-index' | 'essay' | 'collection-index' | 'collection-record' | 'cartographer-index' | 'cartographer-record'
  | 'room-index' | 'room' | 'bibliography' | 'atlas' | 'atlas-layer' | 'handbook' | 'data' | 'geo' | 'feed' | 'search-index' | 'programme' | 'series' | 'embed';

export type InventoryEntry = { path: string; kind: Kind } & ({ outcome: 'in-place' } | { outcome: 'rule'; to: string });

/** The index pages of the legacy Handbook (`HANDBOOK_SECTIONS`), which are not documents. */
const HANDBOOK_SECTIONS = ['layers', 'methods', 'evidence', 'glossary', 'data-fields', 'decisions', 'technical'];
/** How each Handbook document type is routed (`ROUTE_SEGMENTS` in the legacy `handbook.ts`). */
const HANDBOOK_SEGMENTS: Record<string, string | null> = { method: 'methods', evidence: 'evidence', 'data-fields': 'data-fields', 'editorial-decision': 'decisions', technical: 'technical', glossary: null };
/** Handbook documents with these lifecycles have a public page (`PUBLISHABLE_LIFECYCLES`). */
const PUBLISHABLE = new Set(['published', 'in-review']);

/** Pages the successor has under the same path, so the old one redirects to it. */
const SAME_PATH = new Set(['/collection/', '/cartographers/', '/rooms/', '/about/', '/colophon/', '/essays/', '/bibliography/']);

const walk = async (dir: string, rel = ''): Promise<string[]> => {
  const entries = await readdir(path.join(dir, rel), { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const next = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(dir, next)));
    else out.push(next);
  }
  return out;
};

function frontMatter(source: string, file: string): Row {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!m) return {};
  try {
    return (parse(m[1] as string) ?? {}) as Row;
  } catch (error) {
    throw new ImportError(`${file}: the front matter does not parse (${(error as Error).message})`);
  }
}

const slash = (p: string): string => (p.endsWith('/') ? p : `${p}/`);
export const pathOf = (url: string): string => {
  try {
    return slash(new URL(url, 'https://terra-chartarum.pages.dev').pathname);
  } catch {
    return slash(url);
  }
};

function kindOf(p: string): Kind {
  if (p === '/') return 'home';
  if (p === '/404' || p === '/500') return 'error';
  if (p === '/essays/') return 'essays-index';
  if (p === '/collection/') return 'collection-index';
  if (p === '/cartographers/') return 'cartographer-index';
  if (p === '/rooms/') return 'room-index';
  if (p === '/bibliography/') return 'bibliography';
  if (p === '/atlas/') return 'atlas';
  if (p.startsWith('/atlas/handbook/')) return 'handbook';
  if (p.startsWith('/programmes/')) return 'programme';
  if (p.startsWith('/series/')) return 'series';
  if (p.startsWith('/embeds/')) return 'embed';
  if (p.startsWith('/data/')) return 'data';
  if (p.startsWith('/geo/')) return 'geo';
  if (p === '/rss.xml') return 'feed';
  if (p === '/search-index.json') return 'search-index';
  return 'page';
}

/** The path a file under `src/pages` builds to, or null for a dynamic route (expanded elsewhere). */
function staticPath(file: string): string | null {
  if (file.includes('[')) return null;
  const endpoint = file.endsWith('.ts');
  const stem = file.replace(/\.(astro|ts)$/, '');
  if (endpoint) return `/${stem}`;
  if (stem === '404' || stem === '500') return `/${stem}`;
  if (stem === 'index') return '/';
  return `/${stem.replace(/(^|\/)index$/, '')}/`.replace(/\/\/$/, '/');
}

/** What the successor has, by the legacy id or path that reaches it. */
export interface Successor {
  maps: Map<string, string>;
  cartographers: Map<string, string>;
  rooms: Map<string, string>;
  /** A rebuilt essay's legacy path to its new slug. */
  essays: Map<string, string>;
}

/** A legacy id reaches a record by its slug or a slug it used to have; only a published and released record is a page. */
export function successorOf(records: readonly RegistryRecord[]): Successor {
  const publicBy = (family: string): Map<string, string> => {
    const found = new Map<string, string>();
    for (const r of records.filter((x) => x.family === family && isPublic(x))) {
      found.set(String(r.slug), String(r.slug));
      for (const old of Array.isArray(r.slug_history) ? (r.slug_history as string[]) : []) found.set(old, String(r.slug));
    }
    return found;
  };
  const essays = new Map<string, string>();
  for (const r of records.filter((x) => x.family === 'essay' && isPublic(x) && typeof x.legacy_url === 'string')) essays.set(pathOf(String(r.legacy_url)), String(r.slug));
  return { maps: publicBy('map'), cartographers: publicBy('cartographer'), rooms: publicBy('room'), essays };
}

/** The one outcome of an old path: a rule when the successor has the page, otherwise the archive serves it where it is. */
export function outcomeOf(p: string, kind: Kind, successor: Successor): InventoryEntry {
  const rule = (to: string): InventoryEntry => ({ path: p, kind, outcome: 'rule', to });
  const inPlace: InventoryEntry = { path: p, kind, outcome: 'in-place' };
  if (kind === 'atlas') return rule('/atlas/?from=legacy');
  if (SAME_PATH.has(p)) return rule(p);
  if (kind === 'essay') return successor.essays.has(p) ? rule(`/essays/${successor.essays.get(p)}/`) : inPlace;
  const id = p.split('/')[2] as string;
  if (kind === 'collection-record') return successor.maps.has(id) ? rule(`/collection/${successor.maps.get(id)}/`) : inPlace;
  if (kind === 'cartographer-record') return successor.cartographers.has(id) ? rule(`/cartographers/${successor.cartographers.get(id)}/`) : inPlace;
  if (kind === 'room') return successor.rooms.has(id) ? rule(`/rooms/${successor.rooms.get(id)}/`) : inPlace;
  return inPlace;
}

export async function buildInventory(snapshot: Snapshot, records: readonly RegistryRecord[]): Promise<InventoryEntry[]> {
  const routes = new Map<string, Kind>();
  const add = (p: string, kind?: Kind) => routes.set(p, kind ?? kindOf(p));

  for (const file of await walk(path.join(snapshot.root, 'src/pages'))) {
    const p = staticPath(file);
    if (p !== null) add(p);
  }

  const registry = async (name: string, array = 'RAW') => extractRaw(await readFile(path.join(snapshot.root, `src/lib/${name}.ts`), 'utf8'), `src/lib/${name}.ts`, array);
  for (const row of await registry('corpus')) add(`/collection/${String(row.id)}/`, 'collection-record');
  for (const row of await registry('cartographers')) add(`/cartographers/${String(row.id)}/`, 'cartographer-record');
  const rooms = extractRaw(await readFile(path.join(snapshot.root, 'src/data/rooms.ts'), 'utf8'), 'src/data/rooms.ts', 'ROOMS');
  for (const row of rooms) add(`/rooms/${String(row.slug)}/`, 'room');

  const released = snapshot.date.slice(0, 10);
  const essays = path.join(snapshot.root, 'src/content/essays');
  for (const file of await walk(essays)) {
    const slug = file.replace(/\.(mdx?|md)$/, '');
    if (slug === file) continue;
    const meta = frontMatter(await readFile(path.join(essays, file), 'utf8'), `src/content/essays/${file}`);
    const at = meta.releaseAt === undefined ? undefined : String(meta.releaseAt).slice(0, 10);
    if (at === undefined || at <= released) add(`/essays/${slug}/`, 'essay');
  }

  for (const section of HANDBOOK_SECTIONS) add(`/atlas/handbook/${section}/`, 'handbook');
  const handbook = path.join(snapshot.root, 'src/content/handbook');
  for (const file of await walk(handbook)) {
    if (!/\.(mdx?|md)$/.test(file)) continue;
    const doc = frontMatter(await readFile(path.join(handbook, file), 'utf8'), `src/content/handbook/${file}`);
    if (!PUBLISHABLE.has(String(doc.lifecycle ?? 'draft'))) continue;
    const type = String(doc.docType);
    if (type === 'layer') {
      const layer = text(doc, 'layerId');
      if (!layer) throw new ImportError(`src/content/handbook/${file}: a layer document has no layerId`);
      add(`/atlas/layers/${layer}/`, 'atlas-layer');
    } else if (type === 'glossary') {
      add('/atlas/handbook/glossary/', 'handbook');
    } else {
      const segment = HANDBOOK_SEGMENTS[type];
      const slug = text(doc, 'routeSlug');
      if (!segment || !slug) throw new ImportError(`src/content/handbook/${file}: a ${type} document needs a routeSlug`);
      add(`/atlas/handbook/${segment}/${slug}/`, 'handbook');
    }
  }

  const reference = path.join(snapshot.root, 'data/vmn/reference');
  for (const file of await walk(reference)) if (file.endsWith('.json')) add(`/data/vmn/reference/${file}`, 'data');

  const successor = successorOf(records);
  const entries: InventoryEntry[] = [...routes].map(([p, kind]) => outcomeOf(p, kind, successor));
  return entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
