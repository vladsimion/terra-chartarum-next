import type { EssayStage, Lifecycle } from './vocab.ts';

/** Essay stage → lifecycle (ADR 0003 §2). An essay's lifecycle is never authored. */
const STAGE_LIFECYCLE: Record<EssayStage, Lifecycle> = {
  concept: 'proposed',
  corpus: 'researching',
  research: 'researching',
  outline: 'verified',
  draft: 'verified',
  build: 'in_build',
  design_qa: 'qa',
  publish: 'published',
  cross_link: 'published',
};

/**
 * The lifecycle the rules should apply to a record: derived from `stage` for
 * essays, otherwise the record's own `lifecycle` (after specialist mapping).
 */
export function effectiveLifecycle(record: Record<string, unknown>): string | undefined {
  if (record['family'] === 'essay') {
    const stage = record['stage'];
    return typeof stage === 'string' ? STAGE_LIFECYCLE[stage as EssayStage] : undefined;
  }
  return typeof record['lifecycle'] === 'string' ? record['lifecycle'] : undefined;
}
