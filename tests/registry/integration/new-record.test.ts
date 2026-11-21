import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadAndCheck } from '../../../src/registry/check.js';
import { main } from '../../../src/registry/cli.js';
import { FAMILIES } from '../../../src/registry/families.js';

/*
 * Spec 010 T006 (US1 scenarios 1, 4 and 5; FR-001 to FR-005; contracts/cli.md): `registry new
 * <family> <title>` writes one stub with a minted id, or refuses, or removes what it wrote.
 */
const FIXTURE = fileURLToPath(new URL('../fixtures/valid', import.meta.url));

/** Every scaffoldable family but essay, which keeps `registry new essay` and its options. */
const FAMILIES_NEW = FAMILIES.filter((family) => family !== 'room' && family !== 'essay');

function copyOfFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'new-record-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

/** Every file under content/, with its bytes, so a test can see that nothing changed. */
function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(path.join(root, 'content'), { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) files.set(path.relative(root, path.join(entry.parentPath, entry.name)), readFileSync(path.join(entry.parentPath, entry.name), 'utf8'));
  }
  return files;
}

const errorKeys = async (root: string) =>
  (await loadAndCheck(root)).report.violations.filter((v) => v.severity === 'error').map((v) => `${v.rule}|${v.entity}|${v.field}`);

describe('registry new <family> <title>', () => {
  it.each(FAMILIES_NEW)('%s: writes one held, proposed stub with the next counter id and no new error', async (family) => {
    const root = copyOfFixture();
    const before = snapshot(root);
    const errorsBefore = await errorKeys(root);
    const highest = [...before.keys()]
      .map((file) => new RegExp(`^content/${family}/${family}-(\\d{6})\\.yaml$`).exec(file)?.[1])
      .filter((n): n is string => n !== undefined)
      .reduce((max, n) => Math.max(max, Number(n)), 0);
    const local = `${family}-${String(highest + 1).padStart(6, '0')}`;

    const { code, out, err } = await run(['new', family, 'Apulum Survey', '--dir', root]);

    expect(err).toBe('');
    expect(code).toBe(0);
    expect(out).toBe(`tc:tc:${family}:${local}\ncontent/${family}/${local}.yaml\n`);
    const after = snapshot(root);
    expect([...after.keys()].filter((file) => !before.has(file))).toEqual([`content/${family}/${local}.yaml`]);
    const text = after.get(`content/${family}/${local}.yaml`)!;
    expect(parse(text)).toMatchObject({
      id: `tc:tc:${family}:${local}`,
      family,
      origin: 'minted',
      title: 'Apulum Survey',
      slug: 'apulum-survey',
      slug_history: [],
      lifecycle: 'proposed',
      release: 'held',
    });
    expect(await errorKeys(root)).toEqual(errorsBefore);
  });

  it('writes the checklist as commented keys under the two headings (FR-003)', async () => {
    const root = copyOfFixture();
    await run(['new', 'place', 'Apulum', '--dir', root]);
    const text = readFileSync(path.join(root, 'content/place/place-000003.yaml'), 'utf8');
    expect(text).toContain('# To complete before ready_for_build\n# place_type:\n');
    expect(text).toContain('# To complete before publishable\n');
    expect(text).toMatch(/^# names:$/m);
    expect(text).toMatch(/^# location:$/m);
  });

  it('writes no headings for a family with an empty checklist (FR-019)', async () => {
    const root = copyOfFixture();
    await run(['new', 'period', 'The Dacian Wars', '--dir', root]);
    const text = readFileSync(path.join(root, 'content/period/period-000001.yaml'), 'utf8');
    expect(text).not.toContain('# To complete');
  });

  it.each([
    ['room', 'rooms are the seven fixed entities and cannot be created'],
    ['nosuch', 'unknown family nosuch'],
  ])('refuses %s, writes nothing and says why', async (family, message) => {
    const root = copyOfFixture();
    const before = snapshot(root);
    const { code, out, err } = await run(['new', family, 'Anything', '--dir', root]);
    expect(code).toBe(2);
    expect(out).toBe('');
    expect(err).toContain(message);
    expect(snapshot(root)).toEqual(before);
  });

  it('refuses a title with nothing to make a slug from', async () => {
    const root = copyOfFixture();
    const { code, out } = await run(['new', 'place', '  —  ', '--dir', root]);
    expect(code).toBe(2);
    expect(out).toBe('');
  });

  it('removes what it wrote when the stub makes the registry worse (FR-005)', async () => {
    const root = copyOfFixture();
    const before = snapshot(root);
    // the fixture already has a place with slug napoca, so this stub breaks SLUG-UNIQUE
    const { code, out, err } = await run(['new', 'place', 'Napoca', '--dir', root]);
    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toContain('SLUG-UNIQUE');
    expect(snapshot(root)).toEqual(before);
  });

  it('is not blocked, or blamed, by an error that was already there', async () => {
    const root = copyOfFixture();
    const broken = 'content/place/place-000002.yaml';
    const text = readFileSync(path.join(root, broken), 'utf8');
    writeFileSync(path.join(root, broken), text.replace('  - tc:tc:source:source-000001', '  - tc:tc:source:source-000001\n  - tc:tc:place:place-999999'));
    const errorsBefore = await errorKeys(root);
    expect(errorsBefore.some((key) => key.startsWith('REF-UNKNOWN'))).toBe(true);
    const { code } = await run(['new', 'cartographer', 'Johannes Honterus', '--dir', root]);
    expect(code).toBe(0);
    expect(await errorKeys(root)).toEqual(errorsBefore);
  });
});
