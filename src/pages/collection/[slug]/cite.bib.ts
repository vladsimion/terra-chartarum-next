import type { APIRoute, GetStaticPaths } from 'astro';
import { exportPaths, exportsFor } from '../../../collection/export-routes.js';

export const getStaticPaths: GetStaticPaths = exportPaths;

export const GET: APIRoute = async ({ params, site }) =>
  new Response((await exportsFor(params.slug!, site)).bibtex, { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' } });
