import { describe, expect, it } from 'vitest';
import { applyFilters, buildIndex } from '../../../src/bibliography/index-data.js';
import { projectPublic } from '../../../src/registry/project.js';
import { generateBibliographyRegistry, generatedCsl } from '../../../src/registry/synthetic.js';
import type { CslItem } from '../../../src/essays/citations.js';

/* Spec 006 T022 (SC-005): filters and search answer in under 200 ms on a 1,000-entry set. */
const records = projectPublic(generateBibliographyRegistry(1000, 1));
const byId = new Map(records.filter((r) => r.family === 'bibliography_entry').map((r) => [r.id, r]));
// the generator's essays are held, so no generated entry names a public essay; give them some, to time the essay filter
const index = buildIndex(records, (id) => generatedCsl(byId.get(id) as never, 1) as unknown as CslItem).map((e, i) => ({ ...e, essays: i % 5 === 0 ? [`essay-${i % 40}`] : [] }));

const time = (run: () => unknown): number => {
  const start = performance.now();
  run();
  return performance.now() - start;
};

describe('the bibliography index at 1,000 entries', () => {
  it('has the public ones, which is a good share of them', () => {
    expect(index.length).toBeGreaterThan(300);
  });

  it('filters by section, by essay and by search each in under 200 ms', () => {
    const essay = 'essay-0';
    for (const filters of [
      { sections: ['primary_sources', 'historical_maps'], essays: [], q: '' },
      { sections: [], essays: [essay], q: '' },
      { sections: [], essays: [], q: 'marsh' },
      { sections: ['specialised_studies'], essays: [], q: 'dacia 16' },
    ]) {
      expect(time(() => applyFilters(index, filters)), JSON.stringify(filters)).toBeLessThan(200);
    }
  });
});
