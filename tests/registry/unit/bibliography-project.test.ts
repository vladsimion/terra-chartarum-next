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
