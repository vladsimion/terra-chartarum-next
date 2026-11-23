import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Spec 009 T014a (US2 scenario 5): the interaction components enhance progressively. Every `:has()`
 * selector and every `animation-timeline` declaration in them sits inside an `@supports` block, so a
 * browser without the feature gets the base rules alone: all content visible, every control a plain
 * form. Only the component's <style> blocks are read; the test knows nothing about how the rules render.
 */
const DIRS = ['src/essays/components', 'src/essays/bespoke'];
const files = DIRS.filter((d) => existsSync(d)).flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.astro')).map((f) => path.join(d, f)));

/** The character ranges of every `@supports { ... }` block, braces balanced. */
function supportsRanges(css: string): [number, number][] {
  const ranges: [number, number][] = [];
  const re = /@supports\b[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    ranges.push([m.index, i]);
  }
  return ranges;
}

const inside = (ranges: [number, number][], at: number) => ranges.some(([a, b]) => at >= a && at < b);

/** The CSS of a component: its <style> blocks joined, the frontmatter and markup left out. */
const styles = (source: string) => [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

describe('the interaction components enhance progressively', () => {
  it('finds the three shared components', () => {
    for (const name of ['Timeline', 'CompareSlider', 'Scrollytelling']) expect(files, `${name}.astro`).toContain(path.join('src/essays/components', `${name}.astro`));
  });

  /*
   * The squeeze is the lapidarium's one control, so it must not be an enhancement: flipped by
   * `:has()`, it did nothing on an iPhone while passing in desktop Chrome (reported 2026-11-22).
   * The checkbox's sibling does the flip, which every browser with a checkbox supports.
   */
  it('flips the squeeze with a sibling selector, not :has()', () => {
    const css = styles(readFileSync('src/essays/bespoke/StoneGallery.astro', 'utf8'));
    expect(css).not.toMatch(/:has\(/);
    expect(css).toMatch(/\.lapidarium-switch:checked\s*~\s*\.lapidarium-stones\s*\{[^}]*--plate-paper/);
  });

  for (const file of files) {
    describe(file, () => {
      const css = styles(readFileSync(file, 'utf8'));
      const ranges = supportsRanges(css);

      it('keeps every :has() selector inside an @supports block', () => {
        for (const m of css.matchAll(/:has\(/g)) expect(inside(ranges, m.index!), `:has( at offset ${m.index} is outside @supports`).toBe(true);
      });

      it('keeps every animation-timeline declaration inside an @supports block', () => {
        for (const m of css.matchAll(/animation-timeline\s*:/g)) expect(inside(ranges, m.index!), `animation-timeline at offset ${m.index} is outside @supports`).toBe(true);
      });

      it('never hides content in the base rules', () => {
        const base = ranges.reduceRight((text, [a, b]) => text.slice(0, a) + text.slice(b), css);
        expect(base).not.toMatch(/display\s*:\s*none/);
        expect(base).not.toMatch(/visibility\s*:\s*hidden/);
      });
    });
  }
});
