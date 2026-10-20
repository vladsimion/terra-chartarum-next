import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseLedger } from '../../../src/essays/ledger.js';
import { legacyManifest, legacyParagraphs, missingParagraphs, type ManifestEntry } from '../../../src/essays/port-fidelity.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T010 (contracts/review-tooling.md): the port is the author's text, so every legacy paragraph must
 * be in the rebuilt body or covered by a ledger row. The legacy text itself is not committed: a manifest of
 * paragraph hashes stands in for it. Pure: text in, paragraphs and hashes out.
 */
const MDX = [
  '---', // 1
  'title: X', // 2
  '---', // 3
  "import Foo from '../Foo.astro';", // 4
  '', // 5
  '<Section id="a" title="A">', // 6
  '', // 7
  'First paragraph with *emphasis* and a [link](https://example.org/x).', // 8
  '', // 9
  '{/* a comment */}', // 10
  '', // 11
  '<figure><svg viewBox="0 0 1 1"><line x1="1" /></svg></figure>', // 12
  '', // 13
  '| a | b |', // 14
  '| --- | --- |', // 15
  '| c | d |', // 16
  '', // 17
  'Second paragraph', // 18
  'spans _two_ lines.', // 19
  '', // 20
  '</Section>', // 21
].join('\n');

describe('legacyParagraphs', () => {
  it('gives the words of each paragraph, normalised, with its first and last line, and skips frontmatter, imports, comments and markup with no words', () => {
    expect(legacyParagraphs(MDX)).toEqual([
      { line: 8, end: 8, text: 'first paragraph with emphasis and a link.' },
      { line: 14, end: 16, text: 'a b c d' },
      { line: 18, end: 19, text: 'second paragraph spans two lines.' },
    ]);
  });
});

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

describe('legacyManifest', () => {
  it('is the line span and the SHA-256 of each paragraph\'s normalised words, and holds no text', () => {
    const manifest = legacyManifest(MDX);
    expect(manifest).toEqual([
      { line: 8, end: 8, sha256: sha('first paragraph with emphasis and a link.') },
      { line: 14, end: 16, sha256: sha('a b c d') },
      { line: 18, end: 19, sha256: sha('second paragraph spans two lines.') },
    ]);
    expect(JSON.stringify(manifest)).not.toContain('paragraph');
  });
});

describe('missingParagraphs', () => {
  const manifest = legacyManifest(MDX);
  // the same words, re-marked: a heading, different emphasis, a component around the table
  const rebuilt = ['---', 'title: Y', '---', '', 'First paragraph with emphasis and a [link](https://example.org/other).', '', '<PitTable pit="a" />', '', 'Second paragraph spans *two* lines.'].join('\n');

  it('finds a legacy paragraph by its words whatever the markup, and lists the ones that are gone', () => {
    expect(missingParagraphs(manifest, rebuilt, []).map((m) => m.line)).toEqual([14]);
    expect(missingParagraphs(manifest, rebuilt.replace('Second paragraph spans *two* lines.', 'Second paragraph, changed.'), []).map((m) => m.line)).toEqual([14, 18]);
  });

  it('does not list a paragraph that a ledger row covers, by any line it spans, in the row\'s own wording of lines', () => {
    for (const lines of ['15', '14 to 16', '2, 15', '1 to 3 and 16', '15 (the pit tables)']) {
      expect(missingParagraphs(manifest, rebuilt, [lines]).map((m) => m.line), lines).toEqual([]);
    }
    expect(missingParagraphs(manifest, rebuilt, ['13', '17 to 18']).map((m) => m.line)).toEqual([14]);
  });
});

describe('the committed manifest (docs/review/anchor-essay-legacy-paragraphs.json)', () => {
  it('is there, and from Draft on every legacy paragraph is in the rebuilt body or covered by a ledger row', async () => {
    const manifest = JSON.parse(readFileSync('docs/review/anchor-essay-legacy-paragraphs.json', 'utf8')) as ManifestEntry[];
    expect(manifest.length).toBeGreaterThan(100);
    expect(manifest.every((m) => /^[0-9a-f]{64}$/.test(m.sha256))).toBe(true);
    const { records } = await loadRegistry('.');
    const essay = records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
    if (!essay || !stageAtLeast(essay.stage, 'Draft')) return; // the body is not complete before Draft
    const body = readFileSync(essay.file.replace(/\.yaml$/, '.mdx'), 'utf8');
    const lines = parseLedger(readFileSync('docs/review/anchor-essay-changes.md', 'utf8')).map((r) => r.line);
    expect(missingParagraphs(manifest, body, lines).map((m) => `${m.line}-${m.end}`)).toEqual([]);
  });
});

