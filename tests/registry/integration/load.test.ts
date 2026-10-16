import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { checkRegistry } from '../../../src/registry/check.js';
import { loadRegistry } from '../../../src/registry/load.js';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const OPTIONS = { now: new Date('2026-10-16T12:00:00.000Z'), commit: 'test' };

describe('loadRegistry', () => {
  it('loads typed records from content/<family>/<local-id>.yaml', async () => {
    const { records, loadErrors } = await loadRegistry(fixture('valid'));
    expect(loadErrors).toEqual([]);
    expect(records.map((r) => r.id).sort()).toEqual([
      'tc:tc:attestation:attestation-000001',
      'tc:tc:cartographer:cartographer-000001',
      'tc:tc:collection:collection-000001',
      'tc:tc:dataset:dataset-000001',
      'tc:tc:evidence:evidence-000001',
      'tc:tc:evidence:evidence-000002',
      'tc:tc:layer:layer-000001',
      'tc:tc:map:plc-legacy-map',
      'tc:tc:place:place-000001',
      'tc:tc:place:place-000002',
      'tc:tc:room:archive',
      'tc:tc:room:border',
      'tc:tc:room:city',
      'tc:tc:room:earth',
      'tc:tc:room:map',
      'tc:tc:room:road',
      'tc:tc:room:theatre',
      'tc:tc:source:source-000001',
    ]);
    const napoca = records.find((r) => r.id === 'tc:tc:place:place-000001');
    expect(napoca?.file).toBe('content/place/place-000001.yaml');
    expect(napoca?.slug_history).toEqual(['colonia-napoca']);
  });

  it('defaults release to held when a record does not set it', async () => {
    const { records } = await loadRegistry(fixture('valid'));
    expect(records.every((r) => r.release === 'held')).toBe(true);
  });

  it('reports unparseable YAML as a load error naming the file', async () => {
    const { records, loadErrors } = await loadRegistry(fixture('invalid/unparseable'));
    expect(records).toEqual([]);
    expect(loadErrors).toHaveLength(1);
    expect(loadErrors[0]?.file).toBe('content/place/place-000001.yaml');
  });

  it('rejects a registry root without a content directory', async () => {
    await expect(loadRegistry(fixture('invalid'))).rejects.toThrow(/content/);
  });
});

describe('checkRegistry (load + validate)', () => {
  it('passes the valid fixture with no violations', async () => {
    const report = await checkRegistry(fixture('valid'), OPTIONS);
    expect(report.violations).toEqual([]);
    expect(report.pass).toBe(true);
    expect(report.counts.entities).toBe(18);
  });

  it('LOAD-PARSE: unparseable YAML becomes an error violation with no entity', async () => {
    const report = await checkRegistry(fixture('invalid/unparseable'), OPTIONS);
    const v = report.violations.find((x) => x.rule === 'LOAD-PARSE');
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.entity).toBeNull();
    expect(v?.file).toBe('content/place/place-000001.yaml');
    expect(report.pass).toBe(false);
  });

  it('LOAD-PATH: filename must equal the local-id and the directory the family', async () => {
    const report = await checkRegistry(fixture('invalid/path-mismatch'), OPTIONS);
    const paths = report.violations.filter((x) => x.rule === 'LOAD-PATH');
    expect(paths.map((v) => v.file).sort()).toEqual([
      'content/place/place-000009.yaml',
      'content/source/place-000002.yaml',
    ]);
    expect(paths.find((v) => v.file.endsWith('place-000009.yaml'))?.expected).toContain('place-000001.yaml');
    expect(paths.find((v) => v.file.startsWith('content/source/'))?.expected).toContain('content/place/');
  });

  it('ID-SYNTAX: a bad id fails with the offending value and does not add a path error', async () => {
    // completeness off: this fixture has no rooms, and the test is about the id rule alone
    const report = await checkRegistry(fixture('invalid/bad-syntax'), { ...OPTIONS, completeness: false });
    expect(report.violations.map((v) => v.rule)).toEqual(['ID-SYNTAX']);
    expect(report.violations[0]?.value).toBe('place-000001');
  });

  it('ID-DUPLICATE: two files with the same id fail naming both files', async () => {
    const report = await checkRegistry(fixture('invalid/duplicate-id'), OPTIONS);
    const dup = report.violations.filter((x) => x.rule === 'ID-DUPLICATE');
    expect(dup).toHaveLength(2);
    expect(dup[0]?.expected).toContain('content/place/place-000001.yaml');
    expect(dup[0]?.expected).toContain('content/place/place-000001-copy.yaml');
  });
});
