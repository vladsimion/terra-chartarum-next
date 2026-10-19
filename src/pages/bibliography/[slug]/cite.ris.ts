import type { APIRoute } from 'astro';
import { fileFor, pathsFor } from '../../../bibliography/export-routes.js';

export const getStaticPaths = pathsFor('entry');

export const GET: APIRoute = ({ params, site }) => fileFor('entry', params.slug, site, 'ris');
