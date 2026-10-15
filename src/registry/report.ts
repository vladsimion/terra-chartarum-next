import type { RegistryCheck, Violation } from './integrity.ts';

/** The JSON report (contracts/integrity-report.schema.json). */
export interface IntegrityReport extends RegistryCheck {
  run_id: string;
  generated_at: string;
}

export interface RunInfo {
  runId: string;
  generatedAt: Date;
}

/** Attach run metadata and order violations deterministically. */
export function buildReport(check: RegistryCheck, run: RunInfo): IntegrityReport {
  return {
    run_id: run.runId,
    generated_at: run.generatedAt.toISOString(),
    status: check.status,
    counts: { ...check.counts, by_family: sortKeys(check.counts.by_family) },
    violations: [...check.violations].sort(compareViolations),
  };
}

/** Human-readable report: violations grouped under their code. */
export function toMarkdown(report: IntegrityReport): string {
  const lines = [
    '# Registry integrity report',
    '',
    `- Run: \`${report.run_id}\``,
    `- Generated: ${report.generated_at}`,
    `- Status: **${report.status}**`,
    `- Entities: ${report.counts.entities} · References: ${report.counts.references} · Violations: ${report.counts.violations}`,
    '',
  ];

  if (report.violations.length === 0) {
    lines.push('No violations.', '');
    return lines.join('\n');
  }

  const byCode = new Map<string, Violation[]>();
  for (const v of report.violations) byCode.set(v.code, [...(byCode.get(v.code) ?? []), v]);

  for (const [code, violations] of byCode) {
    lines.push(`## ${code} (${violations.length})`, '');
    for (const v of violations) {
      const where = v.files.map((f) => `\`${f}\``).join(', ');
      const field = v.field === undefined ? '' : ` · field \`${v.field}\``;
      lines.push(`- ${where}${field}: ${v.message}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function compareViolations(a: Violation, b: Violation): number {
  return (
    a.code.localeCompare(b.code) ||
    (a.files[0] ?? '').localeCompare(b.files[0] ?? '') ||
    (a.field ?? '').localeCompare(b.field ?? '') ||
    a.message.localeCompare(b.message)
  );
}

function sortKeys(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}
