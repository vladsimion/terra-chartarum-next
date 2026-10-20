import { describe, expect, it } from 'vitest';
import { emptyRoot, record, stage, text } from '../support/run.js';
import { copyFixture, edit } from '../support/run.js';
import { ImportError } from '../../../src/migration/context.js';
import { UnmappedTermError } from '../../../src/migration/vocab.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/*
 * Spec 008 T018, T020, T022 (FR-001, FR-010 to FR-016): what the v1 profile makes of the snapshot
 * fixture, record by record. Every record is held at researching, keeps its legacy id as the local-id
 * and the slug, and says what it could not fill.
 */
describe('every record', () => {
  it('is a legacy, held record at researching, with its legacy local-id as id and slug, and no editor confirmation', async () => {
    const result = await stage();
    for (const [file, content] of result.files) {
      if (!file.endsWith('.yaml') || !file.startsWith('content/')) continue;
      const r = record(result, file.split('/')[1] as string, (file.split('/')[2] as string).replace('.yaml', ''));
      const local = String(r.id).split(':').slice(3).join(':');
      expect(r.release, file).toBe('held');
      // a minted entry is not a legacy record: it has no slug history to start
      if (r.family !== 'bibliography_entry') expect(r.slug_history, file).toEqual([]);
      expect(r.editor_confirmed, file).toBeUndefined();
      if (r.family !== 'bibliography_entry') expect(r.slug, file).toBe(local);
      if (r.origin === 'legacy') expect(r.lifecycle === 'researching' || r.family === 'layer', file).toBe(true);
      expect(String(r.id), file).toMatch(/^tc:tc:[a-z_]+:[A-Za-z0-9._-]+$/);
      void content;
    }
  });
});

describe('the maps adapter', () => {
  it('qualifies the id, keeps the slug, and converts the year to EDTF', async () => {
    const m = record(await stage(), 'map', 'plan-of-a-fort');
    expect(m).toMatchObject({ id: 'tc:tc:map:plan-of-a-fort', slug: 'plan-of-a-fort', title: 'Plan of a Fort', date_published: '-0600', significance: 'A plan drawn on clay.' });
    expect(record(await stage(), 'map', 'treatise-on-roads').date_published).toBe('0106');
  });

  it('maps record scope and custody for an object, a work, a concept, an unlocated object and a plain sheet, keeping the originals', async () => {
    const result = await stage();
    const scope = (id: string) => {
      const m = record(result, 'map', id);
      return [m.record_scope, m.witness_kind, m.legacy_record_scope, m.legacy_custody];
    };
    expect(scope('plan-of-a-fort')).toEqual(['object', 'institutional', 'object', 'institutional']);
    expect(scope('treatise-on-roads')).toEqual(['work', undefined, 'work', undefined]);
    expect(scope('idea-of-a-frontier')).toEqual(['concept', undefined, 'concept', undefined]);
    expect(scope('lost-chart')).toEqual(['object', 'unlocated', 'object', 'unlocated']);
    expect(scope('ordinary-sheet')).toEqual(['object', undefined, undefined, undefined]);
    expect(record(result, 'map', 'ordinary-sheet').field_status).toMatchObject({ witness_kind: 'not_yet_verified' });
    expect(record(result, 'map', 'plan-of-a-fort').legacy_publication_status).toBe('published_witness');
  });

  it('resolves a cartographer id to the imported cartographer, and keeps free-text makers as text with the field status', async () => {
    const result = await stage();
    expect(record(result, 'map', 'plan-of-a-fort').makers).toEqual(['tc:tc:cartographer:mapmaker-one']);
    const sheet = record(result, 'map', 'ordinary-sheet');
    expect(sheet.makers).toBeUndefined();
    expect(sheet.edition_state).toContain('A. Engraver');
    expect(sheet.edition_state).toContain('A. Publisher');
    expect(sheet.field_status).toMatchObject({ makers: 'not_yet_verified' });
  });

  it('turns related maps into relations and uncertainties into open questions', async () => {
    const result = await stage();
    expect(record(result, 'map', 'treatise-on-roads').relations).toEqual(['tc:tc:map:plan-of-a-fort']);
    expect(record(result, 'map', 'plan-of-a-fort').open_questions).toEqual([{ field: 'provenance', question: 'No registration number is recorded.', would_resolve: 'The library record for the tablet.' }]);
  });

  it('points an image at the archive, uncleared, and copies no image into the staged files', async () => {
    const result = await stage();
    expect(record(result, 'map', 'plan-of-a-fort').images).toEqual([
      {
        type: 'static',
        url: 'https://terra-chartarum.pages.dev/images/plan-of-a-fort.jpg',
        static_url: 'https://terra-chartarum.pages.dev/images/plan-of-a-fort.jpg',
        attribution: 'Courtesy of a fixture library',
        licence: 'CC BY 4.0',
        alt: 'A plan of a fort',
        witness_kind: 'institutional',
        reproduction_cleared: false,
      },
    ]);
    expect([...result.files.keys()].filter((f) => /\.(jpe?g|png|gif|webp|tiff?)$/i.test(f))).toEqual([]);
  });

  it('says what it could not fill instead of leaving it blank', async () => {
    const m = record(await stage(), 'map', 'ordinary-sheet');
    expect(m.field_status).toMatchObject({ title_original: 'not_yet_verified', coverage: 'not_yet_verified', dimensions: 'not_yet_verified' });
  });

  it('fails, naming the map and the item, for a bibliography reference that is not in bibliography.ts', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("bibliography: ['smith-2001'", "bibliography: ['nobody-1900'"));
    await expect(stage(dir)).rejects.toThrow(/plan-of-a-fort.*nobody-1900/);
  });
});

