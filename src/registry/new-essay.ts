import { stringify } from 'yaml';
import { loadAndCheck } from './check.js';
import { mintNext } from './mint.js';
import { localToday, type CommandResult } from './promote.js';
import { slugFromTitle, writeWithRollback } from './scaffold.js';

export { slugFromTitle } from './scaffold.js';

export interface NewEssayOptions {
  title: string;
  /** A room name (`map`) or its full id. */
  room: string;
  question: string;
  author: string;
  /** Today as YYYY-MM-DD; defaults to the local date. */
  today?: string;
}

const STUB = '{/* Write the essay here. The shell supplies the framework components; see docs/essay-components.md. */}\n';

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

  const outcome = await writeWithRollback(
    rootDir,
    'essay',
    [
      { name: `${local}.yaml`, text: stringify(record) },
      { name: `${local}.mdx`, text: STUB },
    ],
    'registry new essay: the new essay',
  );
  if (!outcome.ok) return outcome.result;
  return { code: 0, stdout: `${id}\n${outcome.written.join('\n')}\n`, stderr: '' };
}
