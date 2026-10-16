import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';

/** Rules Stylelint reports for a file, using the repository's own configuration. */
async function rulesFor(file: string): Promise<string[]> {
  const result = await stylelint.lint({ files: file, configFile: '.stylelintrc.json' });
  return [...new Set(result.results.flatMap((r) => r.warnings.map((w) => w.rule)))].sort();
}

describe('raw values outside the token file (SC-004, FR-003)', () => {
  it('accepts a stylesheet that uses only tokens', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/good.css')).toEqual([]);
  });

  it('reports a hex colour', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/bad-hex.css')).toEqual(['color-no-hex']);
  });

  it('reports a colour function and a named colour', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/bad-colour.css')).toEqual(['color-named', 'function-disallowed-list']);
  });

  it('reports a length literal in a spacing, size or radius property, but not 0, 100%, tokens or calc over tokens', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/bad-length.css')).toEqual(['declaration-property-value-disallowed-list']);
    expect(await rulesFor('tests/shell/fixtures/css/good.css')).toEqual([]);
  });

  it('reports a filter, so imagery is never inverted or recoloured in the dark colour scheme', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/bad-filter.css')).toEqual(['property-disallowed-list']);
  });

  it('looks inside <style> in .astro files', async () => {
    expect(await rulesFor('tests/shell/fixtures/css/bad.astro')).toEqual(['color-no-hex', 'declaration-property-value-disallowed-list']);
    expect(await rulesFor('tests/shell/fixtures/css/good.astro')).toEqual([]);
  });

  it('leaves the token file alone, and finds nothing wrong in the real source tree', async () => {
    const result = await stylelint.lint({ files: 'src/**/*.{css,astro}', configFile: '.stylelintrc.json' });
    expect(result.results.flatMap((r) => r.warnings.map((w) => `${r.source}: ${w.rule}`))).toEqual([]);
    expect(result.results.some((r) => r.source?.endsWith('tokens.css'))).toBe(true);
  });
});
