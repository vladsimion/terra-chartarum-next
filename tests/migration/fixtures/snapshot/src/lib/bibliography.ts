import { z } from 'astro:content';

const BibliographySchema = z.object({ id: z.string(), title: z.string() });

const RAW: unknown[] = [
  { id: 'smith-2001', author: 'Smith, J.', year: 2001, title: 'The Fixture Atlas', citation: 'Smith, J. The Fixture Atlas. Nowhere: A Press, 2001.', url: 'https://example.org/smith' },
  { id: 'doe-1999', author: 'Doe, A.', year: 1999, title: 'Roads of the Province', citation: 'Doe, A. Roads of the Province. Elsewhere: B Press, 1999.' },
  { id: 'roe-2025', author: 'Roe, R.', year: 2025, title: 'Roads in the Province - A Study of the Fixture Atlas', citation: 'Roe, R. Roads in the Province - A Study of the Fixture Atlas. Journal of Fixtures 1 (2025).', url: 'https://doi.org/10.1000/roe.article' },
  { id: 'roe-data-2025', author: 'Roe, R.', year: 2025, title: 'Roads in the Province - A Study of the Fixture Atlas: replication data', citation: 'Roe, R. Roads in the Province - A Study of the Fixture Atlas. Replication data, 2025.', url: 'https://doi.org/10.2000/roe.data' },
  { id: 'lee-1980', author: 'Lee, K.', year: 1980, title: 'A Gazetteer', citation: 'Lee, K. A Gazetteer. 1980.' },
];

export const BIBLIOGRAPHY = RAW.map((b) => BibliographySchema.parse(b));
