import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import { scanOutput } from '../../../src/registry/leak-scan.js';
import { place } from '../support/builders.js';

const DEALER = 'Quaritch Antiquarian Booksellers';

const open = place(1, { lifecycle: 'published', release: 'released', private: { dealer: DEALER, price_paid: 'EUR 4200 incl. VAT' } });
const heldPublished = place(2, { lifecycle: 'published', release: 'held' });
const releasedDraft = place(3, { lifecycle: 'qa', release: 'released' });
const REGISTRY = [open, heldPublished, releasedDraft];

/** A dist directory with the given files (relative path -> content). */
function dist(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'dist-'));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  return root;
}

describe('scanOutput (FR-009)', () => {
  it('passes output that holds only public ids and values', async () => {
    const root = dist({
      'index.html': `<a href="/place/place-1/" data-id="${open.id}">Place</a>`,
      'data/places.json': JSON.stringify([{ id: open.id }]),
    });
    expect(await scanOutput(root, REGISTRY)).toEqual([]);
  });

  it('fails when a private value appears in a page, naming the owner and the file but not the value', async () => {
    const root = dist({ 'place/place-1/index.html': `<p>Bought from ${DEALER}.</p>` });
    const found = await scanOutput(root, REGISTRY);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      rule: 'PRIV-LEAK',
      severity: 'error',
      entity: open.id,
      file: 'place/place-1/index.html',
      field: 'private.dealer',
      value: '[private value]',
    });
    expect(JSON.stringify(found)).not.toContain(DEALER);
  });

  it('fails when the id of a held entity appears in a payload', async () => {
    const root = dist({ 'data/search.json': JSON.stringify({ hits: [heldPublished.id] }) });
    const found = await scanOutput(root, REGISTRY);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: 'PRIV-LEAK', entity: heldPublished.id, value: heldPublished.id });
  });

  it('treats a released entity that is not published as non-public too', async () => {
    const root = dist({ 'index.html': `<!-- ${releasedDraft.id} -->` });
    expect((await scanOutput(root, REGISTRY)).map((v) => v.entity)).toEqual([releasedDraft.id]);
  });

  it('scans nested directories and text formats, and skips binary files', async () => {
    const root = dist({
      'a/b/c/page.html': DEALER,
      'assets/app.js': `var d = "${DEALER}"`,
      'sitemap.xml': heldPublished.id,
      'notes.txt': DEALER,
      '_redirects': `/x ${heldPublished.id}`,
      'image.png': Buffer.from(DEALER),
    });
    const files = (await scanOutput(root, REGISTRY)).map((v) => v.file).sort();
    expect(files).toEqual(['_redirects', 'a/b/c/page.html', 'assets/app.js', 'notes.txt', 'sitemap.xml']);
  });

  it('reports a leaked value once per file', async () => {
    const root = dist({ 'index.html': `${DEALER} and again ${DEALER}` });
    expect(await scanOutput(root, REGISTRY)).toHaveLength(1);
  });

  it('ignores private values too short to be told apart from ordinary text', async () => {
    const shortPrivate = place(1, { lifecycle: 'published', release: 'released', private: { code: 'A12', price: 4200 } });
    const root = dist({ 'index.html': 'A12 costs 4200 here' });
    expect(await scanOutput(root, [shortPrivate])).toEqual([]);
  });

  it('does not mistake a longer public id for a held one that is its prefix', async () => {
    const heldShort = place(1, { id: 'tc:tc:place:plc-a', origin: 'legacy', lifecycle: 'proposed', release: 'held' });
    const openLong = place(2, { id: 'tc:tc:place:plc-ab', origin: 'legacy', lifecycle: 'published', release: 'released' });
    const root = dist({ 'index.html': openLong.id });
    expect(await scanOutput(root, [heldShort, openLong])).toEqual([]);
  });

  it('finds nothing to complain about in an empty output directory', async () => {
    expect(await scanOutput(dist({}), REGISTRY)).toEqual([]);
  });
});

describe('registry scan', () => {
  function registryOn(disk: string): string {
    const root = mkdtempSync(path.join(tmpdir(), 'scan-registry-'));
    mkdirSync(path.join(root, 'content', 'place'), { recursive: true });
    writeFileSync(
      path.join(root, 'content', 'place', 'place-000001.yaml'),
      [
        'id: tc:tc:place:place-000001',
        'family: place',
        'origin: minted',
        'title: Napoca',
        'slug: napoca',
        'lifecycle: published',
        'release: released',
        'place_type: settlement',
        'private:',
        `  dealer: ${disk}`,
      ].join('\n'),
    );
    return root;
  }

  async function run(args: string[]) {
    let out = '';
    let err = '';
    const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
    return { code, out, err };
  }

  it('exits 0 when the output is clean', async () => {
    const { code, out } = await run(['scan', dist({ 'index.html': 'hello' }), '--dir', registryOn(DEALER)]);
    expect(code).toBe(0);
    expect(out).toMatch(/PASS/);
  });

  it('exits 1 on a leak and names PRIV-LEAK without printing the value', async () => {
    const { code, out } = await run(['scan', dist({ 'index.html': `from ${DEALER}` }), '--dir', registryOn(DEALER)]);
    expect(code).toBe(1);
    expect(out).toContain('PRIV-LEAK');
    expect(out).not.toContain(DEALER);
  });

  it('exits 2 when the output directory does not exist', async () => {
    const { code, err } = await run(['scan', path.join(tmpdir(), 'no-such-dist'), '--dir', registryOn(DEALER)]);
    expect(code).toBe(2);
    expect(err.length).toBeGreaterThan(0);
  });
});
