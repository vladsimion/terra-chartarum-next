import type { LifecycleValue } from './schemas/shared.js';

/** The nine editorial stages an essay moves through (Constitution, Editorial Governance). */
export const ESSAY_STAGES = [
  'Concept',
  'Corpus',
  'Research',
  'Outline',
  'Draft',
  'Build',
  'Design QA',
  'Publish',
  'Cross-link',
] as const;

export type EssayStage = (typeof ESSAY_STAGES)[number];

export function isEssayStage(value: unknown): value is EssayStage {
  return typeof value === 'string' && (ESSAY_STAGES as readonly string[]).includes(value);
}

/**
 * An essay's lifecycle is derived from its stage and never set by hand (ADR 0003 §2). Design QA is
 * `qa` until all its checks pass, then `publishable`.
 */
export function lifecycleFor(stage: EssayStage, designQaPassed = false): LifecycleValue {
  switch (stage) {
    case 'Concept':
      return 'proposed';
    case 'Corpus':
    case 'Research':
      return 'researching';
    case 'Outline':
    case 'Draft':
      return 'verified';
    case 'Build':
      return 'in_build';
    case 'Design QA':
      return designQaPassed ? 'publishable' : 'qa';
    case 'Publish':
    case 'Cross-link':
      return 'published';
  }
}

/** The stage after this one, or nothing after Cross-link. Stages are never skipped (ADR 0010). */
export function nextStage(stage: EssayStage): EssayStage | undefined {
  return ESSAY_STAGES[ESSAY_STAGES.indexOf(stage) + 1];
}

/** True when `stage` is a stage and is `minimum` or later. A value that is not a stage is never at any stage. */
export function stageAtLeast(stage: unknown, minimum: EssayStage): boolean {
  return isEssayStage(stage) && ESSAY_STAGES.indexOf(stage) >= ESSAY_STAGES.indexOf(minimum);
}

/**
 * The essay rules that first apply at each stage (spec 003 contracts/essay-rule-ids.md, "From
 * stage"). Before its stage a rule does not apply: these are stage checks, not lifecycle severities.
 * Rules the registry already had (`REF-FINDING-AID` at Draft, `RIGHTS-CLEARED` at Design QA) keep
 * their own severity logic and are not listed.
 */
export const STAGE_CHECKS: Readonly<Record<EssayStage, readonly string[]>> = {
  Concept: ['ESSAY-QUESTION', 'ESSAY-ROOMS', 'ESSAY-HISTORY', 'ESSAY-ACCENT'],
  Corpus: ['ESSAY-CORPUS'],
  Research: ['ESSAY-RESEARCH'],
  Outline: ['ESSAY-OUTLINE', 'ESSAY-INTERACTION'],
  Draft: ['ESSAY-DRAFT', 'ESSAY-BODY-DYNAMIC'],
  Build: ['ESSAY-BUILD'],
  'Design QA': [],
  Publish: ['ESSAY-SIGNOFF', 'ESSAY-PUBLISH', 'ESSAY-BODY-PUBLIC'],
  'Cross-link': ['ESSAY-CROSSLINK'],
};

/** Every rule that must hold for an essay at this stage: the stage's own and all earlier ones, in stage order. */
export function checksFor(stage: EssayStage): string[] {
  return ESSAY_STAGES.slice(0, ESSAY_STAGES.indexOf(stage) + 1).flatMap((s) => [...STAGE_CHECKS[s]]);
}
