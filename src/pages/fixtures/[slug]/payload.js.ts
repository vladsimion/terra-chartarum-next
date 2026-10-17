import type { APIRoute } from 'astro';
import { budgetPayload } from '../../../shell/budget-payload.js';

/*
 * Test-only: the over-budget fixture's JavaScript, served as a separate script file so that Lighthouse counts it
 * against the script budget (an inline script is counted as part of the HTML document and never trips it).
 * Generated only when SHELL_FIXTURES=1, and only for the budget fixture (spec 002 US3, ADR 0004).
 */

export function getStaticPaths() {
  if (process.env.SHELL_FIXTURES !== '1') return [];
  return [{ params: { slug: 'budget' } }];
}

export const GET: APIRoute = () =>
  new Response(`window.__payload="${budgetPayload()}";\n`, { headers: { 'Content-Type': 'text/javascript' } });
