import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';

// Shaped like the legacy catalogue (invented content): value imports above, a schema, then a RAW array of pure literals.
const MapSchema = z.object({
  id: z.string(),
  room: z.enum(ROOM_SLUGS as [string, ...string[]]),
  title: z.string(),
  year: z.number().int(),
});

const RAW: unknown[] = [
  // An object held by an institution
  {
    id: 'plan-of-a-fort',
    room: 'map',
    secondaryRooms: ['city'],
    title: 'Plan of a Fort',
    year: -600,
    essaySlug: 'forts',
    coords: [23.3, 45.6],
    blurb: 'A plan drawn on clay.',
    bibliography: ['smith-2001', { citation: 'Doe, A. (1999) Roads of the Province.', author: 'Doe, A.', year: 1999, title: 'Roads of the Province' }],
    recordScope: 'object',
    custody: 'institutional',
    cartographerId: 'mapmaker-one',
    repository: 'A Fixture Library, Nowhere',
    images: [{ src: '/images/plan-of-a-fort.jpg', alt: 'A plan of a fort', credit: 'Courtesy of a fixture library', license: 'CC BY 4.0' }],
    uncertainties: [
      {
        field: 'provenance',
        question: 'No registration number is recorded.',
        wouldResolve: 'The library record for the tablet.',
      },
    ],
    acquisition: { note: 'FIXTURE-PRIVATE-PRICE 1200' },
    publicationStatus: 'published_witness',
  },
  // A work that has no single object
  {
    id: 'treatise-on-roads',
    room: 'road',
    title: 'Treatise on Roads',
    year: 106,
    recordScope: 'work',
    blurb: `A text without a single surviving map.`,
    relatedMapIds: ['plan-of-a-fort'],
  },
  // A concept
  { id: 'idea-of-a-frontier', room: 'city', title: 'The Idea of a Frontier', year: 1579, recordScope: 'concept', bibliography: ['doe-1999', { citation: 'Roe, B. (2010) Frontiers.', author: 'Roe, B.', year: 2010, title: 'Frontiers' }] },
  // An object nobody can locate
  { id: 'lost-chart', room: 'map', title: 'A Lost Chart', year: 1450, recordScope: 'object', custody: 'unlocated', publicationStatus: 'reference_only' },
  // No scope, no custody: read as an object
  { id: 'ordinary-sheet', room: 'map', title: 'An Ordinary Sheet', year: 1700, engraver: 'A. Engraver', publisher: 'A. Publisher' },
];

export const CORPUS = RAW.map((m) => MapSchema.parse(m));
