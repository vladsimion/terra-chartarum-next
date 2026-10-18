import type { APIRoute, GetStaticPaths } from 'astro';
import { exportPaths, exportsFor } from '../../../essays/export-routes.js';

export const getStaticPaths: GetStaticPaths = exportPaths;

export const GET: APIRoute = async ({ params, site }) =>
  new Response((await exportsFor(params.slug!, site)).ris, { headers: { 'Content-Type': 'application/x-research-info-systems; charset=utf-8' } });
