import { describe, expect, it } from 'vitest';
import { applyFilters, parseQuery } from '../../../src/collection/filter.js';
import { buildIndex } from '../../../src/collection/index-data.js';
import { projectPublic } from '../../../src/registry/project.js';
import { generateMapRegistry } from '../../../src/registry/synthetic.js';
import { rooms } from '../../registry/support/builders.js';

/* Spec 004 T033 (SC-004): the 500-record fixture filters in under 200 ms, with every facet set and a sort. */
describe('filtering 500 records', () => {
  const index = buildIndex(projectPublic([...rooms(), ...generateMapRegistry(500, 1)]));

  it('has 500 entries', () => {
    expect(index).toHaveLength(500);
  });

  it('takes under 200 ms for a view that uses every facet', () => {
    const view = parseQuery(`cartographer=${index[0]!.makers[0]!.id}&cartographer=${index[1]!.makers[0]!.id}&from=1500&to=1900&region=${index[0]!.regions[0]!}&witness=held&sort=maker`);
    const times: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const start = performance.now();
      applyFilters(index, view);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 2)]!).toBeLessThan(200);
  });
});
