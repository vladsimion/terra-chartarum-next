/**
 * Where each family's pages live on the site: `/<section>/<slug>/`. The redirect rules, the
 * tombstones and the leak scan all read this table, so they cannot disagree with the pages the site
 * builds. A family with no row keeps its own name as the section until its spec adds one (spec 004
 * puts maps under `/collection/`, for example).
 */
export const PAGE_ROUTES: Readonly<Record<string, string>> = {
  essay: 'essays',
  // spec 004: the catalogue
  map: 'collection',
  cartographer: 'cartographers',
};

export function routeSection(family: string): string {
  return PAGE_ROUTES[family] ?? family;
}
