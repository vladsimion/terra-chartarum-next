import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * FR-009 and FR-014: at wide widths the menu's summary may be hidden only where ::details-content
 * is supported, because that is also what forces the closed list visible. Hidden anywhere else, a
 * browser without the selector would show no navigation and no way to open it. Playwright cannot
 * switch a browser feature off, so this reads the component's stylesheet.
 */
const source = readFileSync('src/shell/components/NavDisclosure.astro', 'utf8');
const wide = source.slice(source.indexOf('@media (min-width: 48rem)'));
const supports = wide.slice(wide.indexOf('@supports selector(::details-content)'));
const outsideSupports = wide.slice(0, wide.indexOf('@supports selector(::details-content)'));

describe('NavDisclosure wide-width styles', () => {
  it('has a wide-width block with a ::details-content support query', () => {
    expect(wide.length).toBeGreaterThan(0);
    expect(wide).toContain('@supports selector(::details-content)');
  });

  it('hides the summary only inside the support query', () => {
    expect(outsideSupports).not.toMatch(/summary\s*\{[^}]*display:\s*none/);
    expect(supports).toMatch(/summary\s*\{[^}]*display:\s*none/);
  });

  it('forces the list visible inside the same query', () => {
    expect(supports).toMatch(/::details-content\s*\{[^}]*content-visibility:\s*visible/);
  });
});
