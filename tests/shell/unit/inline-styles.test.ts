import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findInlineStyles } from '../support/forbidden.js';

describe('inline style attributes (FR-003, SC-004)', () => {
  it('finds a style attribute in quoted and braced forms, with the line number', () => {
    const text = ['<p class="a">fine</p>', '<div style="color: red">x</div>', "<span\n  style='margin: 0'>y</span>", '<b style={{ top: 1 }}>z</b>'].join('\n');
    expect(findInlineStyles(text)).toEqual([2, 4, 5]);
  });

  it('ignores a <style> element, the word style in prose, and a data attribute', () => {
    const text = '<style>h1 { color: var(--ink); }</style>\n<p>The style of the map is baroque.</p>\n<p data-style="x">ok</p>';
    expect(findInlineStyles(text)).toEqual([]);
  });

  it('finds none anywhere in the shell sources or the page copy', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(astro|mdx|md|html)$/.test(entry.name)) files.push(full);
      }
    };
    for (const dir of ['src/shell', 'src/pages', 'src/content', 'src/essays']) {
      try {
        walk(dir);
      } catch {
        // the directory does not exist yet
      }
    }
    expect(files.flatMap((f) => findInlineStyles(readFileSync(f, 'utf8')).map((line) => `${f}:${line}`))).toEqual([]);
  });
});
