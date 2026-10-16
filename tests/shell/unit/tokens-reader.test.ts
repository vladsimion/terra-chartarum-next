import { describe, expect, it } from 'vitest';
import { readTokens } from '../support/tokens.js';

describe('readTokens', () => {
  const css = `
    :root { --canvas: #111111; --ink: #eeeeee; --text: var(--ink); --space-1: 0.25rem; }
    @media (prefers-color-scheme: light) { :root { --canvas: #fafafa; --ink: #101010; } }
    [data-accent='gold'] { --accent: var(--accent-gold); }
  `;

  it('reads dark values from :root and lets the light media block override them', () => {
    const { dark, light } = readTokens(css);
    expect(dark.canvas).toBe('#111111');
    expect(light.canvas).toBe('#fafafa');
    expect(light['space-1']).toBe('0.25rem'); // not overridden: the light scheme inherits it
  });

  it('resolves var() references within each scheme', () => {
    const { dark, light } = readTokens(css);
    expect(dark.text).toBe('#eeeeee');
    expect(light.text).toBe('#101010');
  });

  it('ignores rules that are not :root, so accent selectors are not tokens', () => {
    expect(readTokens(css).dark.accent).toBeUndefined();
  });

  it('refuses a reference to a token that does not exist', () => {
    expect(() => readTokens(':root { --a: var(--missing); }')).toThrow(/missing/);
  });
});
