import { createHash } from 'node:crypto';

/*
 * Port fidelity (spec 009, contracts/review-tooling.md): the rebuilt essay is the author's text, so each
 * legacy paragraph must appear in it or be covered by a ledger row. Pure: text in, paragraphs and hashes
 * out; the script reads the legacy clone, and the legacy text itself is never committed.
 */
export interface Paragraph {
  /** First and last line of the paragraph in the file it came from (1-based). */
  line: number;
  end: number;
  /** Its words: markup, link addresses and Markdown marks removed, white space collapsed, lower case. */
  text: string;
}

function normalise(chunk: string): string {
  return chunk
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split('\n')
    .filter((l) => !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l))
    .join(' ')
    .replace(/[*_`#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The paragraphs of an MDX file that have words: its frontmatter, imports and comment-only or markup-only chunks are skipped. */
export function legacyParagraphs(mdx: string): Paragraph[] {
  const lines = mdx.split('\n');
  let start = 0;
  if (lines[0]?.trim() === '---') {
    const close = lines.indexOf('---', 1);
    if (close > 0) start = close + 1;
  }
  const out: Paragraph[] = [];
  let first = -1;
  const flush = (last: number) => {
    if (first < 0) return;
    const chunk = lines.slice(first, last + 1);
    const from = first + 1;
    first = -1;
    if (chunk.every((l) => /^\s*import\s/.test(l))) return;
    const text = normalise(chunk.join('\n'));
    if (/\p{L}/u.test(text)) out.push({ line: from, end: from + chunk.length - 1, text });
  };
  for (let i = start; i < lines.length; i++) {
    if (lines[i]!.trim() === '') flush(i - 1);
    else if (first < 0) first = i;
  }
  flush(lines.length - 1);
  return out;
}

export interface ManifestEntry {
  line: number;
  end: number;
  sha256: string;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** The manifest committed in place of the legacy text: each paragraph's lines and the hash of its words. */
export function legacyManifest(mdx: string): ManifestEntry[] {
  return legacyParagraphs(mdx).map((p) => ({ line: p.line, end: p.end, sha256: sha256(p.text) }));
}

/** The legacy lines a ledger row names, from its own wording ("130, 1588", "2093 to 2200", "14 and 134 to 136 (the pit tables)"). */
function coveredLines(spec: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of spec.matchAll(/(\d+)(?:\s+to\s+(\d+))?/g)) out.push([Number(m[1]), Number(m[2] ?? m[1])]);
  return out;
}

/** The legacy paragraphs that are neither in the rebuilt body (by their words) nor covered by a ledger row's lines. */
export function missingParagraphs(manifest: readonly ManifestEntry[], rebuiltBody: string, ledgerLines: readonly string[]): ManifestEntry[] {
  const present = new Set(legacyManifest(rebuiltBody).map((m) => m.sha256));
  const ranges = ledgerLines.flatMap(coveredLines);
  return manifest.filter((m) => !present.has(m.sha256) && !ranges.some(([from, to]) => from <= m.end && to >= m.line));
}

