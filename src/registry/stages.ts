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
