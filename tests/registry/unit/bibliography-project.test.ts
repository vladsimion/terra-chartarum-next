import { describe, expect, it } from 'vitest';
import { projectPublic } from '../../../src/registry/project.js';
import { layer, record, source } from '../support/builders.js';
import { HELD, PUBLIC, entry } from '../support/bibliography.js';

/*
 * Spec 006 T015 (data-model.md "Public projection"): what a page or payload may see of an entry and
 * a Source. The CSL-JSON file is public by construction and read by the pure modules from its path;
 * the YAML adds only what the allowlist names.
 */
const secret = { private: { note: 'secret' }, slug_history: ['old'], origin: 'minted', file: 'content/x.yaml' };

describe('the public projection of a bibliography entry', () => {
  const full = entry(2, { ...PUBLIC, ...secret, section: 'primary_sources', edition_of: entry(1).id, translation_of: entry(3).id, digital_copy: 'https://example.org/copy' });
  const world = [entry(1, PUBLIC), full, entry(3, HELD)];
  const projected = () => projectPublic(world).find((r) => r.id === full.id)!;

  it('carries the allowlist and nothing else', () => {
    expect(Object.keys(projected()).sort()).toEqual(['csl', 'digital_copy', 'edition_of', 'family', 'id', 'lifecycle', 'relations', 'release', 'section', 'slug', 'title']);
    expect(JSON.stringify(projected())).not.toMatch(/secret|old|content\/x\.yaml/);
  });

  it('keeps an edition and drops a translation that is held', () => {
    expect(projected().edition_of).toBe(entry(1).id);
    expect(projected().translation_of).toBeUndefined();
  });

  it('does not project a held entry', () => {
    expect(projectPublic([entry(1, HELD)])).toEqual([]);
  });
});

describe('the public projection of a source', () => {
  it('carries its entry (when public), kind and finding-aid flag', () => {
    const s = { ...source(1, { ...PUBLIC, ...secret, entry: entry(1).id, is_finding_aid: true, source_kind: 'archive' }) };
    const out = projectPublic([s, entry(1, PUBLIC)]).find((r) => r.id === s.id)!;
    expect(out).toMatchObject({ entry: entry(1).id, is_finding_aid: true, source_kind: 'archive' });
    expect(JSON.stringify(out)).not.toMatch(/secret/);
  });

  it('drops an entry that is held', () => {
    const s = source(1, { ...PUBLIC, entry: entry(1).id });
    expect(projectPublic([s, entry(1, HELD)]).find((r) => r.id === s.id)!.entry).toBeUndefined();
  });
});

describe('bibliography[] on a dataset and a layer', () => {
  it('projects the public entries and drops the held ones', () => {
    const l = layer(1, { ...PUBLIC, bibliography: [entry(1).id, entry(2).id] });
    const d = record('dataset', 1, { ...PUBLIC, version: '1', bibliography: [entry(1).id, entry(2).id] });
    const out = projectPublic([l, d, entry(1, PUBLIC), entry(2, HELD)]);
    expect(out.find((r) => r.id === l.id)!.bibliography).toEqual([entry(1).id]);
    expect(out.find((r) => r.id === d.id)!.bibliography).toEqual([entry(1).id]);
  });
});

/*
 * Spec 012 T017 (FR-014; Constitution V): an edition's place roles, its historiography note and its
 * survival reach pages, but never a held place, held Evidence or a held Source.
 */
