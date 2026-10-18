import { scanEssayBody } from '../../../src/registry/essay-body.js';
import { ESSAY_STAGES, lifecycleFor, stageAtLeast, type EssayStage } from '../../../src/registry/stages.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { evidence, layer, map, place, record, rooms, source } from './builders.js';
import { validMap } from './maps.js';

/** A valid body that uses every framework tag the rules read. */
export const VALID_BODY = [
  'The line was drawn by omission.',
  '<MapFigure map="tc:tc:map:map-000001" />',
  'A survey says so.<Cite evidence="tc:tc:evidence:evidence-000001" />',
  '<EvidencePanel evidence="tc:tc:evidence:evidence-000001" />',
  '<Interaction id="i1" />',
  '<CitationExport />',
].join('\n\n');

export const EV = 'tc:tc:evidence:evidence-000001';
export const OTHER_EV = 'tc:tc:evidence:evidence-000002';

/**
 * The records an essay points at, ready for any stage. From Publish the referenced entities are
 * released and published, because the body may only name public things (FR-017).
 */
export function world(publicEntities = false): RegistryRecord[] {
  const pub = publicEntities ? { release: 'released', lifecycle: 'published' } : {};
  return [
    ...rooms(),
    record('cartographer', 1, { kind: 'person', ...pub }),
    // a public map has to satisfy the map rules too (spec 004), so it comes from the valid builder
    publicEntities
      ? validMap({ ...pub })
      : map(1, { makers: ['tc:tc:cartographer:cartographer-000001'], rights: { licence: 'CC-BY-4.0' }, witness_kind: 'institutional', ...pub }),
    place(1, pub),
    source(1, pub),
    evidence(1, pub),
    layer(1, { rights: { licence: 'CC-BY-4.0' }, ...pub }),
    record('dataset', 1, { version: '1', rights: { licence: 'CC-BY-4.0' }, ...pub }),
    record('bibliography_entry', 1, { csl: 'x.json', section: 'primary_sources', ...pub }),
  ];
}

const ROOM = (name: string) => `tc:tc:room:${name}`;

/** The stage history of an essay now at `stage`: one entry per stage from Concept, in order. */
export function historyTo(stage: EssayStage) {
  return ESSAY_STAGES.slice(0, ESSAY_STAGES.indexOf(stage) + 1).map((s, i) => ({
    stage: s,
    on: `2026-10-${String(i + 1).padStart(2, '0')}`,
    by: 'A. Editor',
  }));
}

/**
 * An essay at `stage` that passes every rule of that stage and the stages before it, so a test
 * changes exactly one thing. The body is the scan of `VALID_BODY` unless a test sets `body`.
 */
export function essayAt(stage: EssayStage, overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  const at = (s: EssayStage) => stageAtLeast(stage, s);
  const publishing = at('Publish');
  const base: Partial<RegistryRecord> = {
    stage,
    lifecycle: lifecycleFor(stage, at('Design QA') && stage !== 'Design QA'),
    design_qa_passed: at('Design QA') && stage !== 'Design QA',
    stage_history: historyTo(stage),
    question: 'How did a map fix a frontier?',
    authors: ['A. Editor'],
    rooms: { primary: ROOM('map'), secondary: [ROOM('border')] },
    accent: 'verdigris',
    rights: { licence: 'CC-BY-4.0' },
    relations: [],
    release: publishing ? 'released' : 'held',
  };
  if (at('Corpus')) base.maps = ['tc:tc:map:map-000001'];
  if (at('Research')) {
    base.evidence = [EV];
    base.sources = ['tc:tc:source:source-000001'];
    base.open_questions = [];
  }
  if (at('Outline')) {
    base.thesis = 'It did so by omission.';
    base.interactions = [{ id: 'i1', component: 'compare-slider', question: 'What moved?', evidence: [EV], interpretation: 'The line.' }];
  }
  if (at('Draft')) base.body = scanEssayBody(VALID_BODY);
  if (at('Build')) {
    base.layers = ['tc:tc:layer:layer-000001'];
    base.bibliography = ['tc:tc:bibliography_entry:bibliography_entry-000001'];
  }
  if (publishing) {
    base.signoffs = {
      historical: { by: 'A', on: '2026-10-10' },
      cartographic: { by: 'B', on: '2026-10-11' },
      data: { by: 'C', on: '2026-10-12' },
    };
    base.published_on = '2026-10-17';
  }
  return record('essay', 1, { ...base, ...overrides });
}

/** A whole registry around one essay at `stage`. */
export function registryWith(stage: EssayStage, overrides: Partial<RegistryRecord> = {}): RegistryRecord[] {
  return [...world(stageAtLeast(stage, 'Publish')), essayAt(stage, overrides)];
}
