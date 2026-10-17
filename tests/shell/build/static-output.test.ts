import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite } from '../support/build.js';
import { staticOutputProblems } from '../support/static-output.js';

/*
 * FR-008 and the dark-scheme edge case: the build is static files only (HTML, CSS and assets), the
 * shell ships no client JavaScript, and no filter is applied to imagery.
 */
describe('staticOutputProblems', () => {
  const fixture = (files: Record<string, string>) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'static-out-'));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), text);
    }
    return dir;
  };

  it('is silent for HTML, CSS and assets with no script and no filter', () => {
    const dir = fixture({ 'index.html': '<html><body><p>x</p></body></html>', '_astro/a.css': 'a{color:red}', 'favicon.svg': '<svg/>' });
    expect(staticOutputProblems(dir)).toEqual([]);
    rmSync(dir, { recursive: true });
  });

  it('reports a server entry, client JavaScript, a script tag and an image filter', () => {
    const dir = fixture({
      'index.html': '<html><body><script>alert(1)</script></body></html>',
      '_worker.js/index.js': 'export default {}',
      '_astro/app.js': 'console.log(1)',
      '_astro/a.css': 'img{filter:invert(1)}',
    });
    expect(staticOutputProblems(dir)).toEqual([
      'script file _astro/app.js',
      'script file _worker.js/index.js',
      'script tag in index.html',
      'filter in _astro/a.css',
    ]);
    rmSync(dir, { recursive: true });
  });
});

describe('the built site', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await builtSite();
  }, 180_000);

  it('is static files only, with no client JavaScript and no image filter', () => {
    expect(staticOutputProblems(dir)).toEqual([]);
  });
});
