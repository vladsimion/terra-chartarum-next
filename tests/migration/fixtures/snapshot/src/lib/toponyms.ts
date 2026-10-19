import { z } from 'astro:content';

const ToponymSchema = z.object({ id: z.string(), modern: z.string() });

const RAW: unknown[] = [
  { id: 'nowhere', modern: 'Nowhere', ancient: 'Nusquam', variants: ['Nowhereville'], coords: [23.3, 45.6], mapIds: ['plan-of-a-fort'], essaySlugs: ['forts'], pleiadesId: '12345', cndPlaceId: 'plc-nowhere' },
  { id: 'elsewhere', modern: 'Elsewhere', medieval: 'Alibi', coords: [-1.5, 50], whgId: '999' },
];

export const TOPONYMS = RAW.map((t) => ToponymSchema.parse(t));