describe('the cartographers adapter', () => {
  it('keeps names and life dates, and writes the biography as a Markdown file beside the record', async () => {
    const result = await stage();
    expect(record(result, 'cartographer', 'mapmaker-one')).toMatchObject({ id: 'tc:tc:cartographer:mapmaker-one', title: 'Ada Mapmaker', kind: 'person', names: ['Mapmaker, Ada'], life_dates: '1512/1594' });
    expect(text(result, 'content/cartographer/mapmaker-one.md')).toBe('A fixture cartographer.\n\nShe drew the plan of a fort.\n');
  });
});

describe('the bibliography adapter', () => {
  it('makes a Source with the legacy id for each item, pointing at a minted entry, with no section', async () => {
    const result = await stage();
    const source = record(result, 'source', 'smith-2001');
    expect(source).toMatchObject({ id: 'tc:tc:source:smith-2001', is_finding_aid: false });
    const entry = record(result, 'bibliography_entry', String(source.entry).split(':')[3] as string);
    expect(entry).toMatchObject({ origin: 'minted', release: 'held', lifecycle: 'researching' });
    expect(entry.section).toBeUndefined();
    expect(JSON.parse(text(result, `content/bibliography_entry/${String(source.entry).split(':')[3]}.csl.json`))).toMatchObject({ id: source.entry, type: 'document', title: 'The Fixture Atlas', author: [{ literal: 'Smith, J.' }], issued: { 'date-parts': [[2001]] }, URL: 'https://example.org/smith' });
  });

  it('turns an inline citation into an entry through the matcher: a work the legacy list has is matched, a new one is minted', async () => {
    const result = await stage();
    const doe = record(result, 'source', 'doe-1999').entry;
    expect(record(result, 'map', 'plan-of-a-fort').bibliography).toEqual([record(result, 'source', 'smith-2001').entry, doe]);
    expect(result.report.matched).toEqual(expect.arrayContaining([expect.objectContaining({ entry: doe, rule: 'weak' })]));
    const roe = (record(result, 'map', 'idea-of-a-frontier').bibliography as string[])[1] as string;
    expect(roe).not.toBe(doe);
    expect(text(result, `content/bibliography_entry/${roe.split(':')[3]}.csl.json`)).toContain('Frontiers');
  });

  it('takes the citation text as the title of an inline citation that has none, as one real map does', async () => {
    const dir = copyFixture();
    edit(dir, 'src/lib/corpus.ts', (t) => t.replace("id: 'lost-chart',", "id: 'lost-chart', bibliography: [{ citation: 'Poe, E. (1845) A Chart Remembered.', url: 'https://example.org/poe', author: 'Poe, E.', year: 1845 }],"));
    const result = await stage(dir);
    const entry = (record(result, 'map', 'lost-chart').bibliography as string[])[0] as string;
    expect(text(result, `content/bibliography_entry/${entry.split(':')[3]}.csl.json`)).toContain('"title": "Poe, E. (1845) A Chart Remembered."');
  });

  it('mints entries in order from 1 in an empty registry', async () => {
    const result = await stage();
    expect([...result.files.keys()].filter((f) => f.endsWith('.yaml') && f.includes('bibliography_entry'))).toEqual(
      ['000001', '000002', '000003', '000004', '000005'].map((n) => `content/bibliography_entry/bibliography_entry-${n}.yaml`),
    );
  });
});

