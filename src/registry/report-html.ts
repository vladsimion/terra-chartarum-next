import type { IntegrityReport, Violation } from './report.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function show(value: unknown): string {
  if (value === null || value === undefined) return '';
  return escapeHtml(typeof value === 'string' ? value : JSON.stringify(value));
}

function row(v: Violation): string {
  return [
    '      <tr>',
    `        <td>${escapeHtml(v.severity)}</td>`,
    `        <td><code>${escapeHtml(v.rule)}</code></td>`,
    `        <td>${show(v.entity)}</td>`,
    `        <td>${escapeHtml(v.file)}</td>`,
    `        <td>${show(v.field)}</td>`,
    `        <td>${show(v.value)}</td>`,
    `        <td>${escapeHtml(v.expected)}</td>`,
    '      </tr>',
  ].join('\n');
}

const HEADINGS = ['Severity', 'Rule', 'Entity', 'File', 'Field', 'Value', 'Expected'];

/**
 * Human-reviewable summary of an integrity report. A static page: semantic table, severity and
 * verdict stated as text (never colour alone), no scripts and no external assets.
 */
export function renderHtml(report: IntegrityReport): string {
  const { entities, errors, warnings } = report.counts;
  const verdict = report.pass ? 'PASS' : 'FAIL';
  const body =
    report.violations.length === 0
      ? '    <p>No violations.</p>'
      : [
          '    <table>',
          `      <caption>${report.violations.length} violations, most important first by file</caption>`,
          '      <thead>',
          `        <tr>${HEADINGS.map((h) => `<th scope="col">${h}</th>`).join('')}</tr>`,
          '      </thead>',
          '      <tbody>',
          report.violations.map(row).join('\n'),
          '      </tbody>',
          '    </table>',
        ].join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Integrity report ${verdict} - ${escapeHtml(report.run_id)}</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0; padding: 1rem; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid currentColor; padding: 0.25rem 0.5rem; text-align: left; vertical-align: top; }
      caption { text-align: left; padding-bottom: 0.5rem; }
      .scroll { overflow-x: auto; }
    </style>
  </head>
  <body>
    <h1>Integrity report: ${verdict}</h1>
    <p>${entities} entities, ${errors} errors, ${warnings} warnings.</p>
    <p>Run ${escapeHtml(report.run_id)} at ${escapeHtml(report.timestamp)}, commit ${escapeHtml(report.commit)}.</p>
    <div class="scroll">
${body}
    </div>
  </body>
</html>
`;
}
