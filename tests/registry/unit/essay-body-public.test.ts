import { describe, expect, it } from 'vitest';
import { scanEssayBody } from '../../../src/registry/essay-body.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { evidence, source } from '../support/builders.js';
import { VALID_BODY, essayAt, world } from '../support/essays.js';

/*
 * Spec 003 T016 (FR-017): at Publish everything the body embeds or cites is published and
 * released. A held entity may still be referenced from metadata; only the body is public text.
 */
const held = (family: string) => (all: RegistryRecord[]) =>
  all.map((r) => (r.family === family ? { ...r, release: 'held', lifecycle: 'researching' } : r));

const hits = (change: (all: RegistryRecord[]) => RegistryRecord[] = (all) => all, essay: Partial<RegistryRecord> = {}, stage: 'Publish' | 'Build' = 'Publish') =>
  validateRegistry([...change(world(true)), essayAt(stage, essay)]).violations.filter((v) => v.rule === 'ESSAY-BODY-PUBLIC');

describe('ESSAY-BODY-PUBLIC', () => {
  it('passes when everything in the body is public', () => {
    expect(hits()).toEqual([]);
  });

  it('fails a map figure whose map is held', () => {
    const found = hits(held('map'));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', entity: 'tc:tc:essay:essay-000001' });
    expect(JSON.stringify(found[0]!.value)).toContain('tc:tc:map:map-000001');
  });

  it('fails a citation and an evidence panel whose evidence is held', () => {
    const found = hits(held('evidence'));
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.every((v) => JSON.stringify(v.value).includes('evidence-000001'))).toBe(true);
  });

  it('fails an entity that is released but not published', () => {
    const found = hits((all) => all.map((r) => (r.family === 'map' ? { ...r, lifecycle: 'verified' } : r)));
    expect(found).toHaveLength(1);
  });

  it('fails an entity that is published but not released', () => {
    const found = hits((all) => all.map((r) => (r.family === 'map' ? { ...r, release: 'held' } : r)));
    expect(found).toHaveLength(1);
  });

  it('passes when only metadata references a held entity', () => {
    expect(hits(held('layer'))).toEqual([]);
    expect(hits(held('bibliography_entry'))).toEqual([]);
  });

  it('fails a citation whose evidence is public but whose source is held', () => {
    const found = hits((all) => all.map((r) => (r.family === 'source' ? { ...r, release: 'held', lifecycle: 'researching' } : r)));
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.every((v) => JSON.stringify(v.value).includes('source-000001'))).toBe(true);
  });

  it('fails a citation whose source is public but whose bibliography entry is held', () => {
    const found = hits((all) =>
      all.map((r) => {
        if (r.family === 'source') return { ...r, entry: 'tc:tc:bibliography_entry:bibliography_entry-000001' };
        if (r.family === 'bibliography_entry') return { ...r, release: 'held', lifecycle: 'researching' };
        return r;
      }),
    );
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.every((v) => JSON.stringify(v.value).includes('bibliography_entry-000001'))).toBe(true);
  });

  it('fails a declared interaction whose evidence is held', () => {
    const interaction = { id: 'i1', component: 'compare-slider', question: 'q', interpretation: 'i', evidence: ['tc:tc:evidence:evidence-000002'] };
    const found = hits((all) => [...all, evidence(2, { release: 'held', lifecycle: 'researching' })], { interactions: [interaction] });
    expect(found).toHaveLength(1);
    expect(JSON.stringify(found[0]!.value)).toContain('evidence-000002');
  });

  it('passes when the held thing is a source no cited evidence rests on', () => {
    const extra = (all: RegistryRecord[]) => [...all, source(2, { release: 'held', lifecycle: 'researching' })];
    expect(hits(extra)).toEqual([]);
  });

  it('names each held figure separately', () => {
    const body = scanEssayBody(`${VALID_BODY}\n\n<MapFigure map="tc:tc:map:map-000002" />`);
    const extra = (all: RegistryRecord[]) => {
      const heldAll = held('map')(all);
      return [...heldAll, { ...heldAll.find((r) => r.family === 'map')!, id: 'tc:tc:map:map-000002', file: 'content/map/map-000002.yaml', slug: 'm2' }];
    };
    expect(hits(extra, { body }).length).toBeGreaterThanOrEqual(2);
  });

  it('is silent before Publish: a draft may cite held entities', () => {
    expect(hits(held('map'), {}, 'Build')).toEqual([]);
  });
});
