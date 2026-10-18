import type { APIRoute, GetStaticPaths } from 'astro';
import { exportPaths, exportsFor } from '../../../essays/export-routes.js';

export const getStaticPaths: GetStaticPaths = exportPaths;

export const GET: APIRoute = async ({ params, site }) =>
  new Response((await exportsFor(params.slug!, site)).csljson, { headers: { 'Content-Type': 'application/vnd.citationstyles.csl+json; charset=utf-8' } });
