import { describe, expect, it } from 'vitest';
import { HELD, PUBLIC, atLifecycle, entry, pointing } from '../support/bibliography.js';

/* Spec 006 T007 (FR-006): every Source points at exactly one entry, and a public Source's entry is public. */
describe('SRC-ENTRY', () => {
  const check = (lifecycle: string, source: ReturnType<typeof pointing>, others = [entry(1, PUBLIC)]) => atLifecycle('SRC-ENTRY', lifecycle, source, others);

  it('passes a source that points at an entry', () => {
    expect(check('publishable', pointing(1, entry(1)))).toEqual([]);
  });

  it('says nothing about a source with no entry until ready_for_build, then warns, then errors at publishable', () => {
    expect(check('researching', pointing(1, null))).toEqual([]);
    expect(check('ready_for_build', pointing(1, null)).map((v) => [v.field, v.severity])).toEqual([['entry', 'warning']]);
    expect(check('publishable', pointing(1, null)).map((v) => [v.field, v.severity])).toEqual([['entry', 'error']]);
  });

  it('flags an entry that is not there, or is not an entry', () => {
    expect(check('publishable', pointing(1, null, { entry: 'tc:tc:bibliography_entry:bibliography_entry-000099' }))).toHaveLength(1);
    expect(check('publishable', pointing(1, null, { entry: 'tc:tc:place:place-000001' }))).toHaveLength(1);
  });

  it('flags a public source whose entry is held or not yet published', () => {
    const source = { ...pointing(1, entry(1)), release: 'released' };
    expect(check('published', source, [entry(1, HELD)]).map((v) => [v.field, v.severity])).toEqual([['entry', 'error']]);
    expect(check('published', source, [entry(1, { lifecycle: 'verified', release: 'released' })])).toHaveLength(1);
    expect(check('published', source, [entry(1, PUBLIC)])).toEqual([]);
  });

  it('allows a held source to point at a held entry', () => {
    expect(check('publishable', pointing(1, entry(1)), [entry(1, HELD)])).toEqual([]);
  });
});
