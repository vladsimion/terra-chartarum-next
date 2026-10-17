import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { ACCENT_SLOTS, DEFAULT_ACCENT, accentFor } from '../../../src/shell/accents.js';
import { readTokens } from '../support/tokens.js';

const css = readFileSync('src/shell/styles/tokens.css', 'utf8');

describe('accentFor (US2 AC 2.2, FR-012)', () => {
  it('defaults to gold, the house accent', () => {
    expect(DEFAULT_ACCENT).toBe('gold');
    expect(accentFor(undefined)).toBe('gold');
  });

  it('accepts each named slot', () => {
    for (const slot of ACCENT_SLOTS) expect(accentFor(slot)).toBe(slot);
  });

  it('throws for an unknown name, naming the valid slots, so a free colour cannot slip in', () => {
    expect(() => accentFor('#ff00ff')).toThrow(/unknown accent/i);
    expect(() => accentFor('chartreuse')).toThrow(ACCENT_SLOTS.join(', '));
  });
});

describe('the accent rules in the token file (FR-003, FR-012)', () => {
  const rules = postcss.parse(css).nodes.filter((n): n is postcss.Rule => n.type === 'rule' && n.selector.startsWith('[data-accent'));

  it('has one [data-accent] rule per slot', () => {
    expect(rules.map((r) => r.selector)).toEqual(ACCENT_SLOTS.map((s) => `[data-accent='${s}']`));
  });

  it('sets only --accent in each, to that slot', () => {
    for (const [i, slot] of ACCENT_SLOTS.entries()) {
      const decls = (rules[i] as postcss.Rule).nodes.filter((n): n is postcss.Declaration => n.type === 'decl');
      expect(decls.map((d) => [d.prop, d.value]), slot).toEqual([['--accent', `var(--accent-${slot})`]]);
    }
  });

  it('defines exactly the listed slots as colours, in both colour schemes', () => {
    const { dark, light } = readTokens(css);
    const named = (tokens: Record<string, string>) => Object.keys(tokens).filter((k) => k.startsWith('accent-')).map((k) => k.slice('accent-'.length));
    expect(named(dark)).toEqual([...ACCENT_SLOTS]);
    expect(named(light)).toEqual([...ACCENT_SLOTS]);
  });
});
