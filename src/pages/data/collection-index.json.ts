import type { APIRoute } from 'astro';
import { buildIndex } from '../../collection/index-data.js';
import { loadEssaySite } from '../../essays/site-data.js';

/* The filter index of the collection (spec 004 contracts/collection-pages.md): public maps only, the contract's fields only. */
export const GET: APIRoute = async () => {
  const { records } = await loadEssaySite();
  return new Response(JSON.stringify(buildIndex(records)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