describe('the toponyms adapter', () => {
  it('keeps the names, the location and the identifiers, and relates a toponym to its CND place without merging them', async () => {
    const result = await stage();
    const p = record(result, 'place', 'nowhere');
    expect(p).toMatchObject({ id: 'tc:tc:place:nowhere', title: 'Nowhere', location: { lon: 23.3, lat: 45.6 } });
    expect(p.names).toEqual([
      { name: 'Nowhere', language: 'und', kind: 'modern' },
      { name: 'Nusquam', language: 'und', kind: 'historic' },
      { name: 'Nowhereville', language: 'und', kind: 'historic' },
    ]);
    expect(p.same_as).toEqual([{ authority: 'pleiades', id: '12345' }]);
    expect(p.relations).toEqual(['tc:tc:map:plan-of-a-fort', 'tc:tc:place:plc-nowhere']);
    expect(record(result, 'place', 'plc-nowhere').id).toBe('tc:tc:place:plc-nowhere');
  });

  it('reads a negative longitude', async () => {
    expect(record(await stage(), 'place', 'elsewhere').location).toEqual({ lon: -1.5, lat: 50 });
  });
});

describe('the layers, datasets and collections adapters', () => {
  it('makes a dataset for each release asset, versioned by the snapshot', async () => {
    expect(record(await stage(), 'dataset', 'fort-sites')).toMatchObject({ id: 'tc:tc:dataset:fort-sites', title: 'Fort sites', version: 'legacy-e82afd9', licence: 'CC BY 4.0', rights: { licence: 'CC BY 4.0', attribution: 'The Fixture Survey' } });
  });

  it('maps a layer: lifecycle through the legacy map, envelope, time mode, theme, facets, documentation, rights, dataset and copied source', async () => {
    const result = await stage();
    expect(record(result, 'layer', 'fort-sites')).toMatchObject({
      id: 'tc:tc:layer:fort-sites',
      lifecycle: 'qa',
      legacy_layer_status: 'in-review',
      release: 'held',
      role: 'historical',
      theme: 'places-settlements',
      envelope: '-0600/0106',
      time_mode: 'per_feature',
      asset: 'data/layers/fort-sites.geojson',
      dataset: 'tc:tc:dataset:fort-sites',
      facets: [{ property: 'type', label: 'type', kind: 'category' }, { property: 'garrison', label: 'garrison', kind: 'category' }],
      documentation: [{ label: 'Data dictionary', url: 'https://example.org/dictionary' }],
      rights: { licence: 'CC BY 4.0', attribution: 'The Fixture Survey' },
    });
    expect(text(result, 'data/layers/fort-sites.geojson')).toContain('"f1"');
  });

  it('leaves a context layer with no theme and researching, as the legacy site had no category for it', async () => {
    const layer = record(await stage(), 'layer', 'fixture-coast');
    expect(layer.theme).toBeUndefined();
    expect(layer).toMatchObject({ lifecycle: 'researching', time_mode: 'envelope_only', envelope: '-6000/2024' });
  });

  it('resolves a collection’s members and defaults to layer ids, and fails for a layer that is not imported', async () => {
    expect(record(await stage(), 'collection', 'fixture-collection')).toMatchObject({ members: ['tc:tc:layer:fixture-coast', 'tc:tc:layer:fort-sites'], default_layers: ['tc:tc:layer:fort-sites'], description: 'Forts come on with the coast.' });
    const dir = copyFixture();
    edit(dir, 'src/lib/geo-collections.ts', (t) => t.replace("layerIds: ['fixture-coast', 'fort-sites']", "layerIds: ['fixture-coast', 'ghost']"));
    await expect(stage(dir)).rejects.toThrow(/fixture-collection.*ghost/);
  });

  it('fails for a layer with no release asset', async () => {
    const dir = copyFixture();
    edit(dir, 'data/geo/catalog.json', (t) => t.replace('"id": "fort-sites"', '"id": "other"'));
    await expect(stage(dir)).rejects.toThrow(ImportError);
  });
});

