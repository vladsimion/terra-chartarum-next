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

  describe('escaped copies of a private value', () => {
    const awkward = place(1, {
      lifecycle: 'published',
      release: 'released',
      private: { dealer: 'Smith & Sons <Rare "Books">', note: "Bought in Café Müller's shop" },
    });

    it('finds an HTML-escaped copy', async () => {
      const root = dist({ 'index.html': '<p>Smith &amp; Sons &lt;Rare &quot;Books&quot;&gt;</p>' });
      expect((await scanOutput(root, [awkward])).map((v) => v.field)).toEqual(['private.dealer']);
    });

    it('finds a JSON-escaped copy', async () => {
      const root = dist({ 'data/places.json': JSON.stringify({ note: awkward.private }) });
      expect((await scanOutput(root, [awkward])).map((v) => v.field).sort()).toEqual(['private.dealer', 'private.note']);
    });

    it('finds a URL-encoded copy', async () => {
      const root = dist({ 'sitemap.xml': `https://example.org/?q=${encodeURIComponent('Smith & Sons <Rare "Books">')}` });
      expect((await scanOutput(root, [awkward])).map((v) => v.field)).toEqual(['private.dealer']);
    });

    it('still finds the plain value', async () => {
      const root = dist({ 'a.txt': 'Smith & Sons <Rare "Books">' });
      expect((await scanOutput(root, [awkward])).map((v) => v.field)).toEqual(['private.dealer']);
    });

    it('never repeats the value in any of its forms in the report', async () => {
      const root = dist({ 'a.html': 'Smith &amp; Sons &lt;Rare &quot;Books&quot;&gt;' });
      expect(JSON.stringify(await scanOutput(root, [awkward]))).not.toMatch(/Smith/);
    });
  });

  describe('the address of a page that must not exist', () => {
    const hiddenPlace = place(5, { lifecycle: 'published', release: 'held', slug: 'secret-place' });

    it('fails when the page path of a non-public entity appears in the output', async () => {
      const root = dist({ 'index.html': '<a href="/place/secret-place/">there</a>' });
      const found = await scanOutput(root, [hiddenPlace]);
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({ rule: 'PRIV-LEAK', entity: hiddenPlace.id, field: 'slug', value: '/place/secret-place' });
    });

    it('finds the path without a trailing slash, and inside a query or sitemap', async () => {
      const root = dist({ 'sitemap.xml': '<loc>https://example.org/place/secret-place</loc>' });
      expect(await scanOutput(root, [hiddenPlace])).toHaveLength(1);
    });

    it('does not mistake a longer public slug for the hidden one', async () => {
      const longer = place(6, { lifecycle: 'published', release: 'released', slug: 'secret-place-two' });
      const root = dist({ 'index.html': '<a href="/place/secret-place-two/">ok</a>' });
      expect(await scanOutput(root, [hiddenPlace, longer])).toEqual([]);
    });

    it('is family-aware: the same slug under another family is a different address', async () => {
      const root = dist({ 'index.html': '<a href="/source/secret-place/">ok</a>' });
      expect(await scanOutput(root, [hiddenPlace])).toEqual([]);
    });
  });

  it('finds nothing to complain about in an empty output directory', async () => {
    expect(await scanOutput(dist({}), REGISTRY)).toEqual([]);
  });
});

describe('scanOutput with held names (spec 005 SC-005)', () => {
  const heldLayer = { ...place(7), family: 'layer', id: 'tc:tc:layer:layer-000007', title: 'Quiet Frontier Layer', slug: 'quiet-frontier-layer', lifecycle: 'published', release: 'held' };
  const records = [open, heldLayer];
  const options = { namedFamilies: ['layer', 'collection', 'place'] };

  it('finds the title or the slug of a held layer in an Atlas payload', async () => {
    const byTitle = await scanOutput(dist({ 'data/atlas-index.json': '{"layers":[{"title":"Quiet Frontier Layer"}]}' }), records, options);
    expect(byTitle.map((v) => [v.entity, v.field])).toEqual([[heldLayer.id, 'title']]);
    const bySlug = await scanOutput(dist({ 'data/atlas-slugs.json': '{"layers":[{"slug":"quiet-frontier-layer"}]}' }), records, options);
    expect(bySlug.map((v) => [v.entity, v.field])).toEqual([[heldLayer.id, 'slug']]);
    expect(JSON.stringify([...byTitle, ...bySlug])).not.toContain('Quiet Frontier Layer');
  });

  it('finds a name of a held place, not only its title', async () => {
    const heldPlace = { ...place(8, { names: [{ name: 'Hiddenum', language: 'la', kind: 'historic' }, { name: 'Tiny', language: 'en', kind: 'modern' }] }), title: 'A Held Place', slug: 'a-held-place', lifecycle: 'published', release: 'held' };
    const found = await scanOutput(dist({ 'data/place-index.json': '{"names":["Hiddenum"]}' }), [open, heldPlace], options);
    expect(found.map((v) => [v.entity, v.field])).toEqual([[heldPlace.id, 'names']]);
    expect(JSON.stringify(found)).not.toContain('Hiddenum');
    // a name too short to tell from ordinary text is not searched for
    expect(await scanOutput(dist({ 'a.json': '{"n":"Tiny"}' }), [open, heldPlace], options)).toEqual([]);
  });

  it('does not take a longer public slug for a held one', async () => {
    expect(await scanOutput(dist({ 'a.json': '{"slug":"quiet-frontier-layer-two"}' }), records, options)).toEqual([]);
  });

  it('leaves a held name alone in a whole-site scan, where a public page may mention it in prose', async () => {
    expect(await scanOutput(dist({ 'essay/index.html': '<p>The Quiet Frontier Layer is discussed.</p>' }), records)).toEqual([]);
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
