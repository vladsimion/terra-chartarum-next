import { describe, expect, it } from 'vitest';
import { schemaFor } from '../../../src/registry/schemas/index.js';
import { layer, place, record } from '../support/builders.js';
import { entry, hitsOf, pointing } from '../support/bibliography.js';

const dataset = (n: number, o: Record<string, unknown> = {}) => record('dataset', n, { version: '1', ...o } as never);

/*
 * Spec 006 T005 (FR-001, FR-003, FR-006, FR-010, FR-011, FR-016, data-model.md): the shapes of the
 * clarified spec. References are judged by the registry's reference rules; a value outside its set
 * is judged by the rules named in bib-rule-ids.md.
 */
const parseEntry = (o: Record<string, unknown>) => schemaFor('bibliography_entry').safeParse(entry(1, o as never));

describe('the bibliography entry schema', () => {
  it('loads an entry with every clarified field', () => {
    const parsed = schemaFor('bibliography_entry').parse(
      entry(2, { section: 'primary_sources', edition_of: entry(1).id, translation_of: entry(3).id, digital_copy: 'https://archive.example.org/copy' }),
    );
    expect(parsed.section).toBe('primary_sources');
    expect(parsed.edition_of).toBe(entry(1).id);
    expect(parsed.translation_of).toBe(entry(3).id);
    expect(parsed.digital_copy).toBe('https://archive.example.org/copy');
  });

  it('takes digital_copy only as an https URL', () => {
    expect(parseEntry({ digital_copy: 'https://example.org/x' }).success).toBe(true);
    expect(parseEntry({ digital_copy: 'http://example.org/x' }).success).toBe(false);
    expect(parseEntry({ digital_copy: 'not a url' }).success).toBe(false);
  });

  it('carries no rights, identifiers or keywords in the YAML (FR-011, FR-001)', () => {
    expect(hitsOf('FAM-UNKNOWN', [entry(1, { rights: { licence: 'CC0' } })]).map((v) => v.field)).toEqual(['rights']);
    expect(hitsOf('FAM-UNKNOWN', [entry(1, { doi: '10.1/x' })]).map((v) => v.field)).toEqual(['doi']);
    expect(hitsOf('FAM-UNKNOWN', [entry(1, { section: 'primary_sources', edition_of: entry(2).id }), entry(2)])).toEqual([]);
  });
});

describe('the source schema', () => {
  it('carries no rights in the YAML either (FR-011)', () => {
    expect(hitsOf('FAM-UNKNOWN', [pointing(1, entry(1), { rights: { licence: 'CC0' } })]).map((v) => v.field)).toEqual(['rights']);
  });

  it('loads a source with the entry it points at', () => {
    expect(schemaFor('source').parse(pointing(1, entry(1))).entry).toBe(entry(1).id);
  });

  it('still loads a source with none, so a research record is not refused (SRC-ENTRY judges it)', () => {
    expect(schemaFor('source').safeParse(pointing(1, null)).success).toBe(true);
  });
});

describe('bibliography[] on a dataset and a layer', () => {
  it('loads on both', () => {
    expect(schemaFor('dataset').parse(dataset(1, { bibliography: [entry(1).id] })).bibliography).toEqual([entry(1).id]);
    expect(schemaFor('layer').parse(layer(1, { bibliography: [entry(1).id] })).bibliography).toEqual([entry(1).id]);
  });

  it('is a list of strings', () => {
    expect(schemaFor('dataset').safeParse(dataset(1, { bibliography: 'x' as never })).success).toBe(false);
  });
});

describe('the references (REF-UNKNOWN, REF-FAMILY)', () => {
  it('resolve a source entry, an edition, a translation and a dataset or layer bibliography to entries', () => {
    const records = [
      entry(1),
      entry(2, { edition_of: entry(1).id, translation_of: entry(1).id }),
      pointing(1, entry(1)),
      dataset(1, { bibliography: [entry(1).id] }),
      layer(1, { bibliography: [entry(1).id] }),
    ];
    expect(hitsOf('REF-UNKNOWN', records)).toEqual([]);
    expect(hitsOf('REF-FAMILY', records)).toEqual([]);
  });

  it('flag a reference to something that is not there, or is not an entry', () => {
    const ghost = 'tc:tc:bibliography_entry:bibliography_entry-000099';
    const records = [
      entry(1, { edition_of: ghost }),
      pointing(1, null, { entry: place(1).id }),
      place(1),
      dataset(1, { bibliography: [place(1).id] }),
    ];
    expect(hitsOf('REF-UNKNOWN', records).map((v) => v.field)).toEqual(['edition_of']);
    expect(hitsOf('REF-FAMILY', records).map((v) => v.field).sort()).toEqual(['bibliography[0]', 'entry']);
  });
});
