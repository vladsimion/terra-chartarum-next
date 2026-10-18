import { THEME_LABELS, THEME_VALUES } from '../registry/schemas/atlas-values.js';
import type { AtlasIndex, IndexLayer } from './types.js';

/*
 * The catalogue search (spec 005 US2.3, FR-021): exact title, then title prefix, then tag or
 * synonym, then collection, theme or room, then description; ties by title. Case and diacritics are
 * ignored. A word of a title that starts with the query counts as a title prefix, so "frontier"
 * finds "The frontier line". Pure: the index and a query in, layers out.
 */

/** Lower case, diacritics folded, whitespace collapsed. */
export function normalise(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const themeLabel = (theme: string): string => (THEME_VALUES as readonly string[]).includes(theme) ? THEME_LABELS[theme as keyof typeof THEME_LABELS] : theme;

/** Lower is better; null is no match. */
function tier(layer: IndexLayer, collectionTitles: ReadonlyMap<string, string>, query: string): number | null {
  const title = normalise(layer.title);
  if (title === query) return 0;
  if (title.startsWith(query) || title.split(' ').some((word) => word.startsWith(query))) return 1;
  if ([...layer.tags, ...layer.synonyms].some((text) => normalise(text).startsWith(query))) return 2;
  const context = [themeLabel(layer.theme), ...layer.rooms, ...layer.collections.map((slug) => collectionTitles.get(slug) ?? slug)];
  if (context.some((text) => normalise(text).includes(query))) return 3;
  if (normalise(layer.description).includes(query)) return 4;
  return null;
}

/** The layers that match, best first. A blank query is no search and lists every layer by title. */
export function rank(index: AtlasIndex, query: string): IndexLayer[] {
  const q = normalise(query);
  const collectionTitles = new Map(index.collections.map((c) => [c.slug, c.title]));
  const byTitle = (a: IndexLayer, b: IndexLayer) => normalise(a.title).localeCompare(normalise(b.title));
  if (q === '') return [...index.layers].sort(byTitle);
  return index.layers
    .map((layer) => ({ layer, tier: tier(layer, collectionTitles, q) }))
    .filter((entry): entry is { layer: IndexLayer; tier: number } => entry.tier !== null)
    .sort((a, b) => a.tier - b.tier || byTitle(a.layer, b.layer))
    .map((entry) => entry.layer);
}
