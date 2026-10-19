import type { APIRoute } from 'astro';
import { fileFor, pathsFor } from '../../../../bibliography/export-routes.js';

export const getStaticPaths = pathsFor('dataset');

export const GET: APIRoute = ({ params, site }) => fileFor('dataset', params.slug, site, 'ris');
