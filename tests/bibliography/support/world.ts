import { projectPublic, type PublicRecord } from '../../../src/registry/project.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { evidence, layer, map, record, source } from '../../registry/support/builders.js';
import { HELD, PUBLIC, entry } from '../../registry/support/bibliography.js';

/*
 * A small registry for the pure bibliography modules, as plain records: every case the derivation
 * has to get right. Run through `projectPublic` it is what the site sees; nothing here reads a file.
 */
export const id = (family: string, n: number): string => `tc:tc:${family}:${family}-${String(n).padStart(6, '0')}`;
export const E = (n: number): string => id('bibliography_entry', n);

const named = (r: RegistryRecord, slug: string, title: string): RegistryRecord => ({ ...r, slug, title });

/**
 * Entries:
 *  1 listed by public essay 1, map 1 and cartographer 1; also cited as evidence by essay 2 (pending locator)
 *  2 cited as evidence by essay 1 (verified locator), not listed
 *  3 uncited
 *  4 listed only by the held essay 3
 *  5 held, listed by public essay 1
 *  6 through a held Source only (public evidence on it)
 *  7 through held Evidence only
 *  8 reached only through a finding aid Source (never evidence)
 *  9 listed by the dataset and the layer; 10 an edition of 9 and 11 a translation of 10 (both listed by essay 1); 12 an edition of the held entry 5, uncited
 *  13 has no section, listed by essay 1
 */
export function registry(): RegistryRecord[] {
  return [
    named(record('essay', 1, { ...PUBLIC, bibliography: [E(1), E(5), E(13), E(10), E(11)], evidence: [id('evidence', 2)] }), 'frontier', 'How a frontier line was drawn'),
    named(record('essay', 2, { ...PUBLIC, bibliography: [], evidence: [id('evidence', 1)] }), 'related', 'A related essay'),
    named(record('essay', 3, { ...HELD, bibliography: [E(4)], evidence: [] }), 'held-moraine', 'A held essay'),
    named(map(1, { ...PUBLIC, bibliography: [E(1)] }), 'frontier-map', 'A map of the frontier'),
    named(record('cartographer', 1, { ...PUBLIC, bibliography: [E(1)] }), 'a-cartographer', 'A cartographer'),
    named(record('dataset', 1, { ...PUBLIC, bibliography: [E(9)] }), 'a-dataset', 'A dataset'),
    named(layer(1, { ...PUBLIC, dataset: id('dataset', 1), bibliography: [E(9)] }), 'a-layer', 'A layer'),

    entry(1, { ...PUBLIC, section: 'primary_sources' }),
    entry(2, { ...PUBLIC, section: 'historical_maps' }),
    entry(3, { ...PUBLIC }),
    entry(4, { ...PUBLIC }),
    entry(5, { ...HELD }),
    entry(6, { ...PUBLIC }),
    entry(7, { ...PUBLIC }),
    entry(8, { ...PUBLIC }),
    entry(9, { ...PUBLIC }),
    entry(10, { ...PUBLIC, edition_of: E(9) }),
    entry(11, { ...PUBLIC, translation_of: E(10) }),
    entry(12, { ...PUBLIC, edition_of: E(5) }),
    entry(13, { ...PUBLIC, section: undefined }),

    source(1, { ...PUBLIC, entry: E(1) }),
    source(2, { ...PUBLIC, entry: E(2) }),
    source(6, { ...HELD, entry: E(6) }),
    source(7, { ...PUBLIC, entry: E(7) }),
    source(8, { ...PUBLIC, entry: E(8), is_finding_aid: true }),
    evidence(1, { ...PUBLIC, source: id('source', 1), locator: { value: 'p. 12', state: 'pending', proposed_by: 'person' } }),
    evidence(2, { ...PUBLIC, source: id('source', 2), locator: { value: 'pp. 40–42', state: 'verified', proposed_by: 'person', verified_by: 'A. Editor', verified_on: '2026-10-10' } }),
    evidence(6, { ...PUBLIC, source: id('source', 6) }),
    evidence(7, { ...HELD, source: id('source', 7) }),
    evidence(8, { ...PUBLIC, source: id('source', 8) }),
  ];
}

/** The public face of the registry, as the pages see it. */
export const publicRecords = (records: RegistryRecord[] = registry()): PublicRecord[] => projectPublic(records);

/** The CSL-JSON of the world's entries, by entry id: authors, years and keywords the search tests rely on. */
const CSL: Record<number, Record<string, unknown>> = {
  1: { type: 'manuscript', title: 'A fixture chronicle', author: [{ family: 'Doe', given: 'Jane' }], issued: { 'date-parts': [[1991]] }, keyword: 'frontiers; surveying' },
  2: { type: 'map', title: 'A fixture atlas sheet', author: [{ family: 'Roë', given: 'Rob' }, { family: 'Poe', given: 'Pat' }], issued: { 'date-parts': [[1992]] } },
  9: { type: 'book', title: 'The Roads of the Province', author: [{ family: 'Marsh', given: 'Odo' }], issued: { 'date-parts': [[1955]] }, keyword: 'roads, Dacia' },
  10: { type: 'book', title: 'The Roads of the Province', edition: '2', author: [{ family: 'Marsh', given: 'Odo' }], issued: { 'date-parts': [[1972]] } },
  11: { type: 'book', title: 'Les routes de la province', author: [{ family: 'Marsh', given: 'Odo' }], translator: [{ family: 'Lenoir', given: 'Paul' }], issued: { 'date-parts': [[1980]] } },
};

export const cslFor = (entryId: string) => {
  const n = Number(entryId.split('-').pop());
  return { id: entryId, ...(CSL[n] ?? { type: 'book', title: `Entry ${n}`, author: [{ literal: 'Anon' }] }) } as import('../../../src/essays/citations.js').CslItem;
};
