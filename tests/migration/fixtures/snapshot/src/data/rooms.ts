// Shaped like the legacy room list: a typed array of literals.
export interface Room {
  slug: string;
  title: string;
}

export const ROOMS: readonly Room[] = [
  { slug: 'earth', title: 'The Earth' },
  { slug: 'map', title: 'The Map' },
  { slug: 'city', title: 'The City' },
];

export const ROOM_SLUGS = ROOMS.map((r) => r.slug);
