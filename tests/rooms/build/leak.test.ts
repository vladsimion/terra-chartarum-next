import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../../../src/registry/load.js';
import { scanOutput } from '../../../src/registry/leak-scan.js';
import { roomsSite } from '../support/build.js';

/*
 * Spec 007 T026 (SC-003, ADR 0015): no id, slug or title of the held essay, or of a map or layer only
 * a held record uses, appears on any room page, in the redirects or in the relations file. The scan
 * is the registry's own (`leak-scan.ts`). PRIV-LEAK is a scan of output, not a registry rule, so its
 * named mutations live here (as for specs 003 to 006).
 *
 * A map that is itself public but used only by a held essay is not held, so the scan cannot call it a
 * leak; that it is on no room page is a membership fact, asserted in room-page.test.ts.
 */
const ROOT = 'tests/rooms/fixtures/registry';
const FAMILIES = ['room', 'essay', 'map', 'layer', 'place', 'collection', 'cartographer', 'bibliography_entry', 'source'] as const;
const scan = async (dir: string) => scanOutput(dir, (await loadRegistry(ROOT)).records, { namedFamilies: FAMILIES });

const FILES = ['rooms/index.html', 'rooms/map/index.html', 'rooms/road/index.html', 'rooms/city/index.html', 'data/relations.json', '_redirects'];
/** A few real files, copied, so a mutation changes output and not the build. */
function sample(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'rooms-sample-'));
  for (const file of FILES) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    cpSync(path.join(roomsSite(), file), path.join(dir, file));
  }
  return dir;
}
const append = (dir: string, file: string, text: string) => writeFileSync(path.join(dir, file), `${readFileSync(path.join(dir, file), 'utf8')}\n${text}\n`);

describe('the built room pages', () => {
  it('has none of what is held, in any page, redirect or relation', async () => {
    expect(await scan(sample())).toEqual([]);
  });

  it('is checked over real files and real held content', async () => {
    for (const file of FILES) expect(readFileSync(path.join(roomsSite(), file), 'utf8').length, file).toBeGreaterThan(0);
    const { records } = await loadRegistry(ROOT);
    const held = records.filter((r) => r.release !== 'released' || r.lifecycle !== 'published');
    expect(held.map((r) => r.slug).sort()).toEqual(expect.arrayContaining(['held-layer', 'layer-in-build', 'zephyr-held-moraine']));
  });
});

describe('named leaks in real output are seen, and reported without repeating the value', () => {
  const MUTATIONS: { name: string; file: string; text: string; secret: RegExp }[] = [
    { name: 'the title of the held essay, in a room page', file: 'rooms/map/index.html', text: '<li>Zephyr Held Moraine Essay</li>', secret: /Zephyr Held Moraine Essay/ },
    { name: 'a link to the held essay, in a room page', file: 'rooms/map/index.html', text: '<a href="/essays/zephyr-held-moraine/">read</a>', secret: /\x00never/ },
    { name: 'the title of a held layer, in a room page', file: 'rooms/city/index.html', text: '<li>A held layer</li>', secret: /A held layer/ },
    { name: 'the address of a layer that is not public, in a room page', file: 'rooms/map/index.html', text: '<a href="/atlas/?l=held-layer">layer</a>', secret: /\x00never/ },
    { name: 'the id of the held essay, in the relations file', file: 'data/relations.json', text: '"tc:tc:essay:essay-000003": []', secret: /\x00never/ },
    { name: 'a redirect that names the held essay', file: '_redirects', text: '/essays/old-moraine/ /essays/zephyr-held-moraine/ 301', secret: /\x00never/ },
  ];

  for (const mutation of MUTATIONS) {
    it(mutation.name, async () => {
      const dir = sample();
      expect(await scan(dir)).toEqual([]);
      append(dir, mutation.file, mutation.text);
      const violations = await scan(dir);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.every((v) => v.rule === 'PRIV-LEAK' && v.severity === 'error' && v.file === mutation.file)).toBe(true);
      expect(JSON.stringify(violations)).not.toMatch(mutation.secret);
    });
  }
});
