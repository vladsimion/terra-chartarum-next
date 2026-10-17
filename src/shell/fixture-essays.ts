/** The test-only fixture essays (spec 002 T027, T032): two neutral pages with different accent slots. */
export const FIXTURE_ESSAYS = [
  { slug: 'essay-a', title: 'Fixture essay A: how a frontier line was drawn', accent: 'verdigris' },
  { slug: 'essay-b', title: 'Fixture essay B: what a road map leaves out', accent: 'madder' },
] as const;

/** Pages that exist only to prove a gate can fail: an inaccessible page, and a page over the JavaScript budget. Never measured as templates. */
export const TEST_ONLY_FIXTURES = ['bad-a11y', 'budget'] as const;

/** A page whose title is far longer than any breadcrumb can show (spec 002 edge case); not in the snapshot set. */
export const LONG_TITLE_FIXTURE = {
  slug: 'long-title',
  title:
    'A very long scholarly title that keeps going so that no breadcrumb on a phone could ever show it whole: on the early modern cartographic representation of the frontier provinces of Roman Dacia and Moesia in atlases printed between 1570 and 1700',
  accent: 'gold',
} as const;
