import { z } from 'astro:content';
import { GEO_LAYERS } from './geo';

const CollectionSchema = z.object({ id: z.string() });

const RAW: unknown[] = [
  {
    id: 'fixture-collection',
    title: 'A fixture collection',
    summary: 'Forts and a coast.',
    description: 'Forts come on with the coast.',
    layerIds: ['fixture-coast', 'fort-sites'],
    defaultLayerIds: ['fort-sites'],
    room: 'city',
    essaySlugs: ['forts'],
    tags: ['forts'],
    featured: true,
    sortWeight: 10,
    yearFrom: -600,
  },
];

export const GEO_COLLECTIONS = RAW.map((c) => CollectionSchema.parse(c)).filter((c) => GEO_LAYERS.length > 0);
