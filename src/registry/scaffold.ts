import { mkdir, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAndCheck } from './check.js';
import { describeViolation, type CommandResult } from './promote.js';
import type { Violation } from './report.js';

/** A URL slug from a title: lower case, accents folded, anything else a single hyphen. */
export function slugFromTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const errorKey = (v: Violation) => `${v.rule}|${v.entity ?? ''}|${v.file}|${v.field ?? ''}`;
const exists = async (target: string) => (await stat(target).catch(() => null)) !== null;

/**
 * Write new files into `content/<family>/` and keep them only if the registry has no error it did not
 * have before; otherwise remove them again, and the directory if this made it (ADR 0010, ADR 0018).
 * Errors that were already there neither block the write nor are blamed on it.
 */
export async function writeWithRollback(
  rootDir: string,
  family: string,
  files: { name: string; text: string }[],
  /** The start of the failure message, e.g. `registry new place: the new record`. */
  what: string,
): Promise<{ ok: true; written: string[] } | { ok: false; result: CommandResult }> {
  const before = await loadAndCheck(rootDir);
  const known = new Set(before.report.violations.filter((v) => v.severity === 'error').map(errorKey));

  const dir = path.join(rootDir, 'content', family);
  const madeDir = !(await exists(dir));
  await mkdir(dir, { recursive: true });
  const written = files.map((file) => path.join(dir, file.name));
  for (const [i, file] of files.entries()) await writeFile(written[i]!, file.text);

  const after = await loadAndCheck(rootDir);
  const introduced = after.report.violations.filter((v) => v.severity === 'error' && !known.has(errorKey(v)));
  if (introduced.length === 0) return { ok: true, written: written.map((file) => path.relative(rootDir, file)) };

  for (const file of written) await rm(file, { force: true });
  if (madeDir) await rmdir(dir).catch(() => undefined);
  return {
    ok: false,
    result: {
      code: 1,
      stdout: '',
      stderr: `${what} is not valid, so nothing was written:\n${introduced.map(describeViolation).join('\n')}\n`,
    },
  };
}
