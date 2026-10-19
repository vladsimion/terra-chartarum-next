import type { APIRoute } from 'astro';
import { fileFor } from '../../../bibliography/export-routes.js';

export const GET: APIRoute = ({ site }) => fileFor('site', undefined, site, 'json');
