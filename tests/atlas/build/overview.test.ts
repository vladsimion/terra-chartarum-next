import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAtlas } from '../../../src/atlas/build/write-outputs.js';
import { FIXTURE, tempDir, tree } from '../support/variant.js';

/*
 * Spec 005 T059 (FR-016, contracts/build-outputs.md): the build writes one SVG overview per
 * collection that has default layers, from those layers only.
 */
async function built() {
  const outDir = tempDir('atlas-overview');
  const result = await buildAtlas({ root: FIXTURE, outDir });
  return { outDir, ...result };
}

describe('the overview files', () => {
  it('writes one for a collection with default layers, and none for one without', async () => {
    const { outDir, written, failures } = await built();
    expect(failures).toEqual([]);
    expect(written.filter((f) => f.startsWith('data/overview/'))).toEqual(['data/overview/roman-dacia-fixtures.svg']);
    expect(Object.keys(tree(outDir)).some((f) => f.includes('nothing-runnable-yet'))).toBe(false);
  });

  it('draws the default layers only, with their patterns', async () => {
    const { outDir } = await built();
    const svg = readFileSync(path.join(outDir, 'data/overview/roman-dacia-fixtures.svg'), 'utf8');
    expect(svg).toContain('The frontier line');
    expect(svg).toContain('Present-day boundaries');
    expect(svg).not.toContain('Dacian settlements');
    expect(svg).toContain('data-class="documentary"');
    expect(svg).toContain('data-class="reference"');
  });

  it('is byte-identical across runs', async () => {
    const a = await built();
    const b = await built();
    expect(readFileSync(path.join(a.outDir, 'data/overview/roman-dacia-fixtures.svg'))).toEqual(readFileSync(path.join(b.outDir, 'data/overview/roman-dacia-fixtures.svg')));
  });
});
