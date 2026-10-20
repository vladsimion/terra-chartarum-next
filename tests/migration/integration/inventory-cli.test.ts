import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { main } from '../../../src/registry/cli.js';
import { DATE, FIXTURE, SHA } from '../support/run.js';

/* Spec 008 T030, T032 (FR-017): `registry inventory` and `registry archive-redirects` over a registry root, end to end. */
async function run(args: string[]) {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}
/** A registry root with the repository's seven draft rooms (public) and the manifest an import leaves. */
function root(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'mig-inv-'));
  cpSync('content/room', path.join(dir, 'content/room'), { recursive: true });
  mkdirSync(path.join(dir, 'migration'), { recursive: true });
  writeFileSync(path.join(dir, 'migration/import-manifest.json'), JSON.stringify({ snapshot: { repository: 'x', sha: SHA, date: DATE } }));
  return dir;
}
const pin = ['--sha', SHA, '--date', DATE];

describe('registry inventory', () => {
  it('writes the sorted inventory under migration/ and says how many URLs have a rule', async () => {
    const dir = root();
    const { code, out } = await run(['inventory', '--snapshot', FIXTURE, '--dir', dir, ...pin]);
    expect(code).toBe(0);
    expect(out).toMatch(/registry inventory: \d+ old URLs \(snapshot e82afd9\): \d+ with a rule, \d+ served in place/);
    const inventory = JSON.parse(readFileSync(path.join(dir, 'migration/redirect-inventory.json'), 'utf8')) as { path: string; outcome: string }[];
    expect(inventory.map((e) => e.path)).toEqual([...inventory.map((e) => e.path)].sort());
    expect(inventory.find((e) => e.path === '/rooms/earth/')).toMatchObject({ outcome: 'rule' });
  });

  it('is a usage error without a snapshot, and an error for a folder that is not a checkout', async () => {
    expect((await run(['inventory', '--dir', root()])).code).toBe(2);
    const bad = await run(['inventory', '--snapshot', 'does/not/exist', '--dir', root(), ...pin]);
    expect(bad.code).toBe(1);
    expect(bad.err).toMatch(/does\/not\/exist/);
  });
});

describe('registry archive-redirects', () => {
  it('writes the rule file from the inventory and the registry', async () => {
    const dir = root();
    await run(['inventory', '--snapshot', FIXTURE, '--dir', dir, ...pin]);
    const { code, out } = await run(['archive-redirects', '--dir', dir]);
    expect(code).toBe(0);
    expect(out).toMatch(/rules written to .*archive\/_redirects; apply them to the archive project by pull request/);
    const text = readFileSync(path.join(dir, 'archive/_redirects'), 'utf8');
    expect(text).toContain('/rooms/earth/ https://terra-chartarum.org/rooms/earth/ 301');
    expect(text).toContain(`Snapshot ${SHA.slice(0, 7)}`);
    expect(existsSync(path.join(dir, 'archive/_redirects'))).toBe(true);
  });

  it('says to run the inventory first when there is none, and when the inventory is stale', async () => {
    const dir = root();
    expect((await run(['archive-redirects', '--dir', dir])).err).toMatch(/redirect-inventory\.json is missing: run registry inventory first/);
    await run(['inventory', '--snapshot', FIXTURE, '--dir', dir, ...pin]);
    // an essay is published afterwards
    mkdirSync(path.join(dir, 'content/essay'), { recursive: true });
    writeFileSync(path.join(dir, 'content/essay/essay-000001.yaml'), stringify({ id: 'tc:tc:essay:essay-000001', family: 'essay', origin: 'minted', title: 'Forts', slug: 'forts-new', slug_history: [], lifecycle: 'published', release: 'released', relations: [], legacy_url: '/essays/forts/' }));
    const stale = await run(['archive-redirects', '--dir', dir]);
    expect(stale.code).toBe(1);
    expect(stale.err).toMatch(/out of date for \/essays\/forts\/.*run registry inventory again/);
  });
});
