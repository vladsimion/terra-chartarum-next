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

/*
 * The essay bodies (spec 003): `content/essay/<id>.mdx` beside each record, read from the registry
 * root (REGISTRY_ROOT in tests, the repository otherwise). The registry stays the source of every
 * fact about an essay; this collection only renders the prose. A page is generated for a public
 * essay only (src/pages/essays/[slug].astro), so a held essay's body is read here and never written out.
 */
const essayBodies = defineCollection({
  loader: glob({ pattern: '*.mdx', base: `${process.env.REGISTRY_ROOT ?? '.'}/content/essay` }),
});

export const collections = { pages, 'essay-bodies': essayBodies };
