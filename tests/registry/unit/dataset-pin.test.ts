import { describe, expect, it } from 'vitest';
import { knownFields } from '../../../src/registry/schemas/index.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { record } from '../support/builders.js';

/**
 * TCX-65 item 3. A dataset's `version` is this project's own label for it (`legacy-e82afd9`, `1.0.0`).
 * A dataset built from someone else's data also says which release of that data it was built from:
 * `upstream.pin`, a DOI, a release tag or a sha256 checksum. `DATASET-PIN` judges it (GRILL-AGENDA
 * item 18 notes; data-model.md "Family fields").
 */
const SHA = 'a'.repeat(64);

const dataset = (upstream: unknown, lifecycle = 'ready_for_build') =>
  record('dataset', 1, { lifecycle, version: '1.0.0', rights: { licence: 'CC-BY-4.0' }, upstream });

const pinFindings = (upstream: unknown, lifecycle?: string) =>
  validateRegistry([dataset(upstream, lifecycle)]).violations.filter((v) => v.rule === 'DATASET-PIN');

describe('dataset upstream pin (TCX-65, DATASET-PIN)', () => {
  it('is a field the dataset schema knows, so FAM-UNKNOWN does not drop it', () => {
    expect(knownFields('dataset')?.has('upstream')).toBe(true);
    expect(validateRegistry([dataset({ url: 'https://www.naturalearthdata.com/', pin: 'tag:v5.1.1' })]).violations.filter((v) => v.rule === 'FAM-UNKNOWN')).toEqual([]);
  });

  it('says nothing about a dataset of the project’s own making, which has no upstream', () => {
    expect(pinFindings(undefined)).toEqual([]);
  });

  it.each([
    ['a DOI', 'doi:10.5281/zenodo.1234567'],
    ['a release tag', 'tag:v5.1.1'],
    ['a sha256 checksum', `sha256:${SHA}`],
  ])('accepts %s', (_, pin) => {
    expect(pinFindings({ url: 'https://example.org/data', pin })).toEqual([]);
  });

  it.each([
    ['no pin at all', { url: 'https://example.org/data' }],
    ['a moving name', { url: 'https://example.org/data', pin: 'latest' }],
    ['a bare version with no kind', { url: 'https://example.org/data', pin: '5.1.1' }],
    ['a DOI that is not one', { url: 'https://example.org/data', pin: 'doi:zenodo' }],
    ['a short checksum', { url: 'https://example.org/data', pin: 'sha256:abc123' }],
    ['an empty tag', { url: 'https://example.org/data', pin: 'tag:' }],
  ])('rejects %s', (_, upstream) => {
    expect(pinFindings(upstream).map((v) => [v.field, v.severity])).toEqual([['upstream.pin', 'error']]);
  });

  it('wants the upstream named by an https url', () => {
    expect(pinFindings({ pin: 'tag:v5.1.1' }).map((v) => v.field)).toEqual(['upstream.url']);
    expect(pinFindings({ url: 'http://example.org/data', pin: 'tag:v5.1.1' }).map((v) => v.field)).toEqual(['upstream.url']);
  });

  it('is a warning while the dataset is still being researched (ADR 0006 item 6)', () => {
    expect(pinFindings({ url: 'https://example.org/data', pin: 'latest' }, 'researching').map((v) => v.severity)).toEqual(['warning']);
  });
});
