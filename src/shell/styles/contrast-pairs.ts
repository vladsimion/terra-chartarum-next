import { ACCENT_SLOTS } from '../accents.js';
import { contrastRatio } from '../contrast.js';

/**
 * The foreground/background pairs the shell uses (contracts/tokens.md). Every colour token is in at
 * least one pair or listed in DECORATIVE; the test resolves each pair in both colour schemes and
 * fails any below its minimum (FR-011).
 */
export type PairKind = 'text' | 'ui';

export interface Pair {
  fg: string;
  bg: string;
  kind: PairKind;
  note: string;
}

/** WCAG AA: 4.5:1 for text, 3:1 for UI components and focus indicators. */
export const MIN_RATIO: Record<PairKind, number> = { text: 4.5, ui: 3 };

const SURFACES = ['canvas', 'panel', 'panel-raised'] as const;

const on = (fgs: readonly string[], kind: PairKind, note: string): Pair[] =>
  fgs.flatMap((fg) => SURFACES.map((bg) => ({ fg, bg, kind, note })));

export const PAIRS: readonly Pair[] = [
  ...on(['ink'], 'text', 'running text'),
  ...on(['ink-muted'], 'text', 'captions, metadata'),
  ...on(['link', 'link-visited'], 'text', 'links'),
  ...on(['focus'], 'ui', 'visible focus ring'),
  { fg: 'print-ink', bg: 'print-paper', kind: 'text', note: 'printed text' },
  ...on(ACCENT_SLOTS.map((s) => `accent-${s}`), 'text', 'accent text and marks on any surface'),
];

/** Colour tokens that carry no text or control and so need no pair: a hairline rule, and the alias of the active accent. */
export const DECORATIVE: readonly string[] = ['line', 'accent'];

/** Pairs below their minimum in one scheme, as "fg on bg: ratio < minimum". Throws if a token is missing. */
export function failingPairs(tokens: Record<string, string>, pairs: readonly Pair[] = PAIRS): string[] {
  const failures: string[] = [];
  for (const { fg, bg, kind } of pairs) {
    for (const name of [fg, bg]) {
      if (!(name in tokens)) throw new Error(`contrast pair uses --${name}, which is not defined`);
    }
    const ratio = contrastRatio(tokens[fg] as string, tokens[bg] as string);
    if (ratio < MIN_RATIO[kind]) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${MIN_RATIO[kind]} (${kind})`);
  }
  return failures;
}

const isColour = (value: string): boolean => /^#[0-9a-fA-F]{3,8}$/.test(value) || /^(rgb|hsl|oklch|color)\(/.test(value);

/** Colour tokens that are in no pair and not declared decorative: untested colours. */
export function uncoveredColours(
  tokens: Record<string, string>,
  pairs: readonly Pair[] = PAIRS,
  decorative: readonly string[] = DECORATIVE,
): string[] {
  const covered = new Set([...decorative, ...pairs.flatMap((p) => [p.fg, p.bg])]);
  return Object.entries(tokens)
    .filter(([name, value]) => isColour(value) && !covered.has(name))
    .map(([name]) => name);
}
