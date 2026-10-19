import type { APIRoute } from 'astro';
import { buildIndex } from '../../bibliography/index-data.js';
import { loadEssaySite } from '../../essays/site-data.js';

/* The search index of the bibliography (spec 006 contracts/bibliography-pages.md): public entries only, the contract's fields only. */
export const GET: APIRoute = async () => {
  const { records, cslFor } = await loadEssaySite();
  return new Response(JSON.stringify(buildIndex(records, cslFor)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
