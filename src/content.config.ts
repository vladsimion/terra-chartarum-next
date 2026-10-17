import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Prose that belongs to the site rather than to a scholarly record: the home, About and Colophon
 * copy (spec 002 FR-016). `draft` defaults to true, so placeholder text can never look final until
 * the author flips it; the shell:check cutover mode fails while any page is still a draft.
 */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(true),
    lang: z.string().default('en'),
  }),
});

export const collections = { pages };
