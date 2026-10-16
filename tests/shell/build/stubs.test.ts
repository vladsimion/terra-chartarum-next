import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DESTINATIONS } from '../../../src/shell/destinations.js';
import { builtSite, readPage } from '../support/build.js';

let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

const file = (href: string) => path.join(href.replace(/^\/|\/$/g, ''), 'index.html');

describe('stub pages (US1 AC4, FR-015)', () => {
  const stubs = DESTINATIONS.filter((d) => d.status === 'stub');

  it('exist for every destination that is still a stub (there are stubs to test)', () => {
    expect(stubs.length).toBeGreaterThan(0);
    for (const d of stubs) expect(existsSync(path.join(dir, file(d.href))), d.href).toBe(true);
  });

  it('say "in preparation", carry data-stub with the destination id, and sit in the shell', () => {
    for (const d of stubs) {
      const page = readPage(dir, file(d.href));
      expect(page.querySelector(`main [data-stub="${d.id}"]`), d.id).not.toBeNull();
      expect(page.querySelector('main')?.text.toLowerCase(), d.id).toContain('in preparation');
      expect(page.querySelector('h1')?.text.trim(), d.id).toBe(d.label);
      expect(page.querySelector('a.skip-link'), d.id).not.toBeNull();
    }
  });

  it('are not generated for a destination whose owner has built the page', () => {
    for (const d of DESTINATIONS.filter((x) => x.status === 'built')) {
      expect(readPage(dir, file(d.href)).querySelector("main [data-stub]"), d.id).toBeNull();
    }
  });
});
