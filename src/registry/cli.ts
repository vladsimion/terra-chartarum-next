import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { buildSiteData } from './build.js';
import { checkRegistry } from './check.js';
import { scanOutput } from './leak-scan.js';
import { loadRegistry } from './load.js';
import { mintNext } from './mint.js';
import { writeSyntheticRegistry } from './synthetic.js';
import { toJson, type IntegrityReport } from './report.js';
import { renderHtml } from './report-html.js';

const run = promisify(execFile);

export interface Io {
  stdout(text: string): void;
  stderr(text: string): void;
}

const USAGE = `Usage:
  registry check [--dir <root>] [--out <reportsDir>]   validate the registry and write the integrity report
  registry build --out <siteDir> [--dir <root>]        run the gate, and only if it passes write _redirects and data/relations.json for the site
  registry mint <family> [--dir <root>]                print the next unused local-id for a family
  registry scan <distDir> [--dir <root>]               fail if built output holds a private value or the id of a non-public entity
  registry synth <count> --seed <n> --out <dir>        write a deterministic synthetic registry (count entities plus the seven rooms)

<root> is the registry root that contains content/ (default: .). Exit codes: 0 ok, 1 errors found, 2 tool failure.`;

/** Print the usage text and give the exit code for bad arguments. */
function usage(io: Io): number {
  io.stderr(`${USAGE}\n`);
  return 2;
}

async function currentCommit(dir: string): Promise<string> {
  try {
    const { stdout } = await run('git', ['-C', dir, 'rev-parse', 'HEAD']);
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

function summary(report: IntegrityReport): string {
  const { entities, errors, warnings } = report.counts;
  const lines = [`registry check: ${report.pass ? 'PASS' : 'FAIL'} - ${entities} entities, ${errors} errors, ${warnings} warnings`];
  for (const v of report.violations) {
    lines.push(`  ${v.severity} ${v.rule} ${v.entity ?? '(unparsed)'} [${v.file}] ${v.field ?? ''} ${JSON.stringify(v.value)} - expected ${v.expected}`);
  }
  return `${lines.join('\n')}\n`;
}

async function check(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({ args, options: { dir: { type: 'string', default: '.' }, out: { type: 'string', default: 'reports' } } });
  const report = await checkRegistry(values.dir, { commit: await currentCommit(values.dir) });
  await mkdir(values.out, { recursive: true });
  await writeFile(path.join(values.out, 'integrity-report.json'), toJson(report));
  await writeFile(path.join(values.out, 'integrity-report.html'), renderHtml(report));
  io.stdout(summary(report));
  return report.pass ? 0 : 1;
}

async function build(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({ args, options: { dir: { type: 'string', default: '.' }, out: { type: 'string' } } });
  if (!values.out) return usage(io);
  const { report, written, leaks } = await buildSiteData(values.dir, values.out, { commit: await currentCommit(values.dir) });
  if (!report.pass) {
    io.stdout(`${summary(report)}registry build: FAIL - the integrity gate failed, nothing was written\n`);
    return 1;
  }
  if (leaks.length > 0) {
    const lines = leaks.map((v) => `  ${v.severity} ${v.rule} ${v.entity ?? ''} [${v.file}] ${v.field ?? ''} - ${v.expected}`);
    io.stdout(`registry build: FAIL - the output leaks, nothing was kept\n${lines.join('\n')}\n`);
    return 1;
  }
  io.stdout(`${summary(report)}registry build: wrote ${written.join(', ')} to ${values.out}\n`);
  return 0;
}

async function mint(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { dir: { type: 'string', default: '.' } } });
  const family = positionals[0];
  if (!family) {
    return usage(io);
  }
  io.stdout(`${await mintNext(family, values.dir)}\n`);
  return 0;
}

async function synth(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { seed: { type: 'string' }, out: { type: 'string' } },
  });
  const count = Number(positionals[0]);
  const seed = Number(values.seed);
  if (!Number.isInteger(count) || count < 0 || !Number.isInteger(seed) || !values.out) {
    return usage(io);
  }
  await writeSyntheticRegistry(values.out, count, seed);
  io.stdout(`registry synth: wrote ${count} entities and the seven rooms to ${values.out} (seed ${seed})\n`);
  return 0;
}

async function scan(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { dir: { type: 'string', default: '.' } } });
  const distDir = positionals[0];
  if (!distDir) {
    return usage(io);
  }
  const { records } = await loadRegistry(values.dir);
  const violations = await scanOutput(distDir, records);
  const lines = [`registry scan: ${violations.length === 0 ? 'PASS' : 'FAIL'} - ${violations.length} leaks in ${distDir}`];
  // the value is left out on purpose: a private value must not be repeated in a log or artefact
  for (const v of violations) lines.push(`  ${v.severity} ${v.rule} ${v.entity ?? ''} [${v.file}] ${v.field ?? ''} - ${v.expected}`);
  io.stdout(`${lines.join('\n')}\n`);
  return violations.length === 0 ? 0 : 1;
}

/** Entry point, separated from process I/O so tests call it directly. */
export async function main(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === 'check') return await check(rest, io);
    if (command === 'build') return await build(rest, io);
    if (command === 'mint') return await mint(rest, io);
    if (command === 'scan') return await scan(rest, io);
    if (command === 'synth') return await synth(rest, io);
    return usage(io);
  } catch (error) {
    io.stderr(`registry: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2), {
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
  }).then((code) => {
    process.exitCode = code;
  });
}
