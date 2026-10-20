import { describe, expect, it } from 'vitest';
import { previewPatches, selectUsedRecords, stripMapFigures } from '../../../src/essays/preview.js';
import { record } from '../../registry/support/builders.js';

/*
 * Spec 009 T004 (contracts/review-tooling.md, `essay:preview`): the preview of a held essay is built from
 * a temporary registry copy in which the essay and the records it uses are marked released. These tests
 * drive the pure part, over records in memory; the script only copies files and runs the build.
 */
const id = (family: string, n: number) => record(family, n).id;

describe('selectUsedRecords', () => {
  const essay = record('essay', 1, {
    slug: 'a-held-essay',
    maps: [id('map', 1), id('map', 2)],
    evidence: [id('evidence', 1)],
    sources: [id('source', 1)],
    bibliography: [id('bibliography_entry', 1)],
  });
  const records = [
    essay,
    record('map', 1),
    record('map', 2),
    record('map', 3),
    // the evidence's source is not among the essay's own `sources`, and that source has its own entry
    record('evidence', 1, { source: id('source', 2) }),
    record('source', 1),
    record('source', 2, { entry: id('bibliography_entry', 2) }),
    record('bibliography_entry', 1),
    record('bibliography_entry', 2),
    record('bibliography_entry', 3),
  ];

  it('is the essay, its maps, evidence, sources and entries, and each evidence record\'s source and that source\'s entry', () => {
    const used = selectUsedRecords(records, 'a-held-essay');
    expect([...used].sort()).toEqual(
      [
        essay.id,
        id('map', 1),
        id('map', 2),
        id('evidence', 1),
        id('source', 1),
        id('source', 2),
        id('bibliography_entry', 1),
        id('bibliography_entry', 2),
      ].sort(),
    );
  });
});

describe('previewPatches', () => {
  const essay = record('essay', 1, { slug: 'a-held-essay', stage: 'Draft', lifecycle: 'verified', maps: [id('map', 1)] });
  const records = [essay, record('map', 1), record('map', 2)];
  const today = '2026-01-01';
  const patches = previewPatches(records, 'a-held-essay', today);

  it('marks the essay as published at the Publish stage, with every placeholder stamped as a preview', () => {
    expect(patches[essay.id]).toMatchObject({
      stage: 'Publish',
      lifecycle: 'published',
      release: 'released',
      design_qa_passed: true,
      published_on: today,
      signoffs: {
        historical: { by: 'preview', on: today },
        cartographic: { by: 'preview', on: today },
        data: { by: 'preview', on: today },
      },
    });
    const history = patches[essay.id]!.stage_history as { stage: string; on: string; by: string }[];
    expect(history.map((h) => h.stage)).toEqual(['Concept', 'Corpus', 'Research', 'Outline', 'Draft', 'Build', 'Design QA', 'Publish']);
    expect(history.every((h) => h.by === 'preview' && h.on === today)).toBe(true);
  });

  it('publishes and releases each used record, and says nothing about any other', () => {
    expect(patches[id('map', 1)]).toEqual({ lifecycle: 'published', release: 'released' });
    expect(Object.keys(patches).sort()).toEqual([essay.id, id('map', 1)].sort());
  });
});

describe('previewPatches with a map left out (a stone that drops to source-only)', () => {
  const essay = record('essay', 1, { slug: 'a-held-essay', maps: [id('map', 1), id('map', 2)] });
  const records = [essay, record('map', 1), record('map', 2)];
  const patches = previewPatches(records, 'a-held-essay', '2026-01-01', { without: ['map-2'] });

  it('removes the map from the essay\'s maps and does not release it', () => {
    expect(patches[essay.id]!.maps).toEqual([id('map', 1)]);
    expect(Object.keys(patches)).not.toContain(id('map', 2));
    expect(patches[id('map', 1)]).toEqual({ lifecycle: 'published', release: 'released' });
  });

  it('is an error to leave out a map the essay does not use', () => {
    expect(() => previewPatches(records, 'a-held-essay', '2026-01-01', { without: ['map-9'] })).toThrow(/map-9/);
  });
});

describe('stripMapFigures', () => {
  const gone = 'tc:tc:map:map-000002';
  const kept = 'tc:tc:map:map-000001';

  it('removes the figure of each named map, in either self-closing spelling, and nothing else', () => {
    const body = [
      'First paragraph.',
      '',
      `<MapFigure map="${kept}" />`,
      '',
      `<MapFigure map="${gone}"/>`,
      'Text that follows a figure.',
      `<MapFigure   map="${gone}"   />`,
      `A claim.<Cite evidence="tc:tc:evidence:evidence-000001" />`,
    ].join('\n');
    const out = stripMapFigures(body, [gone]);
    expect(out).toContain(`<MapFigure map="${kept}" />`);
    expect(out).not.toContain(gone);
    expect(out).toContain('Text that follows a figure.');
    expect(out).toContain('<Cite evidence="tc:tc:evidence:evidence-000001" />');
    expect(out.match(/<MapFigure/g)).toHaveLength(1);
  });
});

describe('an essay that does not exist', () => {
  const records = [record('essay', 1, { slug: 'a-held-essay' })];

  it('is a clear error naming the slug, for the selection and for the patches alike', () => {
    expect(() => selectUsedRecords(records, 'no-such-essay')).toThrow(/no essay with the slug no-such-essay/);
    expect(() => previewPatches(records, 'no-such-essay', '2026-01-01')).toThrow(/no essay with the slug no-such-essay/);
  });
});

