import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import type { EssayStage } from '../../../src/registry/stages.js';
import { registryWith } from '../support/essays.js';

/*
 * Spec 003 T017 (AC 2.5, FR-013, ADR 0010): a rebuilt essay that supersedes an old page confirms the
 * redirect has been switched, by someone, on a date. No `legacy_url` means nothing is asked.
 */
const hits = (stage: EssayStage, overrides: Partial<RegistryRecord> = {}) =>
  validateRegistry(registryWith(stage, overrides)).violations.filter((v) => v.rule === 'ESSAY-CROSSLINK');

const LEGACY = { legacy_url: '/essays/old-slug/' };

describe('ESSAY-CROSSLINK', () => {
  it('asks nothing when there is no legacy_url', () => {
    expect(hits('Cross-link')).toEqual([]);
  });

  it('accepts a confirmed redirect', () => {
    expect(hits('Cross-link', { ...LEGACY, redirect_switched: { by: 'A. Editor', on: '2026-10-17' } })).toEqual([]);
  });

  it('rejects a legacy_url with no redirect_switched', () => {
    const found = hits('Cross-link', LEGACY);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'error', field: 'redirect_switched', entity: 'tc:tc:essay:essay-000001' });
  });

  it('rejects a redirect_switched without a name or a valid date', () => {
    expect(hits('Cross-link', { ...LEGACY, redirect_switched: { on: '2026-10-17' } })).toHaveLength(1);
    expect(hits('Cross-link', { ...LEGACY, redirect_switched: { by: ' ', on: '2026-10-17' } })).toHaveLength(1);
    expect(hits('Cross-link', { ...LEGACY, redirect_switched: { by: 'A' } })).toHaveLength(1);
    expect(hits('Cross-link', { ...LEGACY, redirect_switched: { by: 'A', on: 'soon' } })).toHaveLength(1);
  });

  it('does not ask before Cross-link: Publish may come first', () => {
    expect(hits('Publish', LEGACY)).toEqual([]);
    expect(hits('Build', LEGACY)).toEqual([]);
  });
});
