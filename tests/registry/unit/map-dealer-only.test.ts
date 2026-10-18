import { describe, expect, it } from 'vitest';
import { evidence, source } from '../support/builders.js';
import { EVIDENCE, MAP, cartographer, hitsOf, neighbours } from '../support/maps.js';
import { place } from '../support/builders.js';

/* Spec 004 T014 (FR-016): an attribution is never supported by dealer or auction material alone. */
const world = (kinds: Record<string, string>) => [
  cartographer(),
  place(1),
  ...Object.entries(kinds).flatMap(([n, kind]) => [source(Number(n), { source_kind: kind }), evidence(Number(n), { source: `tc:tc:source:source-00000${n}`, target: { entity: MAP } })]),
];
const ev = (n: number) => `tc:tc:evidence:evidence-00000${n}`;

describe('MAP-DEALER-ONLY', () => {
  const check = (lifecycle: string, ids: string[], kinds: Record<string, string>) => hitsOf('MAP-DEALER-ONLY', lifecycle, { attribution_evidence: ids }, world(kinds));

  it('passes when one entry rests on a scholarly source', () => {
    expect(check('publishable', [ev(1), ev(2)], { 1: 'dealer', 2: 'scholarly' })).toEqual([]);
  });

  it('flags evidence that is only dealer or auction material: a warning at ready_for_build, an error at publishable', () => {
    const kinds = { 1: 'dealer', 2: 'auction' };
    expect(check('researching', [ev(1), ev(2)], kinds)).toEqual([]);
    expect(check('ready_for_build', [ev(1), ev(2)], kinds).map((v) => v.severity)).toEqual(['warning']);
    expect(check('publishable', [ev(1), ev(2)], kinds).map((v) => v.severity)).toEqual(['error']);
  });

  it('flags a map with no attribution evidence at publishable only', () => {
    expect(check('ready_for_build', [], { 1: 'scholarly' })).toEqual([]);
    expect(check('publishable', [], { 1: 'scholarly' }).map((v) => v.severity)).toEqual(['error']);
  });

  it('ignores evidence that does not resolve (REF-UNKNOWN reports it)', () => {
    expect(check('publishable', [ev(1), 'tc:tc:evidence:evidence-000099'], { 1: 'scholarly' })).toEqual([]);
  });

  it('keeps the fixtures consistent', () => {
    expect(EVIDENCE).toBe(ev(1));
    expect(neighbours()).toHaveLength(4);
  });
});
