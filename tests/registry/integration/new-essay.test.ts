import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { main } from '../../../src/registry/cli.js';
import { writeRegistry } from '../support/disk.js';
import { essayAt, world } from '../support/essays.js';

/*
 * Spec 003 T019 (FR-015, SC-004): `registry new essay` writes a valid Concept record and an .mdx
 * stub, or removes what it wrote and fails.
 */
async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

const NEW = ['new', 'essay', 'The Frontier Line', '--room', 'map', '--question', 'How did a map fix a frontier?', '--author', 'A. Editor'];
const filesIn = (root: string, family: string) => readdirSync(path.join(root, 'content', family)).sort();
const today = () => new Date().toISOString().slice(0, 10);
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('registry new essay', () => {
  it('writes a Concept record with a minted id, derived slug and one history entry', async () => {
    const root = writeRegistry(world());
    const { code, out } = await run([...NEW, '--dir', root]);
    expect(code).toBe(0);
    expect(out).toContain('tc:tc:essay:essay-000001');
    const essay = parse(readFileSync(path.join(root, 'content/essay/essay-000001.yaml'), 'utf8'));
    expect(essay).toMatchObject({
      id: 'tc:tc:essay:essay-000001',
      family: 'essay',
      origin: 'minted',
      title: 'The Frontier Line',
      slug: 'the-frontier-line',
      stage: 'Concept',
      lifecycle: 'proposed',
      release: 'held',
      question: 'How did a map fix a frontier?',
      authors: ['A. Editor'],
      rooms: { primary: 'tc:tc:room:map' },
    });
    expect(essay.stage_history).toHaveLength(1);
    expect(essay.stage_history[0]).toMatchObject({ stage: 'Concept', by: 'A. Editor' });
    expect([today(), todayLocal()]).toContain(String(essay.stage_history[0].on));
  });

  it('writes an .mdx stub beside it, and the registry passes registry check', async () => {
    const root = writeRegistry(world());
    await run([...NEW, '--dir', root]);
    expect(existsSync(path.join(root, 'content/essay/essay-000001.mdx'))).toBe(true);
    const check = await run(['check', '--dir', root, '--out', path.join(root, 'reports')]);
    expect(check.code).toBe(0);
  });

  it('mints the next id after the existing essays', async () => {
    const root = writeRegistry([...world(), essayAt('Concept')]);
    await run([...NEW, '--dir', root]);
    expect(filesIn(root, 'essay')).toEqual(['essay-000001.yaml', 'essay-000002.mdx', 'essay-000002.yaml']);
  });

  it('removes what it wrote and exits 1 if the result is not valid', async () => {
    // another essay already holds the slug the title derives, so SLUG-UNIQUE fails
    const root = writeRegistry([...world(), essayAt('Concept', { slug: 'the-frontier-line' })]);
    const { code, out, err } = await run([...NEW, '--dir', root]);
    expect(code).toBe(1);
    expect(out + err).toContain('SLUG-UNIQUE');
    expect(filesIn(root, 'essay')).toEqual(['essay-000001.yaml']);
  });

  it('exits 2 for a room that does not exist', async () => {
    const root = writeRegistry(world());
    const args = NEW.map((a) => (a === 'map' ? 'moon' : a));
    const { code, err } = await run([...args, '--dir', root]);
    expect(code).toBe(2);
    expect(err).toMatch(/room/i);
    expect(existsSync(path.join(root, 'content/essay'))).toBe(false);
  });

  it('exits 2 for an empty title and for a title that yields no slug', async () => {
    const root = writeRegistry(world());
    expect((await run(['new', 'essay', '  ', ...NEW.slice(3), '--dir', root])).code).toBe(2);
    expect((await run(['new', 'essay', '!!!', ...NEW.slice(3), '--dir', root])).code).toBe(2);
    expect(existsSync(path.join(root, 'content/essay'))).toBe(false);
  });

  it('exits 2 when the question, room or author is missing', async () => {
    const root = writeRegistry(world());
    expect((await run(['new', 'essay', 'A title', '--room', 'map', '--author', 'A', '--dir', root])).code).toBe(2);
    expect((await run(['new', 'essay', 'A title', '--question', 'Q?', '--author', 'A', '--dir', root])).code).toBe(2);
    expect((await run(['new', 'essay', 'A title', '--room', 'map', '--question', 'Q?', '--dir', root])).code).toBe(2);
  });

  it('exits 2 for a thing other than an essay', async () => {
    const root = writeRegistry(world());
    expect((await run(['new', 'widget', 'A title', '--dir', root])).code).toBe(2);
  });
});
