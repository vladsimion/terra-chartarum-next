import { describe, expect, it } from 'vitest';
import { hitsOf, neighbours } from '../support/maps.js';

/* Spec 004 T016 (FR-012): a map meant to be public needs makers that are public. */
describe('MAP-MAKER-HELD', () => {
  const heldMaker = { lifecycle: 'researching', release: 'held' };
  const publicMaker = { lifecycle: 'published', release: 'released' };
  const check = (lifecycle: string, over: Record<string, unknown>, maker: Record<string, unknown>) =>
    hitsOf('MAP-MAKER-HELD', lifecycle, over, neighbours({ maker }));

  it('passes a released map whose maker is published and released', () => {
    expect(check('publishable', { release: 'released' }, publicMaker)).toEqual([]);
  });

  it('flags a released map with a held maker: a warning at ready_for_build, an error at publishable', () => {
    expect(check('researching', { release: 'released' }, heldMaker)).toEqual([]);
    expect(check('ready_for_build', { release: 'released' }, heldMaker).map((v) => v.severity)).toEqual(['warning']);
    expect(check('publishable', { release: 'released' }, heldMaker).map((v) => [v.field, v.severity])).toEqual([['makers[0]', 'error']]);
  });

  it('allows a held map with a held maker', () => {
    expect(check('publishable', { release: 'held' }, heldMaker)).toEqual([]);
  });

  it('flags a released maker that is not yet published', () => {
    expect(check('publishable', { release: 'released' }, { lifecycle: 'verified', release: 'released' })).toHaveLength(1);
  });
});
