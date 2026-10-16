export type Severity = 'error' | 'warning';

export interface Violation {
  /** Stable rule ID from contracts/rule-ids.md, e.g. `ID-DUPLICATE`. */
  rule: string;
  severity: Severity;
  /** Canonical StableId, or null when the file could not be parsed. */
  entity: string | null;
  file: string;
  field: string | null;
  value: unknown;
  expected: string;
}

export interface IntegrityReport {
  schema_version: 1;
  run_id: string;
  commit: string;
  timestamp: string;
  pass: boolean;
  counts: { entities: number; errors: number; warnings: number };
  violations: Violation[];
}

export interface ReportMeta {
  now?: Date;
  commit?: string;
}

function compareViolations(a: Violation, b: Violation): number {
  return (
    a.file.localeCompare(b.file) ||
    a.rule.localeCompare(b.rule) ||
    (a.field ?? '').localeCompare(b.field ?? '') ||
    String(a.entity ?? '').localeCompare(String(b.entity ?? ''))
  );
}

/** `2026-10-16T12:00:00.000Z` -> `20261016T120000Z`. */
function compactTimestamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

export function buildReport(violations: Violation[], entities: number, meta: ReportMeta = {}): IntegrityReport {
  const now = meta.now ?? new Date();
  const timestamp = now.toISOString();
  const sorted = [...violations].sort(compareViolations);
  const errors = sorted.filter((v) => v.severity === 'error').length;
  const warnings = sorted.length - errors;
  return {
    schema_version: 1,
    run_id: `run-${compactTimestamp(timestamp)}`,
    commit: meta.commit ?? 'unknown',
    timestamp,
    pass: errors === 0,
    counts: { entities, errors, warnings },
    violations: sorted,
  };
}

export function toJson(report: IntegrityReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
