import { describe, expect, it } from 'vitest';
import { validateRegistry } from '../../../src/registry/validate.js';
import { place } from '../support/builders.js';

describe('ID-DUPLICATE', () => {
  it('fails when two records declare the same canonical id, naming both files (US1.3)', () => {
    const a = place(1, { file: 'content/place/place-000001.yaml' });
    const b = place(1, { file: 'content/place/copy-of-place-000001.yaml' });
    const report = validateRegistry([a, b]);

    const duplicates = report.violations.filter((v) => v.rule === 'ID-DUPLICATE');
    expect(duplicates).toHaveLength(2);
    expect(report.pass).toBe(false);
    for (const v of duplicates) {
      expect(v.severity).toBe('error');
      expect(v.value).toBe('tc:tc:place:place-000001');
      expect(v.expected).toContain('content/place/place-000001.yaml');
      expect(v.expected).toContain('content/place/copy-of-place-000001.yaml');
    }
    expect(duplicates.map((v) => v.file).sort()).toEqual([
      'content/place/copy-of-place-000001.yaml',
      'content/place/place-000001.yaml',
    ]);
  });

  it('is an error whatever the lifecycle', () => {
    const a = place(1, { lifecycle: 'proposed' });
    const b = place(1, { lifecycle: 'proposed', file: 'content/place/other.yaml' });
    expect(validateRegistry([a, b]).counts.errors).toBeGreaterThan(0);
  });

  it('does not flag different ids, even with the same title', () => {
    const report = validateRegistry([place(1, { title: 'Napoca' }), place(2, { title: 'Napoca' })]);
    expect(report.violations.filter((v) => v.rule === 'ID-DUPLICATE')).toEqual([]);
  });

  it('reports three declarations as three violations', () => {
    const records = [1, 2, 3].map((i) => place(1, { file: `content/place/dup-${i}.yaml` }));
    const duplicates = validateRegistry(records).violations.filter((v) => v.rule === 'ID-DUPLICATE');
    expect(duplicates).toHaveLength(3);
  });
});
