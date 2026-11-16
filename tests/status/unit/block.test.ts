import { describe, expect, it } from 'vitest';
import { refreshBlocks, renderBlock, staleFiles, type StatusCounts } from '../../../src/status/block.js';

const counts: StatusCounts = { rules: 91, mutations: 120, entities: 292, errors: 0, warnings: 167 };

const page = (body: string) => `# Dossier\n\nIntro.\n\n<!-- status:begin -->\n${body}\n<!-- status:end -->\n\nHistory: 52 rules at acc8712.\n`;

describe('status block', () => {
  it('renders every count on its own line', () => {
    expect(renderBlock(counts)).toBe(
      ['- Registry rules: 91', '- Named mutations: 120', '- Entities: 292 (0 errors, 167 warnings)'].join('\n'),
    );
  });

  it('replaces only the text between the markers', () => {
    const refreshed = refreshBlocks(page('- Registry rules: 52'), counts);
    expect(refreshed).toBe(page(renderBlock(counts)));
    expect(refreshed).toContain('History: 52 rules at acc8712.');
  });

  it('refreshes every block in a file', () => {
    const twice = `${page('old')}${page('older')}`;
    expect(refreshBlocks(twice, counts)).toBe(`${page(renderBlock(counts))}${page(renderBlock(counts))}`);
  });

  it('leaves a file without markers untouched', () => {
    expect(refreshBlocks('No block here: 52 rules.', counts)).toBe('No block here: 52 rules.');
  });

  it('names the files whose block disagrees with the counts', () => {
    const files = [
      { path: 'fresh.md', text: page(renderBlock(counts)) },
      { path: 'stale.md', text: page('- Registry rules: 88') },
      { path: 'none.md', text: 'no block' },
    ];
    expect(staleFiles(files, counts)).toEqual(['stale.md']);
  });

  it('fails on an unclosed block instead of passing it silently', () => {
    expect(() => refreshBlocks('<!-- status:begin -->\n- Registry rules: 1\n', counts)).toThrow(/status:end/);
  });
});
