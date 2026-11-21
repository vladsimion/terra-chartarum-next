import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../../../src/registry/families.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record, rooms } from '../support/builders.js';

/**
 * TCX-65 item 2. `registry new <family>` (ADR 0018) writes a record at `proposed` and `held` with
 * nothing but its identity, and leaves provenance as a commented checklist. That only works if such a
 * bare record validates as a draft in every family, and is held to the full rules once promoted.
 */
const STUB_FAMILIES = FAMILIES.filter((family) => family !== 'room');

/**
 * Families whose rules require something of a publishable record: a family field (`FAM-REQUIRED`) or
 * rights (`RIGHTS-MISSING`). Collection, route, event and period have neither, so a bare record of
 * theirs is publishable as it stands. Spec 010 FR-019 leaves that to the first spec that publishes one.
 */
const HELD_TO_RULES = ['essay', 'map', 'cartographer', 'place', 'attestation', 'dataset', 'layer', 'bibliography_entry', 'evidence'];

/**
 * An essay's lifecycle is derived from its stage (ADR 0010), and `registry new essay` asks for its
 * question, author and primary room, so its stub carries those as that command writes them.
 */
const STAGE: Record<string, string> = { proposed: 'Concept', publishable: 'Publish' };

/** What a scaffold writes before the editor fills anything in. */
function stub(family: string, lifecycle = 'proposed') {
  const essay =
    family === 'essay'
      ? {
          stage: STAGE[lifecycle],
          stage_history: [{ stage: STAGE[lifecycle], on: '2026-11-21', by: 'editor' }],
          question: 'What does the essay ask?',
          authors: ['editor'],
          rooms: { primary: rooms()[0]!.id },
        }
      : {};
  return record(family, 1, { lifecycle, release: 'held', ...essay });
}

describe('a bare draft validates in every family (TCX-65, ADR 0006 item 6, ADR 0018)', () => {
  it.each(STUB_FAMILIES)('%s: a proposed stub has no errors', (family) => {
    const report = validateRegistry([...rooms(), stub(family)]);
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
    expect(report.pass).toBe(true);
  });

  it.each(HELD_TO_RULES)('%s: the same stub at publishable fails on what the editor has not yet supplied', (family) => {
    const report = validateRegistry([...rooms(), stub(family, 'publishable')]);
    expect(report.pass).toBe(false);
    const rules = report.violations.filter((v) => v.severity === 'error').map((v) => v.rule);
    expect(rules.some((rule) => rule === 'FAM-REQUIRED' || rule === 'RIGHTS-MISSING'), rules.join(', ')).toBe(true);
  });
});
