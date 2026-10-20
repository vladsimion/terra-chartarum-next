import { z } from 'astro:content';

const CartographerSchema = z.object({ id: z.string(), name: z.string() });

const RAW: unknown[] = [
  {
    id: 'mapmaker-one',
    room: 'map',
    name: 'Ada Mapmaker',
    sortName: 'Mapmaker, Ada',
    born: 1512,
    died: 1594,
    places: ['Nowhere'],
    bio: 'A fixture cartographer.\n\nShe drew the plan of a fort.',
    essaySlugs: ['forts'],
    links: [{ label: 'A page', url: 'https://example.org/ada' }],
  },
  { id: 'mapmaker-two', room: 'theatre', secondaryRooms: ['map'], name: 'Ben Mapmaker', sortName: 'Mapmaker, Ben', born: 1470, died: 1520, bio: 'Another fixture cartographer.' },
];

export const CARTOGRAPHERS = RAW.map((c) => CartographerSchema.parse(c));
