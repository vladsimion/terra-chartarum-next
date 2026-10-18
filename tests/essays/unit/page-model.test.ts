import { describe, expect, it } from 'vitest';
import { scanEssayBody } from '../../../src/registry/essay-body.js';
import type { PublicRecord } from '../../../src/registry/project.js';
import type { CslItem } from '../../../src/essays/citations.js';
import { buildEssayPage } from '../../../src/essays/page-model.js';

/*
 * Spec 003 US1: the page model joins an essay's body to the public records it names. It reads public
 * records only, and a body that names something that is not public, or a source that cannot be cited,
 * is a build error with the essay and the thing named, never a silent gap on the page.
 */
const rec = (id: string, family: string, extra: Record<string, unknown> = {}): PublicRecord => ({ id, family, title: id, slug: id.split(':').pop()!, ...extra });
const ENTRY = 'tc:tc:bibliography_entry:bibliography_entry-000001';
const CSL: CslItem = { id: ENTRY, type: 'book', title: 'A Book', author: [{ family: 'Doe', given: 'Jane' }], publisher: 'Press', issued: { 'date-parts': [[1999]] } };

const records: PublicRecord[] = [
  rec('tc:tc:cartographer:cartographer-000001', 'cartographer', { title: 'Lazius' }),
  rec('tc:tc:map:map-000001', 'map', { title: 'Tabula Daciae', slug: 'tabula', makers: ['tc:tc:cartographer:cartographer-000001'], rights: { licence: 'CC BY 4.0' } }),
  rec('tc:tc:bibliography_entry:bibliography_entry-000001', 'bibliography_entry', { section: 'primary_sources', csl: 'x.json' }),
  rec('tc:tc:source:source-000001', 'source', { title: 'The source', entry: ENTRY }),
  rec('tc:tc:evidence:evidence-000001', 'evidence', { source: 'tc:tc:source:source-000001', locator: { value: 'p. 12', state: 'pending' } }),
  rec('tc:tc:room:map', 'room', { title: 'Map', slug: 'map' }),
  rec('tc:tc:essay:essay-000002', 'essay', { title: 'Another', slug: 'another' }),
];
const essay = rec('tc:tc:essay:essay-000001', 'essay', {
  rooms: { primary: 'tc:tc:room:map' },
  bibliography: [ENTRY],
  relations: ['tc:tc:essay:essay-000002', 'tc:tc:essay:essay-000009'],
});
const build = (source: string, recs = records) => buildEssayPage({ essay, records: recs, body: scanEssayBody(source), cslFor: () => CSL });

const EV = 'tc:tc:evidence:evidence-000001';

describe('buildEssayPage', () => {
  const page = build(`Prose.<Cite evidence="${EV}" /> More.<Cite evidence="${EV}" />\n\n<MapFigure map="tc:tc:map:map-000001" />`);

  it('numbers each cited evidence record once, in order of appearance', () => {
    expect(page.notes).toHaveLength(1);
    expect(page.noteNumber(EV)).toBe(1);
    expect(page.noteNumber('tc:tc:evidence:evidence-000009')).toBeUndefined();
  });

  it('builds a note from the source’s bibliography entry and the locator', () => {
    expect(page.notes[0]).toMatchObject({ note: 'Jane Doe, A Book (Press, 1999), 12.', sourceTitle: 'The source', locator: 'p. 12' });
    expect(page.notes[0]!.verification.state).toBe('pending');
  });

  it('builds figures from public map records, naming the makers', () => {
    expect(page.figures.get('tc:tc:map:map-000001')?.caption).toBe('Tabula Daciae, Lazius');
  });

  it('lists the bibliography, the rooms and the related essays that are public', () => {
    expect(page.bibliography.map((g) => g.section)).toEqual(['primary_sources']);
    expect(page.rooms.map((r) => r.title)).toEqual(['Map']);
    expect(page.related.map((r) => r.title)).toEqual(['Another']);
  });

  it('gives the detail of any public evidence, cited or not', () => {
    expect(page.detail(EV).evidence).toBe(EV);
  });
});

describe('buildEssayPage errors', () => {
  it('names a figure whose map is not public', () => {
    expect(() => build('<MapFigure map="tc:tc:map:map-000099" />')).toThrow(/essay-000001.*map-000099.*not a public map/);
  });

  it('names a citation of evidence that is not public', () => {
    expect(() => build('<Cite evidence="tc:tc:evidence:evidence-000099" />')).toThrow(/evidence-000099.*not public evidence/);
  });

  it('names a source that has no bibliography entry', () => {
    const noEntry = records.map((r) => (r.family === 'source' ? { ...r, entry: undefined } : r));
    expect(() => build(`<Cite evidence="${EV}" />`, noEntry)).toThrow(/source-000001.*no public bibliography entry/);
  });

  it('refuses a body that types a map’s title instead of taking it from the figure', () => {
    expect(() => build('The Tabula Daciae is wrong.\n\n<MapFigure map="tc:tc:map:map-000001" />')).toThrow(/Tabula Daciae/);
  });

  it('names a bibliography entry that is not public', () => {
    const held = records.filter((r) => r.family !== 'bibliography_entry');
    expect(() => build('Prose.', held)).toThrow(/bibliography names .*bibliography_entry-000001/);
  });
});

describe('buildEssayPage interactions (spec 003 US4, FR-007)', () => {
  const declared = {
    id: 'frontier-slider',
    component: 'compare-slider',
    question: 'Does the road run where the line says?',
    interpretation: 'The road bends round the valley the surveyor left out.',
    evidence: [EV],
  };
  const withInteraction = { ...essay, interactions: [declared] };
  const buildWith = (source: string) => buildEssayPage({ essay: withInteraction, records, body: scanEssayBody(source), cslFor: () => CSL });

  it('gives the declared question, expected interpretation and evidence of an interaction the body uses', () => {
    const page = buildWith('<Interaction id="frontier-slider" />');
    const interaction = page.interaction('frontier-slider');
    expect(interaction).toMatchObject({ id: 'frontier-slider', question: declared.question, interpretation: declared.interpretation });
    expect(interaction.evidence.map((e) => e.evidence)).toEqual([EV]);
    expect(interaction.evidence[0]!.note).toBe('Jane Doe, A Book (Press, 1999), 12.');
  });

  it('names an interaction the body uses but the record does not declare', () => {
    expect(() => buildWith('<Interaction id="nothing-declared" />')).toThrow(/essay-000001.*nothing-declared.*not declared/);
  });

  it('names a declared interaction whose evidence is not public', () => {
    const held = { ...withInteraction, interactions: [{ ...declared, evidence: ['tc:tc:evidence:evidence-000099'] }] };
    expect(() => buildEssayPage({ essay: held, records, body: scanEssayBody('<Interaction id="frontier-slider" />'), cslFor: () => CSL })).toThrow(/frontier-slider.*evidence-000099/);
  });
});
