import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { buildAtlas } from '../../../src/atlas/build/write-outputs.js';
import { parseView, viewUrl } from '../../../src/atlas/view-url.js';
import { buildIndex } from '../../../src/atlas/index-data.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { scanOutput } from '../../../src/registry/leak-scan.js';
import { projectPublic } from '../../../src/registry/project.js';
import { initialState } from '../../../src/atlas/view-state.js';
import { atlasSite } from '../support/build.js';
import { copyFixture, editRecord, FIXTURE, tempDir } from '../support/variant.js';

/*
 * Spec 005 T064 (SC-005, ADR 0013): no id, slug or title of a layer, essay, place or collection that
 * is not public, and no private value, appears in any Atlas page, data file or address. The scan is
 * the registry's own (`leak-scan.ts`), asked for the families the Atlas carries; the named
 * mutations below put each kind of leak into real output and prove the scan sees it.
 *
 * PRIV-LEAK is a scan of output, not a registry rule, so its mutations live here and not in the
 * registry's rule-by-rule mutation table (tests/registry/support/mutations.ts).
 */
const FAMILIES = ['layer', 'collection', 'place', 'essay'] as const;
const PRIVATE_NOTE = 'Moraine seam private note';
const scan = async (dir: string, root: string) => scanOutput(dir, (await loadRegistry(root)).records, { namedFamilies: FAMILIES });

describe('the built Atlas', () => {
  it('has no held id, slug, title or private value in any page or data file', async () => {
    expect(await scan(atlasSite(), FIXTURE)).toEqual([]);
  });

  it('has none in the files the Atlas build writes, with a held collection and a private note added', async () => {
    const root = copyFixture();
    // a collection that is not released, listing public layers; and a note on a public layer that must stay private
    const held = parse(readFileSync(path.join(root, 'content/collection/collection-000001.yaml'), 'utf8')) as Record<string, unknown>;
    Object.assign(held, { id: 'tc:tc:collection:collection-000009', title: 'A held collection of frontier sheets', slug: 'held-frontier-sheets', release: 'held' });
    writeFileSync(path.join(root, 'content/collection/collection-000009.yaml'), stringify(held));
    editRecord(root, 'content/layer/layer-000001.yaml', (d) => { d.private = { editor_note: PRIVATE_NOTE }; });

    const outDir = tempDir('atlas-leak');
    const { failures, written } = await buildAtlas({ root, outDir });
    expect(failures).toEqual([]);
    expect(written.length).toBeGreaterThan(10);
    expect(await scan(outDir, root)).toEqual([]);
    expect(written.join(' ')).not.toMatch(/held-frontier-sheets/);
    expect(readFileSync(path.join(outDir, 'data/atlas-index.json'), 'utf8')).not.toMatch(/held-frontier-sheets|A held collection|collection-000009/);
  });

  it('puts no held slug in an address, and does not confirm that it exists', async () => {
    const { records } = await loadRegistry(FIXTURE);
    const index = buildIndex(projectPublic(records));
    // the slug table is what the build writes: live slugs of public layers and collections only
    const table = { layers: index.layers.map((l) => ({ slug: l.slug, history: [] })), collections: index.collections.map((c) => ({ slug: c.slug, history: [] })) };
    const parsed = parseView('?l=held-layer,frontier-line&lens=collection&c=held-collection', index, table);
    expect(parsed.state.active).toEqual(['frontier-line']);
    const url = viewUrl(parsed.state, index);
    expect(url).not.toMatch(/held/);
    // the same wording as for a slug that was never anywhere
    const never = parseView('?l=never-existed', index, table);
    const held = parseView('?l=held-layer', index, table);
    expect(held.report.skipped.map((s) => s.replace('held-layer', 'X'))).toEqual(never.report.skipped.map((s) => s.replace('never-existed', 'X')));
    expect(viewUrl(initialState(index), index)).not.toMatch(/held/);
  });
});

describe('named leaks in real output are seen, and reported without repeating the value', () => {
  /** A few real files, copied, so a mutation changes output and not the build. */
  function sample(): string {
    const dir = tempDir('atlas-mutated');
    const site = atlasSite();
    for (const file of ['atlas/index.html', 'data/atlas-index.json', 'data/place-index.json', 'data/layers/frontier-line.info.json']) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      cpSync(path.join(site, file), path.join(dir, file));
    }
    return dir;
  }
  const append = (dir: string, file: string, text: string) => writeFileSync(path.join(dir, file), `${readFileSync(path.join(dir, file), 'utf8')}\n${text}\n`);

  const MUTATIONS: { name: string; file: string; text: string; kind: string }[] = [
    { name: 'the title of a held layer in a page', file: 'atlas/index.html', text: '<li>A held layer</li>', kind: 'held-title' },
    { name: 'the slug of a held layer in the catalogue index', file: 'data/atlas-index.json', text: '{"slug": "held-layer"}', kind: 'held-slug' },
    { name: 'the id of a held layer in a data file', file: 'data/layers/frontier-line.info.json', text: 'tc:tc:layer:layer-000006', kind: 'held-id' },
    { name: 'the name of a held place in the place index', file: 'data/place-index.json', text: '"title": "A held place"', kind: 'held-title' },
    { name: 'the title of a held essay in a page', file: 'atlas/index.html', text: '<p>Zephyr Held Moraine Essay</p>', kind: 'held-title' },
    { name: 'a link to the page of a held essay', file: 'atlas/index.html', text: '<a href="/essays/zephyr-held-moraine/">read</a>', kind: 'held-path' },
  ];

  for (const mutation of MUTATIONS) {
    it(mutation.name, async () => {
      const dir = sample();
      expect(await scan(dir, FIXTURE)).toEqual([]);
      append(dir, mutation.file, mutation.text);
      const violations = await scan(dir, FIXTURE);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.every((v) => v.rule === 'PRIV-LEAK' && v.severity === 'error' && v.file === mutation.file)).toBe(true);
      // an id is what the scan reports for a held entity; every other value is redacted
      if (mutation.kind !== 'held-id') expect(JSON.stringify(violations)).not.toContain(mutation.text);
      expect(JSON.stringify(violations)).not.toMatch(/A held layer|A held place|Zephyr Held Moraine Essay/);
    });
  }
});
