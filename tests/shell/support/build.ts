import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { inject } from 'vitest';

/**
 * The folder of the site built once for the whole test run (tests/shell/support/global-setup.ts).
 * Static facts of the built HTML (landmarks, attributes, document order) are asserted on it without
 * a browser; behaviour that needs a browser (focus, layout, axe) is in the Playwright specs.
 */
export function builtSite(): Promise<string> {
  return Promise.resolve(inject('siteDir'));
}

/** Every built HTML file, relative to the output directory, in a stable order. */
export function htmlFiles(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? htmlFiles(dir, path.join(rel, e.name)) : e.name.endsWith('.html') ? [path.join(rel, e.name)] : []))
    .sort();
}

export function readPage(dir: string, file: string): HTMLElement {
  return parse(readFileSync(path.join(dir, file), 'utf8'));
}
