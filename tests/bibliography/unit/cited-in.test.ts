import { describe, expect, it } from 'vitest';
import { citationsOf, editionsOf, isFindingAid } from '../../../src/bibliography/cited-in.js';
import { publicEntries } from '../../../src/bibliography/entry-public.js';
import { evidence, source } from '../../registry/support/builders.js';
import { HELD, PUBLIC } from '../../registry/support/bibliography.js';
import { E, id, publicRecords, registry } from '../support/world.js';

/*
 * Spec 006 T020 (FR-002, FR-010, FR-015; scenarios 1, 4, 5): where an entry is cited, by which route,
 * and which public editions and translations it has. Public records only.
 */
const records = publicRecords();
const cited = (n: number) => citationsOf(E(n), records);
const names = (n: number, route: 'listed' | 'evidence') => cited(n).filter((c) => c.route === route).map((c) => `${c.citing.family}:${c.citing.slug}`);

describe('citationsOf: the listed route', () => {
  it('names the essay, map and cartographer that list an entry, sorted by title', () => {
    expect(names(1, 'listed')).toEqual(['cartographer:a-cartographer', 'map:frontier-map', 'essay:frontier']);
  });

  it('names a dataset and a layer that list an entry, with the layer that uses the dataset', () => {
    const found = cited(9).filter((c) => c.route === 'listed');
    expect(found.map((c) => c.citing.family).sort()).toEqual(['dataset', 'layer']);
    const dataset = found.find((c) => c.citing.family === 'dataset')!;
    expect(dataset.citing.layers).toEqual([{ slug: 'a-layer', title: 'A layer' }]);
  });

  it('leaves out a held citing record', () => {
    expect(cited(4)).toEqual([]);
  });
});

describe('citationsOf: the evidence route', () => {
  it('names the citing essay with the locator and its state', () => {
    const [found] = cited(1).filter((c) => c.route === 'evidence');
    expect(found).toMatchObject({ citing: { family: 'essay', slug: 'related' }, locator: { value: 'p. 12', state: 'pending' } });
  });

  it('marks a locator that is not verified as pending, in words', () => {
    const [found] = cited(1).filter((c) => c.route === 'evidence');
    expect(found?.verification).toEqual({ state: 'pending', label: 'Locator pending verification' });
  });

  it('shows who verified a verified locator and when', () => {
    const [found] = cited(2);
    expect(found?.route).toBe('evidence');
    expect(found?.verification).toEqual({ state: 'verified', by: 'A. Editor', on: '2026-10-10', label: 'Verified by A. Editor on 2026-10-10' });
  });

  it('skips a finding aid, a held Source and held Evidence', () => {
    expect(cited(8)).toEqual([]);
    expect(cited(6)).toEqual([]);
    expect(cited(7)).toEqual([]);
  });

  it('is one citation per piece of evidence, so two locators in one essay are both shown', () => {
    const two = registry().map((r) => (r.id === id('essay', 2) ? { ...r, evidence: [id('evidence', 1), id('evidence', 9)] } : r));
    two.push(evidence(9, { ...PUBLIC, source: id('source', 1), locator: { value: 'p. 99', state: 'pending', proposed_by: 'person' } }));
    const found = citationsOf(E(1), publicRecords(two)).filter((c) => c.route === 'evidence');
    expect(found.map((c) => c.locator?.value).sort()).toEqual(['p. 12', 'p. 99']);
  });
});

describe('citationsOf: both routes together', () => {
  it('labels each route, listed ones after the evidence ones are not mixed up', () => {
    expect(new Set(cited(1).map((c) => c.route))).toEqual(new Set(['listed', 'evidence']));
  });

  it('returns nothing for an entry nobody cites', () => {
    expect(cited(3)).toEqual([]);
  });
});

describe('editionsOf', () => {
  const pub = publicEntries(records);
  const of = (n: number) => editionsOf(E(n), pub).map((r) => `${r.relation}:${r.entry.slug}`);

  it('lists the public editions and translations of a work, in either direction, with the relation', () => {
    expect(of(9)).toEqual(['has_edition:bibliography_entry-10']);
    expect(of(10)).toEqual(['edition_of:bibliography_entry-9', 'has_translation:bibliography_entry-11']);
    expect(of(11)).toEqual(['translation_of:bibliography_entry-10']);
  });

  it('leaves out an edition that is not public (a held original, an entry nothing cites)', () => {
    expect(of(12)).toEqual([]);
  });

  it('has none for an entry with no relation', () => {
    expect(of(1)).toEqual([]);
  });
});

describe('isFindingAid (FR-015)', () => {
  it('is true when a Source that points at the entry is flagged as a finding aid', () => {
    expect(isFindingAid(E(8), records)).toBe(true);
  });

  it('is false for an entry whose Sources are ordinary, or that has none', () => {
    expect(isFindingAid(E(1), records)).toBe(false);
    expect(isFindingAid(E(3), records)).toBe(false);
  });

  it('is true when any one of several Sources is flagged', () => {
    const two = registry();
    two.push(source(20, { ...PUBLIC, entry: E(1), is_finding_aid: true }));
    expect(isFindingAid(E(1), publicRecords(two))).toBe(true);
  });

  it('does not let a held Source decide: it is not in the public records', () => {
    const held = registry();
    held.push(source(21, { ...HELD, entry: E(3), is_finding_aid: true }));
    expect(isFindingAid(E(3), publicRecords(held))).toBe(false);
  });

  it('keeps the evidence of an ordinary Source on the same entry, and shows none from the finding aid', () => {
    const both = registry();
    both.push(source(22, { ...PUBLIC, entry: E(2), is_finding_aid: true }));
    both.push(evidence(22, { ...PUBLIC, source: id('source', 22) }));
    // essay 2 cites the finding aid's evidence as well (the gate forbids it; the derivation must not trust that)
    const world = both.map((r) => (r.id === id('essay', 2) ? { ...r, evidence: [...(r.evidence as string[]), id('evidence', 22)] } : r));
    const found = citationsOf(E(2), publicRecords(world)).filter((c) => c.route === 'evidence');
    expect(found.map((c) => c.locator?.value)).toEqual(['pp. 40–42']);
  });
});
