/*
 * Where the Atlas sends a reader to learn (spec 005 US5, FR-018, research R10): the five Handbook
 * topics, the anchors each offers, and the links the Atlas, the layer controls, the inspector, the
 * home page and the footer use. A test checks that every one of them resolves to a topic and an
 * anchor that exist, so a deep link cannot rot unseen.
 */
export interface HandbookTopic {
  slug: string;
  anchors: string[];
}

/** In reading order. Each topic's `anchors` must match its entry's front matter and its headings. */
export const HANDBOOK_TOPICS: readonly HandbookTopic[] = [
  { slug: 'reading-the-time-control', anchors: ['time-control', 'uncertain-dates', 'out-of-range'] },
  { slug: 'provenance-and-reconstruction', anchors: ['provenance', 'reconstruction', 'present-day-reference'] },
  { slug: 'themes-and-collections', anchors: ['themes', 'collections', 'rooms'] },
  { slug: 'sharing-a-view', anchors: ['copy-this-view', 'retired-addresses'] },
  { slug: 'keyboard-and-accessibility', anchors: ['keyboard', 'no-webgl', 'reduced-motion'] },
];

export const HANDBOOK_LINKS = {
  index: '/atlas/handbook/',
  time: '/atlas/handbook/reading-the-time-control/#time-control',
  provenance: '/atlas/handbook/provenance-and-reconstruction/#provenance',
  themes: '/atlas/handbook/themes-and-collections/#themes',
  sharing: '/atlas/handbook/sharing-a-view/#copy-this-view',
  keyboard: '/atlas/handbook/keyboard-and-accessibility/#keyboard',
} as const;
