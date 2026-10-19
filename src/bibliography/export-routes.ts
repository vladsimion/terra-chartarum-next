import type { GetStaticPaths } from 'astro';
import { accessDate } from '../essays/exports.js';
import { loadEssaySite } from '../essays/site-data.js';
import { datasetItem, entryItem, exportsOf, layerItem, shownByLayer, siteItem } from './cite-inputs.js';
import { publicEntries } from './entry-public.js';
import type { CslItem } from '../essays/citations.js';

/*
 * The download files of everything citable (spec 006 contracts/cite-inputs.md), shared by the thin
 * endpoint files under src/pages. A path exists only for a public input, so a held entry, an uncited
 * one, or a dataset no public layer shows gets no file. The stable URL is on the site origin (Astro's
 * `site`), and the access date is the build's (`BUILD_DATE`, then `SOURCE_DATE_EPOCH`, then today).
 */
export type Format = 'bib' | 'ris' | 'json';

const TYPES: Record<Format, string> = {
  bib: 'application/x-bibtex; charset=utf-8',
  ris: 'application/x-research-info-systems; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

const origin = (site: URL | undefined): URL => {
  if (!site) throw new Error('the site address (`site` in astro.config.mjs) is needed for the stable URL of a citation');
  return site;
};

/** The static paths of one kind of input: the slugs that have a file. */
export const pathsFor =
  (kind: 'entry' | 'dataset' | 'layer'): GetStaticPaths =>
  async () => {
    const { records } = await loadEssaySite();
    const slugs =
      kind === 'entry'
        ? publicEntries(records).map((e) => String(e.slug))
        : kind === 'layer'
          ? records.filter((r) => r.family === 'layer').map((r) => String(r.slug))
          : records.filter((r) => r.family === 'dataset' && shownByLayer(r, records) !== undefined).map((r) => String(r.slug));
    return slugs.map((slug) => ({ params: { slug } }));
  };

/** The CSL item of a path's input, with the stable URL and the access date. */
export async function itemFor(kind: 'entry' | 'dataset' | 'layer' | 'site', slug: string | undefined, site: URL | undefined): Promise<CslItem> {
  const { records, cslFor } = await loadEssaySite();
  const accessed = accessDate(process.env);
  if (kind === 'site') return siteItem(origin(site), accessed);
  const record = records.find((r) => r.family === (kind === 'entry' ? 'bibliography_entry' : kind) && r.slug === slug);
  if (!record) throw new Error(`no public ${kind} with slug ${slug}`);
  if (kind === 'entry') return entryItem(cslFor(record.id), String(record.slug), origin(site), accessed);
  if (kind === 'layer') return layerItem(record, records, origin(site), accessed);
  const item = datasetItem(record, records, origin(site), accessed);
  if (!item) throw new Error(`the dataset ${slug} is shown by no public layer, so it has no address to cite`);
  return item;
}

/** The response for one file of an input. */
export async function fileFor(kind: 'entry' | 'dataset' | 'layer' | 'site', slug: string | undefined, site: URL | undefined, format: Format): Promise<Response> {
  const files = exportsOf(await itemFor(kind, slug, site));
  const body = format === 'bib' ? files.bibtex : format === 'ris' ? files.ris : files.csljson;
  return new Response(body, { headers: { 'Content-Type': TYPES[format] } });
}
