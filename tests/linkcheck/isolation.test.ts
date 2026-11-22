import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Spec 010 T050 (SC-008, research R8 "Isolation"): the gate and the build make no network request,
 * so nothing they load may reach the link checker. Follows static imports from the registry CLI,
 * the Astro config and every page.
 */
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LINKCHECK = path.join(ROOT, 'src/linkcheck') + path.sep;

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  const candidates = [base, base.replace(/\.js$/, '.ts'), `${base}.ts`, `${base}.js`, `${base}.mjs`, path.join(base, 'index.ts')];
  return candidates.find((c) => existsSync(c) && !c.endsWith(path.sep) && readdirSafe(c)) ?? null;
}

function readdirSafe(file: string): boolean {
  try {
    readFileSync(file);
    return true;
  } catch {
    return false;
  }
}

function reachable(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT)) {
      const next = resolve(file, (m[1] ?? m[2] ?? m[3]) as string);
      if (next) stack.push(next);
    }
  }
  return seen;
}

function pages(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(astro|ts|js|mdx?)$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name));
}

describe('the link checker is isolated from the gate and the build (SC-008)', () => {
  const entries = [path.join(ROOT, 'src/registry/cli.ts'), path.join(ROOT, 'astro.config.mjs'), ...pages(path.join(ROOT, 'src/pages'))];

  it('follows imports from the entry points', () => {
    expect(reachable(entries).size).toBeGreaterThan(entries.length);
  });

  it('reaches nothing under src/linkcheck/', () => {
    const hits = [...reachable(entries)].filter((f) => f.startsWith(LINKCHECK));
    expect(hits).toEqual([]);
  });

  it('would notice an import of the checker', () => {
    const probe = path.join(ROOT, 'tests/linkcheck/run.test.ts');
    expect([...reachable([probe])].some((f) => f.startsWith(LINKCHECK))).toBe(true);
  });
});
