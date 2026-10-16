import { describe, expect, it } from 'vitest';
import { buildReport, type Violation } from '../../../src/registry/report.js';

const NOW = new Date('2026-10-16T12:00:00.000Z');

function violation(severity: 'error' | 'warning', rule = 'ID-SYNTAX'): Violation {
  return {
    rule,
    severity,
    entity: 'tc:tc:place:place-000001',
    file: 'content/place/place-000001.yaml',
    field: 'id',
    value: 'bad',
    expected: 'a valid stable id',
  };
}

describe('buildReport', () => {
  it('passes when there are no violations', () => {
    const report = buildReport([], 3, { now: NOW, commit: 'abc123' });
    expect(report.pass).toBe(true);
    expect(report.counts).toEqual({ entities: 3, errors: 0, warnings: 0 });
  });

  it('passes with warnings only, and counts them', () => {
    const report = buildReport([violation('warning'), violation('warning')], 5, { now: NOW, commit: 'abc123' });
    expect(report.pass).toBe(true);
    expect(report.counts).toEqual({ entities: 5, errors: 0, warnings: 2 });
  });

  it('fails when any violation is an error, and counts errors and warnings separately', () => {
    const report = buildReport([violation('error'), violation('warning'), violation('error')], 5, {
      now: NOW,
      commit: 'abc123',
    });
    expect(report.pass).toBe(false);
    expect(report.counts).toEqual({ entities: 5, errors: 2, warnings: 1 });
  });

  it('carries the schema version, run id, commit and timestamp', () => {
    const report = buildReport([], 0, { now: NOW, commit: 'abc123' });
    expect(report.schema_version).toBe(1);
    expect(report.commit).toBe('abc123');
    expect(report.timestamp).toBe('2026-10-16T12:00:00.000Z');
    expect(report.run_id).toBe('run-20261016T120000Z');
  });

  it('is deterministic for equal input when now and commit are injected', () => {
    const a = buildReport([violation('error')], 1, { now: NOW, commit: 'abc123' });
    const b = buildReport([violation('error')], 1, { now: NOW, commit: 'abc123' });
    expect(a).toEqual(b);
  });

  it('orders violations deterministically by file, then rule, then field', () => {
    const a = { ...violation('error', 'B-RULE'), file: 'b.yaml' };
    const b = { ...violation('error', 'A-RULE'), file: 'b.yaml' };
    const c = { ...violation('error', 'Z-RULE'), file: 'a.yaml' };
    const report = buildReport([a, b, c], 3, { now: NOW, commit: 'x' });
    expect(report.violations.map((v) => `${v.file}:${v.rule}`)).toEqual([
      'a.yaml:Z-RULE',
      'b.yaml:A-RULE',
      'b.yaml:B-RULE',
    ]);
  });
});
