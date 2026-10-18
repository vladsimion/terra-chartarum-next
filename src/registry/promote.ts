import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { validateLoaded } from './check.js';
import { loadRegistry } from './load.js';
import { ESSAY_STAGES, isEssayStage, lifecycleFor, nextStage } from './stages.js';
import type { Violation } from './report.js';

/** What a registry command did: the exit code and what to print. Kept apart from process I/O so tests and the CLI share it. */
export interface CommandResult {
  code: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}

export interface PromoteOptions {
  by: string;
  /** Do everything except write. */
  check?: boolean;
  /** Today as YYYY-MM-DD; defaults to the local date. */
  today?: string;
}

/** The local calendar date, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Writes through a temporary file and a rename, so a reader never sees half a record. */
export async function writeAtomic(file: string, text: string): Promise<void> {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, text);
  await rename(temp, file);
}

export function describeViolation(v: Violation): string {
  return `  ${v.rule} ${v.entity ?? '(unparsed)'} [${v.file}]${v.field ? ` ${v.field}` : ''} - expected ${v.expected}`;
}

const CI_NOTE = [
  'Publish: this command does not run the accessibility or performance checks.',
  'They are proved by the CI run on the pull request (axe, Lighthouse CI against the ADR 0004 budgets),',
  "and the essay's page type must be in the CI template list (tests/shell/ci-templates.json).",
].join('\n');

/**
 * Move one essay one stage on (ADR 0010). The candidate record is validated inside the whole
 * registry first, and the file is only rewritten if no error concerns the essay. Stages are never
 * skipped and never revisited. The record is edited through the YAML document, so comments and key
 * order survive.
 */
export async function promoteEssay(rootDir: string, essayId: string, targetStage: string, options: PromoteOptions): Promise<CommandResult> {
  const refuse = (code: 1 | 2, message: string): CommandResult => ({ code, stdout: '', stderr: `registry promote: ${message}\n` });
  if (!options.by.trim()) return refuse(2, '--by must name the person making the change');
  if (!isEssayStage(targetStage)) return refuse(2, `unknown stage "${targetStage}"; the stages are ${ESSAY_STAGES.join(', ')}`);

  const loaded = await loadRegistry(rootDir);
  const essay = loaded.records.find((r) => r.id === essayId);
  if (!essay) return refuse(2, `no record with id ${essayId}`);
  if (essay.family !== 'essay') return refuse(2, `${essayId} is a ${essay.family}, not an essay`);

  if (!isEssayStage(essay.stage)) return refuse(1, `${essayId} has no valid stage to move from (stage is ${JSON.stringify(essay.stage ?? null)})`);
  const next = nextStage(essay.stage);
  if (next === undefined) return refuse(1, `${essayId} is at ${essay.stage}, the last stage; there is nothing after it`);
  if (targetStage !== next) {
    return refuse(1, `${essayId} is at ${essay.stage}; the only stage it can move to is ${next}, not ${targetStage} (stages are never skipped or revisited)`);
  }

  const today = options.today ?? localToday();
  const history = Array.isArray(essay.stage_history) ? essay.stage_history : [];
  const lifecycle = lifecycleFor(next, essay.design_qa_passed === true);
  const entry = { stage: next, on: today, by: options.by.trim() };
  const candidate = { ...essay, stage: next, lifecycle, stage_history: [...history, entry] };

  const report = validateLoaded(loaded, loaded.records.map((r) => (r.id === essayId ? candidate : r)));
  const errors = report.violations.filter((v) => v.severity === 'error' && v.entity === essayId);
  if (errors.length > 0) {
    return {
      code: 1,
      stdout: '',
      stderr: `registry promote: ${essayId} cannot move to ${next}; ${errors.length} check(s) fail:\n${errors.map(describeViolation).join('\n')}\n`,
    };
  }

  if (!options.check) {
    const file = path.join(rootDir, essay.file);
    const doc = parseDocument(await readFile(file, 'utf8'));
    doc.set('stage', next);
    doc.set('lifecycle', lifecycle);
    doc.addIn(['stage_history'], doc.createNode(entry));
    await writeAtomic(file, doc.toString());
  }

  const verb = options.check ? 'would move' : 'moved';
  const lines = [`registry promote: ${verb} ${essayId} from ${essay.stage} to ${next} (lifecycle ${lifecycle}, by ${entry.by}, ${today})`];
  if (next === 'Publish') lines.push(CI_NOTE);
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' };
}
