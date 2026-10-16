import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../../../src/shell/contrast.js';
import { DECORATIVE, MIN_RATIO, PAIRS, failingPairs, uncoveredColours } from '../../../src/shell/styles/contrast-pairs.js';
import { readTokens } from '../support/tokens.js';

/*
 * The expected values come from the WCAG 2.x definition worked by hand, not from the code under test:
 * black on white is 21:1; #777777 on white is the textbook 4.48:1 that just fails AA for text and
 * #767676 the 4.54:1 that just passes.
 */
describe('contrastRatio (WCAG 2.x)', () => {
  it('gives 21 for black on white, in either order, and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#a1b2c3', '#a1b2c3')).toBeCloseTo(1, 5);
  });

  it('puts #777777 just under 4.5 and #767676 just over it on white', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('accepts the three-digit hex form', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });
});

describe('token file contrast (FR-011, SC-006)', () => {
  const css = readFileSync('src/shell/styles/tokens.css', 'utf8');

  it('uses 4.5:1 for text and 3:1 for UI and focus', () => {
    expect(MIN_RATIO).toEqual({ text: 4.5, ui: 3 });
  });

  it('is met by every declared pair in the dark scheme', () => {
    expect(failingPairs(readTokens(css).dark, PAIRS)).toEqual([]);
  });

  it('is met by every declared pair in the light scheme', () => {
    expect(failingPairs(readTokens(css).light, PAIRS)).toEqual([]);
  });

  it('names a pair that falls below its minimum, so a bad token cannot slip through', () => {
    const weak = { canvas: '#111111', ink: '#444444', 'ink-muted': '#eeeeee', panel: '#111111', 'panel-raised': '#111111', link: '#eeeeee', 'link-visited': '#eeeeee', focus: '#222222' };
    const failures = failingPairs(weak, PAIRS.filter((p) => ['ink', 'focus'].includes(p.fg) && p.bg === 'canvas'));
    expect(failures.map((f) => f.split(' ')[0])).toEqual(['ink', 'focus']);
  });

  it('covers every colour token: each is in a pair or declared decorative', () => {
    const { dark, light } = readTokens(css);
    expect(uncoveredColours(dark, PAIRS, DECORATIVE)).toEqual([]);
    expect(uncoveredColours(light, PAIRS, DECORATIVE)).toEqual([]);
  });

  it('names a colour token that nobody tested, so a new colour cannot skip the check', () => {
    const tokens = { ink: '#eeeeee', canvas: '#111111', brand: '#123456', line: 'rgb(1 2 3 / 0.2)', 'space-1': '0.25rem' };
    expect(uncoveredColours(tokens, PAIRS, DECORATIVE)).toEqual(['brand']);
  });
});
