import { describe, expect, it } from 'vitest';
import { buildReport, type Violation } from '../../../src/registry/report.js';
import { renderHtml } from '../../../src/registry/report-html.js';

const NOW = new Date('2026-10-16T12:00:00.000Z');

function violation(overrides: Partial<Violation> = {}): Violation {
  return {
    rule: 'REF-UNKNOWN',
    severity: 'error',
    entity: 'tc:tc:essay:essay-000001',
    file: 'content/essay/essay-000001.yaml',
    field: 'maps[0]',
    value: 'tc:tc:map:map-000404',
    expected: 'the id of an existing record',
    ...overrides,
  };
}

const html = (violations: Violation[], entities = 3) => renderHtml(buildReport(violations, entities, { now: NOW, commit: 'abc123' }));

describe('renderHtml', () => {
  it('is a complete, language-tagged document with a title', () => {
    const out = html([]);
    expect(out.startsWith('<!doctype html>')).toBe(true);
    expect(out).toContain('<html lang="en">');
    expect(out).toMatch(/<title>[^<]+<\/title>/);
  });

  it('shows the verdict and counts as text', () => {
    expect(html([violation()])).toMatch(/FAIL/);
    expect(html([])).toMatch(/PASS/);
    const out = html([violation(), violation({ severity: 'warning', rule: 'PROV-SOURCE' })], 7);
    expect(out).toContain('7 entities');
    expect(out).toContain('1 errors');
    expect(out).toContain('1 warnings');
  });

  it('lists violations in a real table with captioned, scoped header cells', () => {
    const out = html([violation()]);
    expect(out).toContain('<table');
    expect(out).toContain('<caption>');
    for (const heading of ['Severity', 'Rule', 'Entity', 'File', 'Field', 'Value', 'Expected']) {
      expect(out).toContain(`<th scope="col">${heading}</th>`);
    }
    expect(out).toContain('REF-UNKNOWN');
    expect(out).toContain('maps[0]');
  });

  it('states severity as text, never by colour alone', () => {
    const out = html([violation(), violation({ severity: 'warning', rule: 'PROV-SOURCE' })]);
    expect(out).toMatch(/<td[^>]*>error<\/td>/);
    expect(out).toMatch(/<td[^>]*>warning<\/td>/);
  });

  it('says so when there are no violations, instead of an empty table', () => {
    const out = html([]);
    expect(out).toContain('No violations');
    expect(out).not.toContain('<table');
  });

  it('escapes values so file content cannot inject markup', () => {
    const out = html([violation({ value: '<script>alert(1)</script>', expected: 'a "quoted" & <b>bold</b> thing' })]);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('&amp;');
    expect(out).toContain('&quot;quoted&quot;');
  });

  it('loads nothing external and runs no script', () => {
    const out = html([violation()]);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/(?:src|href)\s*=\s*["']?https?:/i);
    expect(out).not.toMatch(/@import|url\(/i);
  });
});
