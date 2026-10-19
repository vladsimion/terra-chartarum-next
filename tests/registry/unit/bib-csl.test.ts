import { describe, expect, it } from 'vitest';
import { cslFilesFor, cslText, entry, hitsOf } from '../support/bibliography.js';

/* Spec 006 T009 (FR-014): an entry's CSL-JSON file is one item with a type, a title and the entry's stable id. */
describe('BIB-CSL', () => {
  const e = entry(1);
  const check = (text: string | null, record = e) => hitsOf('BIB-CSL', [record], { cslFiles: new Map(text === null ? [] : [[String(record.csl), text]]) });

  it('passes one item with a type, a title and the entry’s id, as an object or a one-item list', () => {
    expect(check(cslText(e))).toEqual([]);
    expect(check(`[${cslText(e)}]`)).toEqual([]);
    expect(hitsOf('BIB-CSL', [e], { cslFiles: cslFilesFor(e) })).toEqual([]);
  });

  it('flags a file that is not there', () => {
    expect(check(null).map((v) => [v.field, v.severity])).toEqual([['csl', 'error']]);
  });

  it('flags text that does not parse', () => {
    expect(check('{ nope')).toHaveLength(1);
  });

  it('flags a list of more than one item, and an empty one', () => {
    expect(check(`[${cslText(e)},${cslText(e)}]`)).toHaveLength(1);
    expect(check('[]')).toHaveLength(1);
  });

  it('flags an item with no type or no title', () => {
    expect(check(cslText(e, { type: undefined }))).toHaveLength(1);
    expect(check(cslText(e, { title: undefined }))).toHaveLength(1);
    expect(check(cslText(e, { title: '  ' }))).toHaveLength(1);
  });

  it('flags an id that is not the entry’s stable id', () => {
    expect(check(cslText(e, { id: 'smith1994' })).map((v) => v.field)).toEqual(['csl']);
    expect(check(cslText(e, { id: undefined }))).toHaveLength(1);
  });

  it('is an error at every lifecycle', () => {
    expect(hitsOf('BIB-CSL', [entry(1, { lifecycle: 'proposed' })], { cslFiles: new Map() }).map((v) => v.severity)).toEqual(['error']);
  });

  it('says nothing when the files were not read (a caller that has none), or the entry names none', () => {
    expect(hitsOf('BIB-CSL', [e])).toEqual([]);
    expect(hitsOf('BIB-CSL', [entry(1, { csl: undefined })], { cslFiles: new Map() })).toEqual([]);
  });
});
