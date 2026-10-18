import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { registryIntegration } from '../../../src/integrations/registry.js';

/*
 * spec 001 T119b, contracts/registry-integration.md: the build runs the registry gate before any
 * page is generated, and afterwards writes what the site needs from the registry.
 */
const FIXTURE = 'tests/shell/fixtures/registry';
const temps: string[] = [];
afterEach(() => {
  for (const t of temps.splice(0)) rmSync(t, { recursive: true, force: true });
});
const tmp = (prefix: string) => {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  temps.push(d);
  return d;
};

function logger() {
  const lines: string[] = [];
  return { lines, info: (m: string) => void lines.push(m), warn: (m: string) => void lines.push(m), error: (m: string) => void lines.push(m) };
}

/** A copy of the fixture registry with one record broken so the gate fails. */
function brokenRegistry(): string {
  const root = tmp('broken-registry-');
  cpSync(FIXTURE, root, { recursive: true });
  const file = path.join(root, 'content/essay/essay-000001.yaml');
  writeFileSync(file, readFileSync(file, 'utf8').replace('lifecycle: published', 'lifecycle: nonsense'));
  return root;
}

type Hooks = ReturnType<typeof registryIntegration>['hooks'];
const start = (root: string, log = logger()) => (registryIntegration({ root }).hooks as Hooks)['astro:build:start']!({ logger: log } as never);
const done = (root: string, outDir: string, log = logger()) =>
  (registryIntegration({ root }).hooks as Hooks)['astro:build:done']!({ dir: pathToFileURL(`${outDir}/`), logger: log } as never);

describe('astro:build:start', () => {
  it('passes a valid registry and says how many entities it checked', async () => {
    const log = logger();
    await start(FIXTURE, log);
    expect(log.lines.join('\n')).toMatch(/integrity gate passed.*15 entities/);
  });

  it('stops the build with the report summary when the gate fails', async () => {
    await expect(start(brokenRegistry())).rejects.toThrow(/LIFE-VALUE/);
  });

  it('logs and carries on when there is no content/ directory yet', async () => {
    const log = logger();
    await start(tmp('empty-'), log);
    expect(log.lines.join('\n')).toMatch(/no content\//i);
  });
});

describe('astro:build:done', () => {
  it('writes _redirects and data/relations.json into the output', async () => {
    const out = tmp('site-out-');
    await done(FIXTURE, out);
    expect(existsSync(path.join(out, '_redirects'))).toBe(true);
    expect(existsSync(path.join(out, 'data/relations.json'))).toBe(true);
  });

  it('fails the build, writing nothing, when the gate fails', async () => {
    const out = tmp('site-out-');
    await expect(done(brokenRegistry(), out)).rejects.toThrow(/LIFE-VALUE/);
    expect(readdirSync(out)).toEqual([]);
  });

  it('writes nothing and does not fail when there is no content/ directory', async () => {
    const out = tmp('site-out-');
    await done(tmp('empty-'), out);
    expect(readdirSync(out)).toEqual([]);
  });
});
