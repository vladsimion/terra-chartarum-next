import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { essayAt, historyTo, registryWith } from '../support/essays.js';

/*
 * Spec 003 T011 (AC 2.6, SC-002, FR-003): the stage history is contiguous from Concept, each stage
 * once and in order, every entry carries `on` and `by`, and the last entry is the current stage.
 */
const hits = (overrides: Parameters<typeof essayAt>[1]) =>
  validateRegistry(registryWith('Research', overrides)).violations.filter((v) => v.rule === 'ESSAY-HISTORY');

describe('ESSAY-HISTORY', () => {
  it('accepts a contiguous history ending at the current stage', () => {
    expect(hits({})).toEqual([]);
  });

  it('accepts the one-entry history of a new Concept essay', () => {
    const found = validateRegistry(registryWith('Concept')).violations.filter((v) => v.rule === 'ESSAY-HISTORY');
    expect(found).toEqual([]);
  });

  it('rejects a skipped stage', () => {
    const history = historyTo('Research').filter((e) => e.stage !== 'Corpus');
    const found = hits({ stage_history: history });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'stage_history' });
  });

  it('rejects a repeated stage', () => {
    const history = historyTo('Research');
    const found = hits({ stage_history: [history[0]!, history[1]!, history[1]!, history[2]!] });
    expect(found).toHaveLength(1);
  });

  it('rejects a history that does not start at Concept', () => {
    expect(hits({ stage_history: historyTo('Research').slice(1) })).toHaveLength(1);
  });

  it('rejects a last entry that differs from the stage', () => {
    expect(hits({ stage: 'Research', stage_history: historyTo('Corpus') })).toHaveLength(1);
  });

  it('rejects an entry without on', () => {
    const history = historyTo('Research').map((e, i) => (i === 1 ? { stage: e.stage, by: e.by } : e));
    expect(hits({ stage_history: history })).toHaveLength(1);
  });

  it('rejects an entry without by', () => {
    const history = historyTo('Research').map((e, i) => (i === 2 ? { stage: e.stage, on: e.on } : e));
    expect(hits({ stage_history: history })).toHaveLength(1);
  });

  it('rejects a history that is not a list, and a missing one', () => {
    expect(hits({ stage_history: 'Concept' })).toHaveLength(1);
    expect(hits({ stage_history: undefined })).toHaveLength(1);
  });

  it('names the essay and its file', () => {
    const found = hits({ stage_history: [] });
    expect(found[0]).toMatchObject({ entity: 'tc:tc:essay:essay-000001', file: 'content/essay/essay-000001.yaml' });
  });
});
