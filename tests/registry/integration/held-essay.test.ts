import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { writeRegistry } from '../support/disk.js';
import { VALID_BODY, essayAt, world } from '../support/essays.js';

/*
 * Spec 003 T023 (US3, FR-006, SC-001): a held essay that references a public layer leaks nothing
 * through the registry's outputs, and the scan catches it if it ever shows up in built output.
 * The essay's own page, cards and exports belong to the site half (T038); the registry writes none.
 */
const HELD_ID = 'tc:tc:essay:essay-000001';
const HELD_TITLE = 'The Quiet Frontier Argument';
const HELD_SLUG = 'quiet-frontier';
const ANCHOR = 'the-hidden-section';
const PUBLIC_ID = 'tc:tc:essay:essay-000002';
const LAYER_ID = 'tc:tc:layer:layer-000001';

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

/** A held essay at Build that uses a public layer, and a public essay that lists the held one in relations[]. */
function registry(): RegistryRecord[] {
  const held = essayAt('Build', { title: HELD_TITLE, slug: HELD_SLUG, layers: [LAYER_ID] });
  const published = essayAt('Publish', {
    id: PUBLIC_ID,
    title: 'A Public Essay',
    slug: 'a-public-essay',
    file: 'content/essay/essay-000002.yaml',
    layers: [LAYER_ID],
    relations: [HELD_ID],
  });
  return [...world(true), held, published];
}

const BODY = `${VALID_BODY}\n\n## The Hidden Section\n`;

function built(): { root: string; out: string } {
  const root = writeRegistry(registry(), { bodies: { [HELD_ID]: BODY } });
  return { root, out: path.join(mkdtempSync(path.join(tmpdir(), 'held-out-')), 'site') };
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort();
}

const everything = (dir: string) => filesUnder(dir).map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n');

describe('registry build with a held essay', () => {
  it('passes the gate and writes only _redirects and the relations index', async () => {
    const { root, out } = built();
    const { code, out: log } = await run(['build', '--dir', root, '--out', out]);
    expect(code, log).toBe(0);
    // no page, card or export for the essay: those are the site's, and never exist for a held essay
    expect(filesUnder(out)).toEqual(['_redirects', 'data/relations.json']);
  });

  it('writes none of its title, slug, id or anchor', async () => {
    const { root, out } = built();
    await run(['build', '--dir', root, '--out', out]);
    const text = everything(out);
    for (const secret of [HELD_TITLE, HELD_SLUG, HELD_ID, 'essay-000001', ANCHOR, 'Hidden Section']) {
      expect(text, secret).not.toContain(secret);
    }
  });

  it('does not list the held essay as a referrer of the public layer, nor in a public essay’s relations', async () => {
    const { root, out } = built();
    await run(['build', '--dir', root, '--out', out]);
    const relations = JSON.parse(readFileSync(path.join(out, 'data/relations.json'), 'utf8'));
    expect(relations[LAYER_ID]).toEqual([PUBLIC_ID]);
    expect(JSON.stringify(relations)).not.toContain(HELD_ID);
    // the public essay lists the held one in relations[], and the held one gets no entry of its own
    expect(Object.keys(relations)).not.toContain(HELD_ID);
  });

  it('passes registry scan on what it wrote', async () => {
    const { root, out } = built();
    await run(['build', '--dir', root, '--out', out]);
    const scan = await run(['scan', out, '--dir', root]);
    expect(scan.code, scan.out).toBe(0);
  });
});

describe('registry scan with a held essay', () => {
  function distWith(files: Record<string, string>): { root: string; dist: string } {
    const { root, out } = built();
    mkdirSync(out, { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
      writeFileSync(path.join(out, name), text);
    }
    return { root, dist: out };
  }

  const leaks = async (files: Record<string, string>) => {
    const { root, dist } = distWith(files);
    return run(['scan', dist, '--dir', root]);
  };

  it('is clean for a public essay’s own title and address', async () => {
    const r = await leaks({ 'essays/index.html': '<a href="/essays/a-public-essay/">A Public Essay</a>' });
    expect(r.code, r.out).toBe(0);
  });

  it('catches the held id', async () => {
    const r = await leaks({ 'data/x.json': `{"id":"${HELD_ID}"}` });
    expect(r.code).toBe(1);
    expect(r.out).toContain('PRIV-LEAK');
  });

  it('catches the held title in HTML and in JSON', async () => {
    for (const [file, text] of [['essays/index.html', `<h1>${HELD_TITLE}</h1>`], ['data/t.json', `{"t":"${HELD_TITLE}"}`]] as const) {
      const r = await leaks({ [file]: text });
      expect(r.code, text).toBe(1);
    }
  });

  it('catches the held essay’s page address as the site serves it, with and without an anchor', async () => {
    for (const href of [`/essays/${HELD_SLUG}/`, `/essays/${HELD_SLUG}/#${ANCHOR}`, `/essays/${HELD_SLUG}/cite.bib`, `/essay/${HELD_SLUG}/`]) {
      const r = await leaks({ 'sitemap.xml': `<loc>https://example.org${href}</loc>` });
      expect(r.code, href).toBe(1);
      expect(r.out, href).toContain(HELD_ID);
    }
  });

  it('does not repeat the title in its report', async () => {
    const r = await leaks({ 'essays/index.html': `<h1>${HELD_TITLE}</h1>` });
    expect(r.out + r.err).not.toContain(HELD_TITLE);
  });

  it('does not mistake a longer slug for the held one', async () => {
    const r = await leaks({ 'essays/index.html': `<a href="/essays/${HELD_SLUG}-revisited/">other</a>` });
    expect(r.code, r.out).toBe(0);
  });
});
