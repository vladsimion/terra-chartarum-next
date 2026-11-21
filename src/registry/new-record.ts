import { stringify } from 'yaml';
import { checklistFor, type ChecklistItem } from './checklist.js';
import { isFamily } from './families.js';
import { mintNext } from './mint.js';
import type { CommandResult } from './promote.js';
import { slugFromTitle, writeWithRollback } from './scaffold.js';

/** The fields a person completes, as commented keys under a heading, so the stub still validates. */
function commented(heading: string, items: ChecklistItem[]): string {
  if (items.length === 0) return '';
  return `# ${heading}\n${items.map((item) => `# ${item.field}:\n`).join('')}`;
}

/**
 * The text of a new record: its identity, at `proposed` and `held`, then the provenance checklist the
 * rules ask for before `ready_for_build` and before `publishable` (spec 010 FR-001, FR-003, ADR 0018).
 * Nothing is guessed: every field a person must supply is left as a commented key.
 */
export function stubText(family: string, id: string, title: string, slug: string): string {
  const identity = { id, family, origin: 'minted', title, slug, slug_history: [], lifecycle: 'proposed', release: 'held', relations: [] };
  const { ready_for_build, publishable } = checklistFor(family);
  return stringify(identity) + commented('To complete before ready_for_build', ready_for_build) + commented('To complete before publishable', publishable);
}

/**
 * `registry new <family> <title>` for every family but `room` (the seven fixed entities) and `essay`
 * (`registry new essay`, which asks for a question, an author and a room). Mints with `mintNext`;
 * keeps the file only if the registry has no new error (FR-005).
 */
export async function createRecord(rootDir: string, family: string, rawTitle: string): Promise<CommandResult> {
  const bad = (message: string): CommandResult => ({ code: 2, stdout: '', stderr: `registry new: ${message}\n` });
  if (family === 'room') return bad('rooms are the seven fixed entities and cannot be created');
  if (!isFamily(family)) return bad(`unknown family ${family}`);
  const title = rawTitle.trim();
  const slug = slugFromTitle(title);
  if (!title || !slug) return bad('the title is empty or has no letters or digits to make a slug from');

  const local = await mintNext(family, rootDir);
  const id = `tc:tc:${family}:${local}`;
  const outcome = await writeWithRollback(rootDir, family, [{ name: `${local}.yaml`, text: stubText(family, id, title, slug) }], `registry new ${family}: the new record`);
  if (!outcome.ok) return outcome.result;
  return { code: 0, stdout: `${id}\n${outcome.written.join('\n')}\n`, stderr: '' };
}
