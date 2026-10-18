import { beforeAll, describe, expect, it } from 'vitest';
import type { PublicRecord } from '../../../src/registry/project.js';
import { recordView } from '../../../src/collection/record-view.js';
import { byId, loadFixture, mapId } from '../support/fixture.js';

/*
 * Spec 004 T023 (US1 scenarios 2 to 6): what a record page shows, decided from the public records
 * before any component runs. Every displayed field has a value or its stated status; a held witness
 * separates observed from inferred; attribution carries its evidence; an uncleared image is
 * withheld with no address; an unresolved workshop attribution says so.
 */
let records: PublicRecord[] = [];
beforeAll(async () => {
  records = await loadFixture();
});
const view = (n: number) => recordView(byId(records, mapId(n)), records);
const row = (n: number, field: string) => view(n).rows.find((r) => r.field === field)!;

describe('the displayed fields (scenario 2)', () => {
  it('lists every displayed field once, in a fixed order', () => {
    expect(view(1).rows.map((r) => r.field)).toEqual([
      'title_original', 'makers', 'date_published', 'publication_place', 'edition_state', 'atlas_context', 'dimensions',
      'language', 'coverage', 'significance', 'provenance', 'georeferencing_status', 'images',
    ]);
  });

  it('gives a recorded field its value and no status text', () => {
    expect(row(1, 'date_published')).toMatchObject({ status: 'recorded', value: '1595', statusText: null });
    expect(row(1, 'dimensions').value).toBe('420 × 540 mm');
    expect(row(1, 'publication_place').value).toBe('Fixture Town');
    expect(row(1, 'coverage').value).toEqual(['Fixture Valley', 'Fixtureland']);
    expect(row(1, 'makers').value).toEqual(['A fixture cartographer']);
  });

  it('says so, in words, when a field is unknown or not yet verified, never a blank', () => {
    expect(row(6, 'date_published')).toMatchObject({ status: 'unknown', value: null, statusText: 'Unknown' });
    expect(row(6, 'images')).toMatchObject({ status: 'not_yet_verified', value: null, statusText: 'Not yet verified' });
  });

  it('has a value or a status text on every row of every public fixture map', () => {
    for (const n of [1, 2, 3, 4, 6]) {
      for (const r of view(n).rows) expect(r.value !== null || (r.statusText ?? '') !== '', `${n} ${r.field}`).toBe(true);
    }
  });
});

describe('the witness (scenario 4)', () => {
  it('labels a held witness as held by this project, inspected', () => {
    expect(view(1).witness).toEqual({ kind: 'held', label: 'Held by this project' });
    expect(view(1).verification).toMatchObject({ label: 'Inspected in person', lastVerified: '2026-09-15' });
  });

  it('labels an institutional witness with its repository', () => {
    expect(view(2).witness).toEqual({ kind: 'institutional', label: 'Institutional copy: Fixture Library' });
    expect(view(2).verification.label).toBe('Checked online');
  });

  it('marks a held witness’s provenance and atlas context as observed or inferred', () => {
    expect(row(1, 'provenance').basis).toBe('Observed');
    expect(row(1, 'atlas_context').basis).toBe('Inferred');
  });

  it('carries no basis on an institutional witness or on other fields', () => {
    expect(row(2, 'provenance').basis).toBeNull();
    expect(row(1, 'significance').basis).toBeNull();
  });
});

describe('attribution (scenarios 3 and 6)', () => {
  it('lists the evidence behind an attribution with its source and locator', () => {
    expect(view(1).attribution.evidence).toEqual([
      expect.objectContaining({ id: 'tc:tc:evidence:evidence-000001', sourceTitle: 'A fixture source 1', locator: 'p. 12' }),
    ]);
  });

  it('links a public maker to its profile', () => {
    expect(view(1).attribution.makers).toEqual([{ id: 'tc:tc:cartographer:cartographer-000001', name: 'A fixture cartographer', href: '/cartographers/fixture-cartographer/', workshop: false }]);
  });

  it('says the maker is not individually established for a workshop, and names it', () => {
    const attribution = view(3).attribution;
    expect(attribution.state).toBe('unresolved');
    expect(attribution.makers[0]).toMatchObject({ name: 'A fixture workshop', workshop: true });
    expect(attribution.note).toBe('Maker not individually established. Attributed to the workshop: A fixture workshop.');
  });

  it('has no note for an exact attribution', () => {
    expect(view(1).attribution).toMatchObject({ state: 'exact', note: null });
  });
});

describe('the image decision (scenario 5, FR-005)', () => {
  it('shows a cleared image with its attribution and licence', () => {
    const image = view(2).image;
    expect(image.decision).toBe('show');
    expect(image.images).toEqual([
      expect.objectContaining({
        type: 'iiif',
        infoUrl: 'https://example.org/iiif/road/info.json',
        stillUrl: 'https://example.org/iiif/road/full/800,/0/default.jpg',
        attribution: 'Fixture Library',
        licence: 'CC BY 4.0',
        alt: 'A road sheet showing a route through the valley',
      }),
    ]);
  });

  it('uses a static image as its own still and has no viewer address', () => {
    expect(view(1).image.images[0]).toMatchObject({ type: 'static', stillUrl: 'https://example.org/maps/frontier.jpg', infoUrl: null });
  });

  it('withholds an image whose reproduction is not cleared, with the reason and no address', () => {
    const image = view(4).image;
    expect(image).toEqual({ decision: 'withheld', reason: 'Reproduction of this image has not been cleared, so it is not shown here.', images: [] });
    expect(JSON.stringify(image)).not.toContain('example.org');
  });

  it('says there is no image when a record has none', () => {
    expect(view(6).image).toEqual({ decision: 'none', reason: null, images: [] });
  });

  it('shows the licence line only when a licence exists', () => {
    const noLicence = { ...byId(records, mapId(1)), rights: { reproduction_cleared: true } } as PublicRecord;
    expect(recordView(noLicence, records).image.images[0]!.licence).toBeNull();
  });
});

describe('open questions and scope', () => {
  it('passes open questions through', () => {
    expect(view(1).openQuestions).toEqual([{ field: 'provenance', question: 'Which donor?', wouldResolve: "the project's accession register" }]);
  });

  it('labels a work or a concept as not a single copy', () => {
    const work = { ...byId(records, mapId(1)), record_scope: 'work', witness_kind: undefined, images: [] } as PublicRecord;
    expect(recordView(work, records).witness).toEqual({ kind: 'work', label: 'A work or edition, not a single copy' });
    expect(recordView({ ...work, record_scope: 'concept' } as PublicRecord, records).witness.label).toBe('A concept, not a physical sheet');
  });
});
