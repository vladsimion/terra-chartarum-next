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

/*
 * Cartographer biographies (spec 004 US3): released prose in `content/cartographer/<id>.md` beside the
 * record. A profile page is generated for a public cartographer only (src/pages/cartographers/[slug].astro),
 * so a held cartographer's biography is read here and never written out.
 */
const cartographerBios = defineCollection({
  loader: glob({ pattern: '*.md', base: `${process.env.REGISTRY_ROOT ?? '.'}/content/cartographer` }),
});

/*
 * The Atlas Handbook (spec 005 US5, FR-018): one entry per topic under /atlas/handbook/. `anchors`
 * lists the headings other pages link to (src/atlas/handbook-links.ts); a test checks they exist.
 * `draft` defaults to true: the v1 text is skeleton copy and `shell:check --cutover` fails until the
 * author writes and releases it.
 */
const handbook = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/handbook' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().int().positive(),
    draft: z.boolean().default(true),
    anchors: z.array(z.string()).min(1),
  }),
});

export const collections = { handbook, pages, 'essay-bodies': essayBodies, 'cartographer-bios': cartographerBios };
