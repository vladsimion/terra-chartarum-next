import { DESTINATIONS, type Destination } from './destinations.js';

export interface BreadcrumbItem {
  label: string;
  /** The last item is the current page and has no link. */
  href: string | null;
}

/**
 * The trail for a page (spec 002 FR-016): none on the home page or a lens landing; otherwise the
 * lens it sits under, or Home when it is under none, then the page itself. A long title is
 * returned whole; truncating it is a CSS matter so the full text stays in the page.
 */
export function breadcrumbs(
  path: string,
  title: string,
  destinations: readonly Destination[] = DESTINATIONS,
): BreadcrumbItem[] {
  if (path === '/') return [];
  const lenses = destinations.filter((d) => d.placement === 'header');
  if (lenses.some((d) => d.href === path)) return [];
  const lens = lenses.find((d) => path.startsWith(d.href));
  const root = lens ? { label: lens.label, href: lens.href } : { label: 'Home', href: '/' };
  return [root, { label: title, href: null }];
}
