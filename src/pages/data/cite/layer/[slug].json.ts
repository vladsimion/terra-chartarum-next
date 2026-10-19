import type { APIRoute } from 'astro';
import { fileFor, pathsFor } from '../../../../bibliography/export-routes.js';

export const getStaticPaths = pathsFor('layer');

export const GET: APIRoute = ({ params, site }) => fileFor('layer', params.slug, site, 'json');