describe('the public projection of an edition’s place roles', () => {
  const pub = (family: string, n: number, o: Record<string, unknown> = {}) => record(family, n, { ...PUBLIC, ...o });
  const dealu = pub('place', 1, { place_type: 'settlement' });
  const heldPlace = record('place', 2, { ...HELD, place_type: 'settlement' });
  const evPublic = pub('evidence', 1);
  const evHeld = record('evidence', 2, HELD);
  const srcPublic = pub('source', 1);
  const srcHeld = record('source', 2, HELD);
  const edition = entry(9, {
    ...PUBLIC,
    section: 'primary_sources',
    survival: 'surviving',
    place_roles: [
      { place: dealu.id, role: 'produced_at', basis: 'attributed', confidence: 'probable', evidence: [evPublic.id, evHeld.id], private_note: 'x' },
      { place: heldPlace.id, role: 'held_at', basis: 'stated', confidence: 'probable', holder: 'A Library', valid_from: '1900', evidence: [] },
      { place: dealu.id, role: 'held_at', basis: 'stated', confidence: 'possible', holder: 'Dealu Monastery', shelfmark: 'D 1', valid_from: '1508', valid_to: '1821', evidence: [evPublic.id] },
    ],
    attribution_history: [
      { place: dealu.id, source: srcPublic.id, note: 'Venice, after older catalogues.' },
      { place: heldPlace.id, source: srcHeld.id, note: 'A held lead.' },
    ],
  });
  // evidence targets the edition, so the projection keeps the public one
  evPublic.target = { entity: edition.id };
  const projected = () => projectPublic([dealu, heldPlace, evPublic, evHeld, srcPublic, srcHeld, edition]).find((r) => r.id === edition.id)!;

  it('keeps each role whose place is public, with only its allowlisted parts and public evidence', () => {
    expect(projected().place_roles).toEqual([
      { place: dealu.id, role: 'produced_at', basis: 'attributed', confidence: 'probable', evidence: [evPublic.id] },
      { place: dealu.id, role: 'held_at', basis: 'stated', confidence: 'possible', holder: 'Dealu Monastery', shelfmark: 'D 1', valid_from: '1508', valid_to: '1821', evidence: [evPublic.id] },
    ]);
  });

  it('keeps the historiography note, dropping an item whose place or source is held, note and all', () => {
    expect(projected().attribution_history).toEqual([{ place: dealu.id, source: srcPublic.id, note: 'Venice, after older catalogues.' }]);
    expect(JSON.stringify(projected())).not.toContain('A held lead');
  });

  it('carries survival, and names no held record anywhere', () => {
    expect(projected().survival).toBe('surviving');
    const text = JSON.stringify(projected());
    for (const held of [heldPlace, evHeld, srcHeld]) expect(text).not.toContain(held.id);
    expect(text).not.toContain('private_note');
  });
});

/*
 * Spec 012 T042 (FR-009, FR-015; ADR 0023): a public person carries their names, life dates and
 * public bibliography; an edition's person links reach pages only for a public person, and name only
 * public evidence.
 */
describe('the public projection of people and person links', () => {
  const coresi = record('person', 1, { ...PUBLIC, title: 'Coresi', names: [{ name: 'Coresi', language: 'ro', kind: 'historic' }], life_dates: '1510?/1583?', bibliography: [entry(8).id], private: { note: 'secret' } });
  const heldPerson = record('person', 2, { ...HELD, title: 'A held printer' });
  const ev = record('evidence', 1, { ...PUBLIC });
  const edition = entry(9, {
    ...PUBLIC,
    section: 'primary_sources',
    people: [
      { person: coresi.id, role: 'printer', basis: 'stated', confidence: 'probable', evidence: [ev.id, 'tc:tc:evidence:evidence-000099'] },
      { person: heldPerson.id, role: 'printer', basis: 'attributed', confidence: 'possible', evidence: [] },
    ],
  });
  ev.target = { entity: edition.id };
  const world = [coresi, heldPerson, ev, edition, entry(8, PUBLIC)];

  it('projects a public person with only its allowlisted fields', () => {
    const out = projectPublic(world).find((r) => r.id === coresi.id)!;
    expect(Object.keys(out).sort()).toEqual(['bibliography', 'family', 'id', 'life_dates', 'lifecycle', 'names', 'relations', 'release', 'slug', 'title']);
    expect(JSON.stringify(out)).not.toMatch(/secret/);
  });

  it('keeps a link to a public person, with public evidence only, and drops a held person whole', () => {
    const out = projectPublic(world).find((r) => r.id === edition.id)!;
    expect(out.people).toEqual([{ person: coresi.id, role: 'printer', basis: 'stated', confidence: 'probable', evidence: [ev.id] }]);
    expect(JSON.stringify(out)).not.toMatch(/person-000002|A held printer/);
  });
});
