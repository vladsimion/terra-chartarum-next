import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';

const fixture = fileURLToPath(new URL('../fixtures/valid', import.meta.url));

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

const place = (n: number, extra: string) =>
  `id: tc:tc:place:place-00000${n}
family: place
origin: minted
title: Place ${n}
slug: place-${n}
place_type: settlement
${extra}`;

/** The valid fixture plus places 3 to 6; each `files` entry is written under content/place/. */
function registry(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'build-root-'));
  cpSync(fixture, root, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(root, 'content/place', name), text);
  return root;
}

const PUBLIC = 'lifecycle: published\nrelease: released';

describe('registry build (T119a)', () => {
  /*
   * place-000004 is cited by public 3 and by 5, a record in a specialist vocabulary whose term
   * `live` means published; place-000006 is held and also cites 4.
   */
  const files = {
    'place-000003.yaml': place(3, `${PUBLIC}\nslug_history: [old-three]\nrelations: [tc:tc:place:place-000004]`),
    'place-000004.yaml': place(4, PUBLIC),
    'place-000005.yaml': place(5, 'lifecycle: live\nrelease: released\nvocabulary: atlas\nrelations: [tc:tc:place:place-000004]'),
    'place-000006.yaml': place(6, 'lifecycle: researching\nrelease: held\nrelations: [tc:tc:place:place-000004]'),
  };
  const withMapping = () => {
    const root = registry(files);
    mkdirSync(path.join(root, 'vocab-mappings'));
    writeFileSync(path.join(root, 'vocab-mappings/atlas.yaml'), 'vocabulary: atlas\nlifecycle: { live: published }\n');
    return root;
  };

  it('writes _redirects and a public relations index, judging a specialist term by its shared meaning', async () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'build-out-')), 'site');
    const { code, out: log } = await run(['build', '--dir', withMapping(), '--out', out]);
    expect(code, log).toBe(0);
    const relations = JSON.parse(readFileSync(path.join(out, 'data/relations.json'), 'utf8'));
    // 5 counts as public because `live` is published; the held 6 is not listed
    expect(relations).toEqual({ 'tc:tc:place:place-000004': ['tc:tc:place:place-000003', 'tc:tc:place:place-000005'] });
    expect(readFileSync(path.join(out, '_redirects'), 'utf8')).toContain('/place/old-three/ /place/place-3/ 301');
  });

  it('never writes the id of a held entity', async () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'build-out-')), 'site');
    await run(['build', '--dir', withMapping(), '--out', out]);
    for (const file of ['data/relations.json', '_redirects']) {
      expect(readFileSync(path.join(out, file), 'utf8'), file).not.toContain('place-000006');
    }
  });

  it('writes nothing and exits 1 when the gate fails', async () => {
    const broken = registry({ 'place-000003.yaml': place(3, 'lifecycle: nonsense') });
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'build-out-')), 'site');
    const { code, out: log } = await run(['build', '--dir', broken, '--out', out]);
    expect(code).toBe(1);
    expect(log).toMatch(/FAIL/);
    expect(log).toMatch(/LIFE-VALUE/);
    expect(existsSync(out)).toBe(false);
  });

  it('fails without a vocabulary mapping, because the same record then breaks the gate', async () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'build-out-')), 'site');
    const { code } = await run(['build', '--dir', registry(files), '--out', out]);
    expect(code).toBe(1);
    expect(existsSync(out)).toBe(false);
  });

  it('asks for --out', async () => {
    const { code, err } = await run(['build', '--dir', fixture]);
    expect(code).toBe(2);
    expect(err).toMatch(/Usage/);
  });
});
