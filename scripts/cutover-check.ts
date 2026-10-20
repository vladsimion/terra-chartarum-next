import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';
import { ANCHOR_ESSAY_SLUG, ciFinding, runCutoverCheck } from '../src/migration/cutover-check.js';
import type { InventoryEntry } from '../src/migration/inventory.js';
import { loadAndCheck } from '../src/registry/check.js';
import { checkLinks } from '../src/shell/links.js';

/*
 * The automated cutover checklist (spec 008 FR-018, contracts/cutover.md, docs/cutover.md): runs over the
 * production build and the real registry, prints each step and exits 1 if any failed. The only use of the
 * network is the one `gh` call that reads the registry workflow run (the Lighthouse step).
 */
const run = promisify(execFile);
const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: 'dist' },
    dir: { type: 'string', default: '.' },
    anchor: { type: 'string', default: ANCHOR_ESSAY_SLUG },
    commit: { type: 'string' },
    inventory: { type: 'string', default: 'migration/redirect-inventory.json' },
    rules: { type: 'string', default: 'archive/_redirects' },
  },
});
const dist = values.dist as string;
const root = values.dir as string;

async function main(): Promise<number> {
  if (!existsSync(dist)) {
    console.error(`cutover:check: no build folder at ${dist}; run npm run build first`);
    return 2;
  }
  for (const file of [values.inventory as string, values.rules as string]) {
    if (!existsSync(path.join(root, file))) {
      console.error(`cutover:check: ${file} is missing; run registry inventory and registry archive-redirects`);
      return 2;
    }
  }

  const { report, loaded } = await loadAndCheck(root);
  const gate = report.violations.filter((v) => v.severity === 'error').map((v) => `${v.rule} ${v.file}${v.field ? ` ${v.field}` : ''}: ${v.expected}`);
  gate.push(...loaded.loadErrors.map((e) => `LOAD ${e.file}: ${e.message}`));

  const shell: string[] = [];
  try {
    await run('npx', ['tsx', 'scripts/shell-check.ts', '--dist', dist, '--cutover']);
  } catch (error) {
    const out = String((error as { stdout?: string }).stdout ?? '');
    shell.push(...out.split('\n').filter((l) => l !== '' && !l.startsWith('shell:check:')));
    // exit 1 with findings is the expected failure; anything else (exit 2, no output) means the check itself did not run
    if ((error as { code?: number }).code !== 1) shell.push(`shell:check did not run: ${String((error as { stderr?: string }).stderr ?? (error as Error).message).trim()}`);
    else if (shell.length === 0) shell.push('shell:check exited 1 without naming a page');
  }

  let sha = values.commit as string | undefined;
  if (!sha) {
    try {
      sha = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
    } catch {
      sha = 'unknown';
    }
  }
  let ghOutput: string | Error;
  try {
    ghOutput = (await run('gh', ['run', 'list', '--workflow', 'registry', '--commit', sha, '--json', 'status,conclusion', '--limit', '1'])).stdout;
  } catch (error) {
    ghOutput = error as Error;
  }

  const result = runCutoverCheck({
    gate,
    shell,
    links: checkLinks(dist),
    inventory: JSON.parse(readFileSync(path.join(root, values.inventory as string), 'utf8')) as InventoryEntry[],
    rules: readFileSync(path.join(root, values.rules as string), 'utf8'),
    isBuiltPage: (p) => existsSync(path.join(dist, p, 'index.html')),
    ci: ciFinding(ghOutput, sha),
    records: loaded.records,
    anchorSlug: values.anchor as string,
  });
  for (const step of result.steps) {
    console.log(`${step.ok ? 'PASS' : 'FAIL'} ${step.name}`);
    for (const f of step.findings) console.log(`  ${f}`);
  }
  console.log(`cutover:check: ${result.steps.filter((s) => !s.ok).length} of ${result.steps.length} steps failed`);
  return result.ok ? 0 : 1;
}

process.exitCode = await main();
