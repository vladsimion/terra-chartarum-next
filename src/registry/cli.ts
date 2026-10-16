import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { checkRegistry } from './check.js';
import { mintNext } from './mint.js';
import { toJson, type IntegrityReport } from './report.js';

const run = promisify(execFile);

export interface Io {
  stdout(text: string): void;
  stderr(text: string): void;
}

const USAGE = `Usage:
  registry check [--dir <root>] [--out <reportsDir>]   validate the registry and write the integrity report
  registry mint <family> [--dir <root>]                print the next unused local-id for a family

<root> is the registry root that contains content/ (default: .). Exit codes: 0 ok, 1 errors found, 2 tool failure.`;

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
  io.stdout(summary(report));
  return report.pass ? 0 : 1;
}

async function mint(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { dir: { type: 'string', default: '.' } } });
  const family = positionals[0];
  if (!family) {
    io.stderr(`${USAGE}\n`);
    return 2;
  }
  io.stdout(`${await mintNext(family, values.dir)}\n`);
  return 0;
}

/** Entry point, separated from process I/O so tests call it directly. */
export async function main(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === 'check') return await check(rest, io);
    if (command === 'mint') return await mint(rest, io);
    io.stderr(`${USAGE}\n`);
    return 2;
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
