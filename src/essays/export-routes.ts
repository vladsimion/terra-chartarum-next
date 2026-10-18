import { accessDate, essayExports, type EssayExports } from './exports.js';
import { loadEssaySite } from './site-data.js';

/*
 * The static citation files of each public essay (`/essays/<slug>/cite.bib`, `.ris`, `.json`;
 * contracts/citations-and-exports.md). Shared by the three endpoints. The stable URL is the essay's
 * canonical address on the site; the access date is the build's (SOURCE_DATE_EPOCH when set).
 */
export async function exportPaths() {
  const { records } = await loadEssaySite();
  return records.filter((r) => r.family === 'essay').map((essay) => ({ params: { slug: String(essay.slug) } }));
}

export async function exportsFor(slug: string, site: URL | undefined): Promise<EssayExports> {
  const { records } = await loadEssaySite();
  const essay = records.find((r) => r.family === 'essay' && r.slug === slug);
  if (!essay) throw new Error(`no public essay with slug ${slug}`);
  if (!site) throw new Error('the site address (`site` in astro.config.mjs) is needed for the essay’s stable URL');
  return essayExports(
    {
      title: String(essay.title),
      authors: Array.isArray(essay.authors) ? (essay.authors as string[]) : [],
      published_on: typeof essay.published_on === 'string' ? essay.published_on : undefined,
      url: new URL(`/essays/${slug}/`, site).href,
    },
    accessDate(process.env),
  );
}
