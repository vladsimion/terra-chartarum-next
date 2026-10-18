import type { PublicRecord } from '../registry/project.js';
import { mapExports, type CitableMap, type MapExports } from './citation.js';
import { accessDate } from '../essays/exports.js';
import { loadEssaySite } from '../essays/site-data.js';

/*
 * The citation of each public map (`/collection/<slug>/cite.bib`, `.ris`, `.json` and the Chicago
 * entry on the page), shared by the endpoints and the page. The stable URL is the record's canonical
 * address; the access date is the build's (SOURCE_DATE_EPOCH when set).
 */
export function citableMap(map: PublicRecord, records: readonly PublicRecord[], site: URL | undefined): CitableMap {
  if (!site) throw new Error('the site address (`site` in astro.config.mjs) is needed for the record’s stable URL');
  const titleOf = (id: unknown): string | undefined => (typeof id === 'string' ? records.find((r) => r.id === id)?.title : undefined) as string | undefined;
  const makers = (Array.isArray(map.makers) ? map.makers : []).map(titleOf).filter((t): t is string => t !== undefined);
  return {
    title: String(map.title),
    makers,
    date_published: typeof map.date_published === 'string' ? map.date_published : undefined,
    place: titleOf(map.publication_place),
    repository: map.witness_kind === 'institutional' && typeof map.repository === 'string' ? map.repository : undefined,
    url: new URL(`/collection/${String(map.slug)}/`, site).href,
  };
}

export async function exportPaths() {
  const { records } = await loadEssaySite();
  return records.filter((r) => r.family === 'map').map((map) => ({ params: { slug: String(map.slug) } }));
}

export async function exportsFor(slug: string, site: URL | undefined): Promise<MapExports> {
  const { records } = await loadEssaySite();
  const map = records.find((r) => r.family === 'map' && r.slug === slug);
  if (!map) throw new Error(`no public map with slug ${slug}`);
  return mapExports(citableMap(map, records, site), accessDate(process.env));
}
