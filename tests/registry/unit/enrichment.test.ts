import { describe, expect, it } from 'vitest';
import { completenessOf, enrichmentQueue, renderQueueMarkdown } from '../../../src/registry/enrichment.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { layer, place, record } from '../support/builders.js';
import { FILLED, MAP, validMap } from '../support/maps.js';

/*
 * Spec 004 T045 (US5, research R7): what is incomplete in a map record and what to enrich first. Impact
 * (essays that cite it, held ones too), risk (gaps and unverified or unknown statuses) and reuse (layers
 * and places that refer to it) are ordinal bands of 1 to 3; the score is their product; ties by id.
 */
const essay = (n: number, maps: string[], over: Partial<RegistryRecord> = {}) => record('essay', n, { maps, ...over });
const without = (...fields: string[]) => Object.fromEntries(fields.map((f) => [f, undefined]));

describe('completenessOf', () => {
  it('counts a complete record: every displayed field recorded, no gaps', () => {
    expect(completenessOf(validMap())).toEqual({ id: MAP, lifecycle: 'researching', displayed: 13, recorded: 13, gaps: [], statuses: {} });
  });

  it('lists a field with no value and no stated status as a gap', () => {
    const c = completenessOf(validMap(without('language')));
    expect(c).toMatchObject({ recorded: 12, gaps: ['language'], statuses: {} });
  });

  it('reports the stated status of an empty field, and does not call it a gap', () => {
    const c = completenessOf(validMap({ ...without('significance', 'dimensions'), field_status: { significance: 'not_yet_verified', dimensions: 'not_applicable' } }));
    expect(c).toMatchObject({ recorded: 11, gaps: [], statuses: { significance: 'not_yet_verified', dimensions: 'not_applicable' } });
  });

  it('treats an empty list and a blank string as empty', () => {
    expect(completenessOf(validMap({ coverage: [], language: ' ' })).gaps).toEqual(['language', 'coverage']);
  });

  it('carries the lifecycle, held or public', () => {
    expect(completenessOf(validMap({ lifecycle: 'published' })).lifecycle).toBe('published');
  });
});

describe('the three factors', () => {
  const score = (map: RegistryRecord, others: RegistryRecord[] = []) => enrichmentQueue([map, ...others]).find((i) => i.id === map.id)!;

  it('impact is 1 with no essay, 2 with one, 3 with two or more, and a held essay counts', () => {
    expect(score(validMap()).impact).toBe(1);
    expect(score(validMap(), [essay(1, [MAP])]).impact).toBe(2);
    expect(score(validMap(), [essay(1, [MAP]), essay(2, [MAP], { release: 'held' })]).impact).toBe(3);
    expect(score(validMap(), [essay(1, [MAP, MAP]), essay(2, ['tc:tc:map:map-000009'])]).impact).toBe(2);
  });

  it('risk is 1 for none or one gap or doubtful status, 2 for two to four, 3 for five or more', () => {
    const risky = (n: number) => {
      const fields = ['language', 'significance', 'provenance', 'atlas_context', 'edition_state', 'title_original'].slice(0, n);
      return score(validMap(without(...fields))).risk;
    };
    expect([0, 1, 2, 4, 5, 6].map(risky)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('risk counts a not yet verified or unknown status like a gap, and not_applicable not at all', () => {
    const fields = without('language', 'significance', 'provenance');
    expect(score(validMap({ ...fields, field_status: { language: 'unknown', significance: 'not_yet_verified', provenance: 'not_applicable' } })).risk).toBe(2);
    expect(score(validMap({ ...fields, field_status: { language: 'not_applicable', significance: 'not_applicable', provenance: 'not_applicable' } })).risk).toBe(1);
  });

  it('reuse is 1 with nothing referring to the map, 2 with one layer or place, 3 with two or more', () => {
    const l = (n: number) => layer(n, { relations: [MAP] });
    const p = (n: number) => place(n, { relations: [MAP] });
    expect(score(validMap()).reuse).toBe(1);
    expect(score(validMap(), [l(1)]).reuse).toBe(2);
    expect(score(validMap(), [l(1), p(1)]).reuse).toBe(3);
    expect(score(validMap(), [place(2)]).reuse).toBe(1);
  });
});

describe('enrichmentQueue', () => {
  const other = (n: number, over: Partial<RegistryRecord> = {}) => validMap({ id: `tc:tc:map:map-00000${n}`, file: `content/map/map-00000${n}.yaml`, slug: `m${n}`, ...over });

  it('scores a record with no gaps and no references as 1', () => {
    expect(enrichmentQueue([validMap()])[0]).toMatchObject({ impact: 1, risk: 1, reuse: 1, score: 1 });
  });

  it('multiplies the three parts and shows each', () => {
    const records = [validMap(without('language', 'significance', 'provenance')), essay(1, [MAP]), layer(1, { relations: [MAP] })];
    expect(enrichmentQueue(records)[0]).toMatchObject({ id: MAP, impact: 2, risk: 2, reuse: 2, score: 8, gaps: ['language', 'significance', 'provenance'] });
  });

  it('orders by score, highest first, and ties by id', () => {
    const records = [other(3), other(2, without('language', 'significance')), other(1), essay(1, ['tc:tc:map:map-000003']), essay(2, ['tc:tc:map:map-000003'])];
    expect(enrichmentQueue(records).map((i) => [i.id.slice(-1), i.score])).toEqual([['3', 3], ['2', 2], ['1', 1]]);
    expect(enrichmentQueue([other(2), other(1)]).map((i) => i.id.slice(-1))).toEqual(['1', '2']);
  });

  it('includes held maps, because they are the work ahead, and ignores every other family', () => {
    const records = [other(1, { release: 'held' }), place(1), layer(1)];
    expect(enrichmentQueue(records).map((i) => i.id)).toEqual(['tc:tc:map:map-000001']);
  });

  it('is deterministic whatever the input order', () => {
    const records = [other(1, without('language')), other(2), other(3, without('language', 'significance')), essay(1, ['tc:tc:map:map-000002'])];
    expect(enrichmentQueue([...records].reverse())).toEqual(enrichmentQueue(records));
  });

  it('keeps the field list in step with the displayed fields', () => {
    expect(Object.keys(FILLED)).toHaveLength(13);
  });
});

describe('renderQueueMarkdown', () => {
  it('writes a table with the three parts and the product, in queue order', () => {
    const md = renderQueueMarkdown(enrichmentQueue([validMap(without('language', 'significance')), essay(1, [MAP])]));
    expect(md).toContain('| Rank | Map | Lifecycle | Impact | Risk | Reuse | Score | Gaps |');
    expect(md).toContain(`| 1 | ${MAP} | researching | 2 | 2 | 1 | 4 | language, significance |`);
  });

  it('says so when there is nothing to enrich', () => {
    expect(renderQueueMarkdown([])).toContain('No map records.');
  });
});
