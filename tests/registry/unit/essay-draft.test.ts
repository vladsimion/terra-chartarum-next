import { describe, expect, it } from 'vitest';
import { scanEssayBody } from '../../../src/registry/essay-body.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import type { EssayStage } from '../../../src/registry/stages.js';
import { EV, OTHER_EV, VALID_BODY, essayAt, registryWith, world } from '../support/essays.js';

/*
 * Spec 003 T014 (FR-004, FR-010): the draft needs a body; every citation resolves to Evidence that
 * does not rest on a finding aid; a framework tag's props must be string literals.
 */
const rule = (id: string, stage: EssayStage, overrides: Partial<RegistryRecord> = {}, records?: RegistryRecord[]) =>
  validateRegistry(records ?? registryWith(stage, overrides)).violations.filter((v) => v.rule === id);

describe('ESSAY-DRAFT', () => {
  it('accepts a body whose citations resolve', () => {
    expect(rule('ESSAY-DRAFT', 'Draft')).toEqual([]);
  });

  it('rejects a missing body from Draft', () => {
    const found = rule('ESSAY-DRAFT', 'Draft', { body: { exists: false, tags: [], text: '' } });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'body' });
  });

  it('does not ask for a body before Draft', () => {
    expect(rule('ESSAY-DRAFT', 'Outline', { body: { exists: false, tags: [], text: '' } })).toEqual([]);
  });

  it('rejects a <Cite> to an Evidence record that does not resolve', () => {
    const body = scanEssayBody(VALID_BODY.replace(`<Cite evidence="${EV}" />`, '<Cite evidence="tc:tc:evidence:evidence-000099" />'));
    const found = rule('ESSAY-DRAFT', 'Draft', { body });
    expect(found).toHaveLength(1);
    expect(JSON.stringify(found[0]!.value)).toContain('evidence-000099');
  });

  it('rejects an <EvidencePanel> to an Evidence record that does not resolve', () => {
    const body = scanEssayBody(VALID_BODY.replace(`<EvidencePanel evidence="${EV}" />`, '<EvidencePanel evidence="tc:tc:evidence:evidence-000099" />'));
    expect(rule('ESSAY-DRAFT', 'Draft', { body })).toHaveLength(1);
  });

  it('rejects a <Cite> whose evidence is not a record of the evidence family', () => {
    const body = scanEssayBody(VALID_BODY.replace(`<Cite evidence="${EV}" />`, '<Cite evidence="tc:tc:map:map-000001" />'));
    expect(rule('ESSAY-DRAFT', 'Draft', { body })).toHaveLength(1);
  });

  it('rejects a <Cite> with no evidence prop', () => {
    const body = scanEssayBody(VALID_BODY.replace(`<Cite evidence="${EV}" />`, '<Cite />'));
    expect(rule('ESSAY-DRAFT', 'Draft', { body })).toHaveLength(1);
  });

  it('rejects a <Cite> to Evidence whose source is a finding aid', () => {
    const records = world().map((r) => (r.family === 'source' ? { ...r, is_finding_aid: true } : r));
    const found = rule('ESSAY-DRAFT', 'Draft', {}, [...records, essayAt('Draft')]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error' });
    expect(JSON.stringify(found[0]!.value)).toContain(EV);
  });

  it('accepts evidence whose source is not a finding aid', () => {
    const records = world().map((r) => (r.family === 'source' ? { ...r, is_finding_aid: false } : r));
    expect(rule('ESSAY-DRAFT', 'Draft', {}, [...records, essayAt('Draft')])).toEqual([]);
  });

  it('leaves other evidence in the registry alone', () => {
    const records = [...world(), { ...world().find((r) => r.family === 'evidence')!, id: OTHER_EV, file: 'content/evidence/evidence-000002.yaml', slug: 'e2' }, essayAt('Draft')];
    expect(rule('ESSAY-DRAFT', 'Draft', {}, records)).toEqual([]);
  });
});

describe('ESSAY-BODY-DYNAMIC', () => {
  const dynamicBody = (tag: string) => scanEssayBody(VALID_BODY.replace('<MapFigure map="tc:tc:map:map-000001" />', tag));

  it('accepts string-literal props', () => {
    expect(rule('ESSAY-BODY-DYNAMIC', 'Draft')).toEqual([]);
  });

  it('rejects a computed prop (an expression)', () => {
    const found = rule('ESSAY-BODY-DYNAMIC', 'Draft', { body: dynamicBody('<MapFigure map={"tc:tc:map:map-" + n} />') });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'body' });
    expect(JSON.stringify(found[0]!.value)).toMatch(/map/);
  });

  it('rejects a variable and a spread', () => {
    expect(rule('ESSAY-BODY-DYNAMIC', 'Draft', { body: dynamicBody('<MapFigure map={mapId} />') })).toHaveLength(1);
    expect(rule('ESSAY-BODY-DYNAMIC', 'Draft', { body: dynamicBody('<MapFigure {...props} />') })).toHaveLength(1);
  });

  it('reports each dynamic tag once', () => {
    const body = dynamicBody('<MapFigure map={a} />\n\n<MapFigure map={b} />');
    expect(rule('ESSAY-BODY-DYNAMIC', 'Draft', { body })).toHaveLength(2);
  });

  it('is silent before Draft', () => {
    expect(rule('ESSAY-BODY-DYNAMIC', 'Outline', { body: dynamicBody('<MapFigure map={a} />') })).toEqual([]);
  });
});
