import { describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { checkLinks } from '../support/links.js';

/*
 * Spec 007 T022 (FR-010, SC-002): every internal link and fragment of every built fixture site
 * resolves. The shell's site carries the stub pages and the test-only fixture pages; the others are
 * the sites built for the collection, the Atlas, the bibliography and the rooms.
 */
const sites: [string, () => string][] = [
  ['shell', () => inject('siteDir')],
  ['collection', () => inject('collectionSiteDir')],
  ['atlas', () => inject('atlasSiteDir')],
  ['bibliography', () => inject('bibliographySiteDir')],
  ['rooms', () => inject('roomsSiteDir')],
];

describe('the built sites have no dead internal link or fragment', () => {
  it.each(sites)('%s', (_name, dir) => {
    expect(checkLinks(dir())).toEqual([]);
  });
});
