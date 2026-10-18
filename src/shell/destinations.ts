/**
 * The one list of destinations (spec 002, contracts/destinations.md). The header, footer,
 * breadcrumbs, generated stub routes and the build check all read it.
 */
export interface Destination {
  id: string;
  label: string;
  href: string;
  placement: 'header' | 'footer';
  /** What entering this way means; only the seven header lenses have one. */
  lens?: string;
  /** The spec that builds the page. */
  owner: string;
  status: 'built' | 'stub';
}

export const DESTINATIONS: readonly Destination[] = [
  { id: 'essays', label: 'Essays', href: '/essays/', placement: 'header', lens: 'argument', owner: '003', status: 'stub' },
  { id: 'rooms', label: 'Rooms', href: '/rooms/', placement: 'header', lens: 'curatorial structure', owner: '007', status: 'stub' },
  { id: 'atlas', label: 'Atlas', href: '/atlas/', placement: 'header', lens: 'space and time', owner: '005', status: 'stub' },
  { id: 'collection', label: 'Collection', href: '/collection/', placement: 'header', lens: 'objects', owner: '004', status: 'built' },
  { id: 'cartographers', label: 'Cartographers', href: '/cartographers/', placement: 'header', lens: 'makers', owner: '004', status: 'built' },
  { id: 'bibliography', label: 'Bibliography', href: '/bibliography/', placement: 'header', lens: 'evidence', owner: '006', status: 'stub' },
  { id: 'about', label: 'About', href: '/about/', placement: 'header', lens: 'identity', owner: '002', status: 'built' },
  { id: 'colophon', label: 'Colophon', href: '/colophon/', placement: 'footer', owner: '002', status: 'built' },
  { id: 'handbook', label: 'Atlas Handbook', href: '/atlas/handbook/', placement: 'footer', owner: '005', status: 'stub' },
];

export function headerDestinations(): Destination[] {
  return DESTINATIONS.filter((d) => d.placement === 'header');
}

/**
 * The aria-current value for a navigation item: "page" on the destination itself, "true" on a page
 * inside its section, nothing elsewhere (US1 AC 1.2). The visible cue is not colour alone (FR-005).
 */
export function ariaCurrent(path: string, href: string): 'page' | 'true' | undefined {
  if (path === href) return 'page';
  return path.startsWith(href) ? 'true' : undefined;
}

export interface FooterLink {
  label: string;
  href: string;
}

/** A destination by id; pages that link to another spec's destination go through this so a moved address changes in one place. */
export const byId = (id: string): Destination => {
  const found = DESTINATIONS.find((d) => d.id === id);
  if (!found) throw new Error(`no destination ${id}`);
  return found;
};

/** The footer's links (FR-002). Licences is a section of the Colophon, not a destination of its own. */
export function footerLinks(): FooterLink[] {
  const colophon = byId('colophon');
  return [
    { label: colophon.label, href: colophon.href },
    { label: byId('handbook').label, href: byId('handbook').href },
    { label: 'Licences', href: `${colophon.href}#licences` },
    { label: byId('about').label, href: byId('about').href },
  ];
}

/**
 * What is wrong with a destination list, in a stable order: duplicate hrefs, hrefs without a
 * trailing slash, a `built` destination with no page, and a `stub` that already has one (its owner
 * flips it to `built` in the same change that adds the page). `pageExists` is injected so the check
 * is pure.
 */
export function destinationProblems(list: readonly Destination[], pageExists: (href: string) => boolean): string[] {
  const problems: string[] = [];
  const byHref = new Map<string, string[]>();
  for (const d of list) byHref.set(d.href, [...(byHref.get(d.href) ?? []), d.id]);
  for (const [href, ids] of byHref) {
    if (ids.length > 1) problems.push(`duplicate href ${href} (${ids.join(', ')})`);
  }
  for (const d of list) {
    if (!d.href.endsWith('/')) problems.push(`href ${d.href} must end with a slash (${d.id})`);
  }
  for (const d of list) {
    if (d.status === 'built' && !pageExists(d.href)) problems.push(`built destination ${d.id} has no page at ${d.href}`);
    if (d.status === 'stub' && pageExists(d.href)) problems.push(`stub destination ${d.id} already has a page at ${d.href}`);
  }
  return problems;
}
