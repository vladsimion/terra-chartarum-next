import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import type { ImportReport, StagedFile } from './context.js';
import type { ProfileResult } from './profile.js';

/*
 * Staging and applying (spec 008 FR-002). The import writes everything to a staging folder and
 * compares it with the registry root: a file the root already has, identical, is skipped; one it has
 * with different content is listed as changed upstream and left alone. `--apply` then copies into the
 * root only files that do not exist there, and refuses to overwrite any.
 */
const bytes = (file: StagedFile): Buffer => (typeof file === 'string' ? Buffer.from(file, 'utf8') : Buffer.from(file));

async function existing(root: string, relative: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(root, relative));
  } catch {
    return null;
  }
}

/** Which top-level fields of two YAML records differ, or the whole file when it is not a record. */
function changedFields(relative: string, staged: Buffer, present: Buffer): string[] {
  if (!relative.endsWith('.yaml')) return ['(file)'];
  try {
    const a = parse(staged.toString('utf8')) as Record<string, unknown>;
    const b = parse(present.toString('utf8')) as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort();
  } catch {
    return ['(file)'];
  }
}

const idOfFile = (relative: string, staged: Buffer): string => {
  if (!relative.endsWith('.yaml')) return relative;
  try {
    const record = parse(staged.toString('utf8')) as { id?: string };
    return record.id ?? relative;
  } catch {
    return relative;
  }
};

/** The report for a run, with what is new, already present and changed upstream relative to the root. */
export async function compare(result: ProfileResult, root: string): Promise<ImportReport> {
  const created: string[] = [];
  const skipped: string[] = [];
  const changed: ImportReport['changed_upstream'] = [];
  for (const relative of [...result.files.keys()].sort()) {
    const staged = bytes(result.files.get(relative) as StagedFile);
    const present = await existing(root, relative);
    if (present === null) {
      if (relative.endsWith('.yaml')) created.push(idOfFile(relative, staged));
    } else if (Buffer.compare(staged, present) === 0) {
      if (relative.endsWith('.yaml')) skipped.push(idOfFile(relative, staged));
    } else {
      changed.push({ id: idOfFile(relative, staged), fields: changedFields(relative, staged, present) });
    }
  }
  return { created, skipped, changed_upstream: changed, matched: result.report.matched, dropped: result.report.dropped, lossy: result.report.lossy, report_only: result.report.report_only, unmapped_terms: [] };
}

/** Write the staged files and the report to `out`. */
export async function writeStaging(result: ProfileResult, report: ImportReport, out: string): Promise<void> {
  for (const [relative, file] of [...result.files].sort(([a], [b]) => a.localeCompare(b))) {
    const target = path.join(out, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes(file));
  }
  await writeFile(path.join(out, 'import-report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

/** Copy staged files the root does not have; never overwrite. Returns what was written. */
export async function apply(result: ProfileResult, root: string): Promise<string[]> {
  const written: string[] = [];
  for (const [relative, file] of [...result.files].sort(([a], [b]) => a.localeCompare(b))) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    try {
      // 'wx': a file that is there is the editor's now, whatever the import says
      await writeFile(target, bytes(file), { flag: 'wx' });
      written.push(relative);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  return written;
}
