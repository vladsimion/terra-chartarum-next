import { z } from 'astro:content';

const BibliographySchema = z.object({ id: z.string(), title: z.string() });

const RAW: unknown[] = [
  { id: 'smith-2001', author: 'Smith, J.', year: 2001, title: 'The Fixture Atlas', citation: 'Smith, J. The Fixture Atlas. Nowhere: A Press, 2001.', url: 'https://example.org/smith' },
  { id: 'doe-1999', author: 'Doe, A.', year: 1999, title: 'Roads of the Province', citation: 'Doe, A. Roads of the Province. Elsewhere: B Press, 1999.' },
  { id: 'lee-1980', author: 'Lee, K.', year: 1980, title: 'A Gazetteer', citation: 'Lee, K. A Gazetteer. 1980.' },
];

export const BIBLIOGRAPHY = RAW.map((b) => BibliographySchema.parse(b));
