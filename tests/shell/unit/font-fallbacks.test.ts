import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { readTokens } from '../support/tokens.js';

/*
 * Layout shift from font swapping (ADR 0004: CLS <= 0.1): each web face has a fallback face
 * (Times New Roman, or Liberation Serif on Linux) scaled to the web face's metrics, so text sits
 * where it will when the real font arrives. The percentages are worked by hand from the published
 * font metrics (Capsize): size-adjust = (xWidthAvg/unitsPerEm of the web face) / (that of Times New
 * Roman: 832/2048), ascent and descent divided by the size adjustment.
 */
const EXPECTED: Record<string, { size: string; ascent: string; descent: string }> = {
  'Cinzel Fallback': { size: '136.86%', ascent: '71.31%', descent: '27.18%' },
  'Crimson Pro Fallback': { size: '98.56%', ascent: '90.96%', descent: '21.8%' },
  'EB Garamond Fallback': { size: '94.77%', ascent: '106.26%', descent: '31.44%' },
};

const faces = postcss
  .parse(readFileSync('src/shell/styles/fallbacks.css', 'utf8'))
  .nodes.filter((n): n is postcss.AtRule => n.type === 'atrule' && n.name === 'font-face');
const prop = (face: postcss.AtRule, name: string) => face.nodes?.find((n): n is postcss.Declaration => n.type === 'decl' && n.prop === name)?.value.replace(/['"]/g, '');

describe('fallback faces', () => {
  it('exist for Cinzel, Crimson Pro and EB Garamond with the worked-out metric overrides', () => {
    for (const [family, want] of Object.entries(EXPECTED)) {
      const face = faces.find((f) => prop(f, 'font-family') === family);
      expect(face, family).toBeDefined();
      expect(prop(face!, 'size-adjust'), family).toBe(want.size);
      expect(prop(face!, 'ascent-override'), family).toBe(want.ascent);
      expect(prop(face!, 'descent-override'), family).toBe(want.descent);
      expect(prop(face!, 'src'), family).toMatch(/local\(.?Times New Roman.?\).*local\(.?Liberation Serif.?\)/);
    }
  });

  it('cover Latin only, so Greek still falls through to the EB Garamond web face', () => {
    for (const face of faces) expect(prop(face, 'unicode-range'), prop(face, 'font-family')).toMatch(/U\+0020-007F/);
  });
});

describe('the font stacks', () => {
  const { dark } = readTokens(readFileSync('src/shell/styles/tokens.css', 'utf8'));

  it('put each fallback face immediately after its web face', () => {
    expect(dark['font-display']).toMatch(/'Cinzel Variable', 'Cinzel Fallback'/);
    expect(dark['font-body']).toMatch(/'Crimson Pro Variable', 'Crimson Pro Fallback'/);
    expect(dark['font-body']).toMatch(/'EB Garamond Variable', 'EB Garamond Fallback'/);
  });
});
