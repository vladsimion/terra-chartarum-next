import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { inject } from 'vitest';

/** The folder of the essay fixture registry built once for the whole run (tests/essays/support/global-setup.ts). */
export function builtEssaysSite(): string {
  return inject('essaysSiteDir');
}

/** A built page by its site path (`/essays/<slug>/`), parsed; the raw HTML is on `.html`. */
export function readEssayPage(sitePath: string): { html: string; root: HTMLElement } {
  const html = readFileSync(path.join(builtEssaysSite(), sitePath, 'index.html'), 'utf8');
  return { html, root: parse(html) };
}
