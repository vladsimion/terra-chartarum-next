import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'astro';
import { parse, type HTMLElement } from 'node-html-parser';

/**
 * Builds the site once per test process into a temporary directory and shares the result. Static
 * facts of the built HTML (landmarks, attributes, document order) are asserted on it without a
 * browser; behaviour that needs a browser (focus, layout, axe) is in the Playwright specs.
 */
let built: Promise<string> | undefined;

export function builtSite(): Promise<string> {
  built ??= (async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'shell-dist-'));
    await build({ root: process.cwd(), outDir, logLevel: 'error' });
    return outDir;
  })();
  return built;
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
