import { describe, expect, it } from 'vitest';
import { ESSAY_STAGES, stageAtLeast, type EssayStage } from '../../../src/registry/stages.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { essayAt, historyTo, world } from '../support/essays.js';

/*
 * Spec 003 T012 (AC 2.1, 2.2): each stage rule is silent below its stage and an error at and above
 * it. A "case" breaks one thing on an otherwise valid essay; the rule must fire from `from` onward.
 */
interface Case {
  rule: string;
  from: EssayStage;
  name: string;
  /** Change to the essay, or to the surrounding records. */
  essay?: Partial<RegistryRecord>;
  records?: (all: RegistryRecord[]) => RegistryRecord[];
}

const withoutMapRights = (all: RegistryRecord[]) => all.map((r) => (r.family === 'map' ? { ...r, rights: undefined } : r));

const CASES: Case[] = [
  { rule: 'ESSAY-QUESTION', from: 'Concept', name: 'a missing question', essay: { question: undefined } },
  { rule: 'ESSAY-QUESTION', from: 'Concept', name: 'a blank question', essay: { question: '  ' } },
  { rule: 'ESSAY-ROOMS', from: 'Concept', name: 'no primary room', essay: { rooms: { secondary: [] } } },
  { rule: 'ESSAY-ROOMS', from: 'Concept', name: 'a primary that is not a room', essay: { rooms: { primary: 'tc:tc:map:map-000001' } } },
  {
    rule: 'ESSAY-ROOMS',
    from: 'Concept',
    name: 'three secondary rooms',
    essay: { rooms: { primary: 'tc:tc:room:map', secondary: ['tc:tc:room:border', 'tc:tc:room:road', 'tc:tc:room:city'] } },
  },
  {
    rule: 'ESSAY-ROOMS',
    from: 'Concept',
    name: 'a secondary room equal to the primary',
    essay: { rooms: { primary: 'tc:tc:room:map', secondary: ['tc:tc:room:map'] } },
  },
  { rule: 'ESSAY-ACCENT', from: 'Concept', name: 'an accent that is not a slot', essay: { accent: 'chartreuse' } },
  { rule: 'ESSAY-CORPUS', from: 'Corpus', name: 'a map that does not resolve', essay: { maps: ['tc:tc:map:map-000099'] } },
  { rule: 'ESSAY-CORPUS', from: 'Corpus', name: 'a map without rights', records: withoutMapRights },
  { rule: 'ESSAY-CORPUS', from: 'Corpus', name: 'no maps at all', essay: { maps: [] } },
  { rule: 'ESSAY-RESEARCH', from: 'Research', name: 'no evidence', essay: { evidence: [] } },
  { rule: 'ESSAY-RESEARCH', from: 'Research', name: 'no open_questions key', essay: { open_questions: undefined } },
  {
    rule: 'ESSAY-RESEARCH',
    from: 'Research',
    name: 'evidence without a locator',
    records: (all) => all.map((r) => (r.family === 'evidence' ? { ...r, locator: undefined } : r)),
  },
  { rule: 'ESSAY-OUTLINE', from: 'Outline', name: 'no thesis', essay: { thesis: undefined } },
  { rule: 'ESSAY-OUTLINE', from: 'Outline', name: 'a blank thesis', essay: { thesis: '' } },
  { rule: 'ESSAY-BUILD', from: 'Build', name: 'a layer that does not resolve', essay: { layers: ['tc:tc:layer:layer-000099'] } },
  { rule: 'ESSAY-BUILD', from: 'Build', name: 'a bibliography entry that does not resolve', essay: { bibliography: ['tc:tc:bibliography_entry:bibliography_entry-000099'] } },
  {
    rule: 'ESSAY-BUILD',
    from: 'Build',
    name: 'a body that names a map that does not exist',
    essay: { body: { exists: true, text: '', tags: [{ tag: 'MapFigure', props: { map: 'tc:tc:map:map-000099' }, dynamic: [], line: 1 }] } },
  },
];

const hitsFor = (stage: EssayStage, c: Case) => {
  const base = [...world(stageAtLeast(stage, 'Publish')), essayAt(stage, c.essay)];
  const records = c.records ? c.records(base) : base;
  return validateRegistry(records).violations.filter((v) => v.rule === c.rule && v.entity === 'tc:tc:essay:essay-000001');
};

describe('stage-gated essay rules', () => {
  for (const c of CASES) {
    describe(`${c.rule}: ${c.name}`, () => {
      for (const stage of ESSAY_STAGES) {
        const applies = stageAtLeast(stage, c.from);
        // a stage below the rule's own cannot carry the fields that stage adds; the essay is built for `stage`
        it(`${applies ? 'is an error' : 'is silent'} at ${stage}`, () => {
          const found = hitsFor(stage, c);
          if (applies) {
            expect(found.length).toBeGreaterThan(0);
            expect(found.every((v) => v.severity === 'error')).toBe(true);
          } else {
            expect(found).toEqual([]);
          }
        });
      }
    });
  }

  it('finds nothing in a fully valid essay at any stage', () => {
    for (const stage of ESSAY_STAGES) {
      const found = validateRegistry([...world(stageAtLeast(stage, 'Publish')), essayAt(stage)]).violations.filter((v) =>
        v.rule.startsWith('ESSAY-'),
      );
      expect(found, stage).toEqual([]);
    }
  });

  it('applies the rules to the essay that is at that stage, not to every essay', () => {
    const concept = essayAt('Concept', { id: 'tc:tc:essay:essay-000002', slug: 'essay-2', file: 'content/essay/essay-000002.yaml', stage_history: historyTo('Concept') });
    const found = validateRegistry([...world(), concept]).violations.filter((v) => v.rule === 'ESSAY-OUTLINE' || v.rule === 'ESSAY-CORPUS');
    expect(found).toEqual([]);
  });
});