describe('the Dacia profile', () => {
  it('imports the pilot places and the Trench A sources only', async () => {
    const result = await stage();
    expect(result.files.has('content/place/plc-nowhere.yaml')).toBe(true);
    expect(result.files.has('content/place/plc-elsewhere.yaml')).toBe(false);
    expect(result.files.has('content/source/src-one.yaml')).toBe(true);
    expect(result.files.has('content/source/src-two.yaml')).toBe(false);
  });

  it('maps a place and a source, keeping the review state and the identifiers', async () => {
    const result = await stage();
    expect(record(result, 'place', 'plc-nowhere')).toMatchObject({ title: 'Nowhere', place_type: 'settlement', location_status: 'located', location: { lon: 23.3, lat: 45.6 }, same_as: [{ authority: 'pleiades', id: '12345' }], legacy_review_state: 'normalized', legacy_normalization_method: 'imported' });
    const source = record(result, 'source', 'src-one');
    expect(source).toMatchObject({ id: 'tc:tc:source:src-one', source_kind: 'inscription', is_finding_aid: false });
    expect(text(result, `content/bibliography_entry/${String(source.entry).split(':')[3]}.csl.json`)).toContain('A Stela, Described');
  });

  it('keeps the original CND geometry term on the place and names the vocabulary that maps it (FR-016)', async () => {
    const result = await stage();
    expect(record(result, 'place', 'plc-nowhere')).toMatchObject({ vocabulary: 'cnd', geometry_provenance: 'scholarly_reconstruction' });
    expect(result.report.report_only).not.toContainEqual(expect.objectContaining({ key: 'ref_geometry_provenance' }));
    expect(result.report.dropped).not.toContainEqual(expect.objectContaining({ field: 'ref_geometry_provenance' }));
  });

  it('fails for a geometry term with no mapping, naming the term, the vocabulary and the place', async () => {
    const root = emptyRoot();
    mkdirSync(path.join(root, 'vocab-mappings'), { recursive: true });
    writeFileSync(path.join(root, 'vocab-mappings/cnd.yaml'), 'vocabulary: cnd\ngeometry_provenance:\n  modern_reference: modern_reference\n');
    await expect(stage(undefined, root)).rejects.toThrow(UnmappedTermError);
    await expect(stage(undefined, root)).rejects.toThrow(/scholarly_reconstruction.*cnd.*plc-nowhere/);
  });
});
