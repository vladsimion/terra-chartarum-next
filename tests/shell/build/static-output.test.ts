import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite } from '../support/build.js';
import { ATLAS_CLIENT, BIBLIOGRAPHY_FILTERS, COLLECTION_VIEWER, staticOutputProblems } from '../support/static-output.js';

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

describe('staticOutputProblems with allowed feature scripts', () => {
  const feature = { scriptFiles: /^_astro\/viewer\.[\w-]+\.js$/, scriptPages: ['collection/'] };
  const fixture = (files: Record<string, string>) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'static-out-'));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), text);
    }
    return dir;
  };

  it('allows a listed script file and a script tag on a listed page', () => {
    const dir = fixture({ 'collection/a/index.html': '<script type="module" src="/_astro/viewer.abc.js"></script>', '_astro/viewer.abc.js': 'x' });
    expect(staticOutputProblems(dir, [], feature)).toEqual([]);
    rmSync(dir, { recursive: true });
  });

  it('still reports a script file or a script tag that is not listed, and a server entry', () => {
    const dir = fixture({
      'index.html': '<script src="/_astro/viewer.abc.js"></script>',
      '_astro/viewer.abc.js': 'x',
      '_astro/other.js': 'x',
      '_worker.js/index.js': 'x',
    });
    expect(staticOutputProblems(dir, [], feature)).toEqual(['script file _astro/other.js', 'script file _worker.js/index.js', 'script tag in index.html']);
    rmSync(dir, { recursive: true });
  });
});

describe('staticOutputProblems with several allowed features', () => {
  const fixture = (files: Record<string, string>) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'static-out-'));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), text);
    }
    return dir;
  };

  it('allows each feature its own files and pages, and no feature the others', () => {
    const dir = fixture({
      'atlas/index.html': '<script type="module" src="/_astro/index.astro_astro_type_script_index_0_lang.abc.js"></script>',
      '_astro/index.astro_astro_type_script_index_0_lang.abc.js': 'x',
      'vendor/maplibre/maplibre-gl.mjs': 'x',
      'collection/a/index.html': '<script type="module" src="/_astro/openseadragon.abc.js"></script>',
      '_astro/openseadragon.abc.js': 'x',
      'bibliography/index.html': '<script type="module" src="/_astro/index.astro_astro_type_script_index_0_lang.def.js"></script>',
      '_astro/index.astro_astro_type_script_index_0_lang.def.js': 'x',
      'bibliography/some-entry/index.html': '<p>no script on an entry page</p>',
      'about/index.html': '<script>1</script>',
    });
    expect(staticOutputProblems(dir, [], [COLLECTION_VIEWER, ATLAS_CLIENT, BIBLIOGRAPHY_FILTERS])).toEqual(['script tag in about/index.html']);
    rmSync(dir, { recursive: true });
  });
});

describe('the built site', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await builtSite();
  }, 180_000);

  it('is static files only, with no client JavaScript and no image filter', () => {
    // the over-budget fixture ships a script on purpose, to prove the Lighthouse budget fails
    // the collection viewer is the one feature that ships script, and only on a record page (spec 004 FR-004)
    // the Atlas is another, with MapLibre beside its worker (spec 005 FR-020), and the bibliography's filters are the last (spec 006 FR-008)
    expect(staticOutputProblems(dir, ['fixtures/budget/'], [COLLECTION_VIEWER, ATLAS_CLIENT, BIBLIOGRAPHY_FILTERS])).toEqual([]);
  });
});
