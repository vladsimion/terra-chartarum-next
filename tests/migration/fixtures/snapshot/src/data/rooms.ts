// Shaped like the legacy repository: a sibling module the registries import (never executed by the importer).
export const ROOMS = [{ slug: 'map' }, { slug: 'city' }, { slug: 'road' }] as const;
export const ROOM_SLUGS = ROOMS.map((r) => r.slug);
