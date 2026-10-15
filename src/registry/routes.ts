/**
 * Public URL path for each routable family: the single definition used by
 * redirects (spec 001) and by page routes (specs 002–007). Only families with
 * their own public page appear here (see ROUTABLE_FAMILIES in schemas/envelope.ts).
 */
export const FAMILY_PATHS = {
  essay: '/essays/',
  map: '/collection/',
  cartographer: '/cartographers/',
  place: '/places/',
  collection: '/atlas/collections/',
  room: '/rooms/',
} as const;

export type RoutableFamily = keyof typeof FAMILY_PATHS;

export function isRoutable(family: string): family is RoutableFamily {
  return Object.hasOwn(FAMILY_PATHS, family);
}

export function pagePath(family: RoutableFamily, slug: string): string {
  return `${FAMILY_PATHS[family]}${slug}/`;
}
