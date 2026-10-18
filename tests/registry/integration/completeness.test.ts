import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import { collectionSite } from '../../collection/support/build.js';
import { FIXTURE_ROOT } from '../../collection/support/fixture.js';

/*
 * Spec 004 T047 (US5, contracts/cli-additions.md): `registry completeness` writes the editor reports,
 * exits 0 even when the gate fails, 1 when the registry cannot be loaded and 2 on a usage error; the
 * reports never reach the site, and the output scan fails if they do.
 */
async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}
const tmp = (name: string) => mkdtempSync(path.join(tmpdir(), `completeness-${name}-`));
const read = (dir: string, file: string) => readFileSync(path.join(dir, file), 'utf8');

describe('registry completeness on the collection fixtures', () => {
  let out = '';
  let result: Awaited<ReturnType<typeof run>>;
  beforeAll(async () => {
    out = tmp('ok');
    result = await run(['completeness', '--dir', FIXTURE_ROOT, '--out', out]);
  });
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it('exits 0 and writes exactly the three reports', () => {
    expect(result.code).toBe(0);
    expect(readdirSync(out).sort()).toEqual(['completeness.json', 'enrichment-queue.json', 'enrichment-queue.md']);
  });

  it('lists every map, public or held, with the contract’s fields', () => {
    const report = JSON.parse(read(out, 'completeness.json')) as Record<string, unknown>[];
    expect(report.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `tc:tc:map:map-00000${n}`));
    for (const r of report) expect(Object.keys(r).sort()).toEqual(['displayed', 'gaps', 'id', 'lifecycle', 'recorded', 'statuses']);
    const held = report.find((r) => r.id === 'tc:tc:map:map-000005')!;
    expect(held).toMatchObject({ lifecycle: 'ready_for_build', displayed: 13, recorded: 1, gaps: [] });
    expect((held.statuses as Record<string, string>).images).toBe('not_yet_verified');
  });

  it('ranks the queue by the product of the three parts, ties by id, and writes the same in Markdown', () => {
    const queue = JSON.parse(read(out, 'enrichment-queue.json')) as { id: string; impact: number; risk: number; reuse: number; score: number }[];
    expect(queue).toHaveLength(6);
    for (const item of queue) expect(item.score).toBe(item.impact * item.risk * item.reuse);
    const sorted = [...queue].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
    expect(queue.map((q) => q.id)).toEqual(sorted.map((q) => q.id));
    const byId = (n: number) => queue.find((q) => q.id === `tc:tc:map:map-00000${n}`)!;
    // maps 1 and 2 are cited by two public essays and a held one; the held map 5 has nothing but a maker
    expect(byId(1).impact).toBe(3);
    expect(byId(5)).toMatchObject({ impact: 1, risk: 3 });
    expect(byId(3).score).toBeLessThan(byId(1).score);
    const md = read(out, 'enrichment-queue.md');
    expect(md).toContain('| Rank | Map | Lifecycle | Impact | Risk | Reuse | Score | Gaps |');
    expect(md).toContain(`| 1 | ${queue[0]!.id} |`);
  });

  it('says what it wrote', () => {
    expect(result.out).toContain('completeness.json');
    expect(result.out).toContain('enrichment-queue.md');
  });
});

describe('registry completeness when the gate fails', () => {
  let root = '';
  let out = '';
  beforeAll(() => {
    root = tmp('broken-root');
    out = tmp('broken-out');
    cpSync(FIXTURE_ROOT, root, { recursive: true });
    // an acquisition word as a key: MAP-PRIVATE-FIELD is an error at any lifecycle
    appendFileSync(path.join(root, 'content/map/map-000005.yaml'), 'price: 1\n');
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  });

  it('still writes the reports and exits 0, naming the failure on stderr', async () => {
    const { code, err } = await run(['completeness', '--dir', root, '--out', out]);
    expect(code).toBe(0);
    expect(err).toMatch(/gate/i);
    expect(err).toContain('MAP-PRIVATE-FIELD');
    expect(existsSync(path.join(out, 'enrichment-queue.json'))).toBe(true);
  });

  it('does not repeat the private value', async () => {
    const { err } = await run(['completeness', '--dir', root, '--out', out]);
    expect(err).not.toMatch(/price: 1|"price"/);
  });
});

describe('registry completeness errors', () => {
  it('exits 1 when the registry cannot be loaded', async () => {
    const out = tmp('noload');
    const { code, err } = await run(['completeness', '--dir', path.join(tmpdir(), 'no-such-registry-here'), '--out', out]);
    expect(code).toBe(1);
    expect(err).toMatch(/registry/);
    expect(readdirSync(out)).toEqual([]);
    rmSync(out, { recursive: true, force: true });
  });

  it('exits 2 on a usage error', async () => {
    expect((await run(['completeness', '--dir', FIXTURE_ROOT])).code).toBe(2);
  });
});

describe('the reports and the site', () => {
  const NAMES = ['completeness.json', 'enrichment-queue.json', 'enrichment-queue.md'];
  let dir = '';
  beforeAll(() => {
    dir = collectionSite();
  });

  it('neither file name nor content is in the built output', () => {
    const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
    expect(files.map((e) => e.name).filter((n) => NAMES.includes(n))).toEqual([]);
    for (const e of files.filter((f) => /\.(html|json|txt|xml|js|css)$/.test(f.name))) {
      const text = readFileSync(path.join(e.parentPath, e.name), 'utf8');
      for (const word of [...NAMES, 'Enrichment queue']) expect(text.includes(word), `${e.name} mentions ${word}`).toBe(false);
    }
  });

  describe('the output scan', () => {
    let copy = '';
    beforeAll(() => {
      copy = tmp('site');
      cpSync(dir, copy, { recursive: true });
    });
    afterAll(() => rmSync(copy, { recursive: true, force: true }));

    it('passes the real output', async () => {
      expect((await run(['scan', copy, '--dir', FIXTURE_ROOT])).code).toBe(0);
    });

    it('fails, naming the file, when an editor report is copied into the output', async () => {
      writeFileSync(path.join(copy, 'enrichment-queue.json'), '[]');
      const { code, out } = await run(['scan', copy, '--dir', FIXTURE_ROOT]);
      expect(code).toBe(1);
      expect(out).toContain('PRIV-LEAK');
      expect(out).toContain('enrichment-queue.json');
    });
  });
});
