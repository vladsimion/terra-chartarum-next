import { mkdir, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { loadAndCheck } from './check.js';
import { mintNext } from './mint.js';
import { describeViolation, localToday, type CommandResult } from './promote.js';
import type { Violation } from './report.js';

export interface NewEssayOptions {
  title: string;
  /** A room name (`map`) or its full id. */
  room: string;
  question: string;
  author: string;
  /** Today as YYYY-MM-DD; defaults to the local date. */
  today?: string;
}

/** A URL slug from a title: lower case, accents folded, anything else a single hyphen. */
export function slugFromTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STUB = '{/* Write the essay here. The shell supplies the framework components; see docs/essay-components.md. */}\n';

const errorKey = (v: Violation) => `${v.rule}|${v.entity ?? ''}|${v.file}|${v.field ?? ''}`;
const exists = async (target: string) => (await stat(target).catch(() => null)) !== null;

/**
 * Start a new essay at Concept (FR-015): a minted id, a slug from the title, a one-entry stage
 * history and a body stub. If the registry has more errors afterwards than before, what was written
 * is removed again, so a failed command leaves nothing behind.
 */
export async function createEssay(rootDir: string, options: NewEssayOptions): Promise<CommandResult> {
  const bad = (message: string): CommandResult => ({ code: 2, stdout: '', stderr: `registry new essay: ${message}\n` });
  const title = options.title.trim();
  const slug = slugFromTitle(title);
  if (!title || !slug) return bad('the title is empty or has no letters or digits to make a slug from');
  if (!options.question.trim()) return bad('--question is required');
  if (!options.author.trim()) return bad('--author is required');
  const roomId = options.room.startsWith('tc:') ? options.room : `tc:tc:room:${options.room}`;

  const before = await loadAndCheck(rootDir);
  if (!before.loaded.records.some((r) => r.id === roomId && r.family === 'room')) return bad(`unknown room "${options.room}"`);

  const local = await mintNext('essay', rootDir);
  const id = `tc:tc:essay:${local}`;
  const today = options.today ?? localToday();
  const record = {
    id,
    family: 'essay',
    origin: 'minted',
    title,
    slug,
    slug_history: [],
    stage: 'Concept',
    lifecycle: 'proposed',
    release: 'held',
    relations: [],
    question: options.question.trim(),
    authors: [options.author.trim()],
    rooms: { primary: roomId },
    stage_history: [{ stage: 'Concept', on: today, by: options.author.trim() }],
  };

  const dir = path.join(rootDir, 'content', 'essay');
  const yamlFile = path.join(dir, `${local}.yaml`);
  const mdxFile = path.join(dir, `${local}.mdx`);
  const madeDir = !(await exists(dir));
  await mkdir(dir, { recursive: true });
  await writeFile(yamlFile, stringify(record));
  await writeFile(mdxFile, STUB);

  const after = await loadAndCheck(rootDir);
  const known = new Set(before.report.violations.filter((v) => v.severity === 'error').map(errorKey));
  const introduced = after.report.violations.filter((v) => v.severity === 'error' && !known.has(errorKey(v)));
  if (introduced.length > 0) {
    await rm(yamlFile, { force: true });
    await rm(mdxFile, { force: true });
    if (madeDir) await rmdir(dir).catch(() => undefined);
    return {
      code: 1,
      stdout: '',
      stderr: `registry new essay: the new essay is not valid, so nothing was written:\n${introduced.map(describeViolation).join('\n')}\n`,
    };
  }
  return { code: 0, stdout: `${id}\n${path.relative(rootDir, yamlFile)}\n${path.relative(rootDir, mdxFile)}\n`, stderr: '' };
}
