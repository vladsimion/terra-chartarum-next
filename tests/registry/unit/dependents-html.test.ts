import { describe, expect, it } from 'vitest';
import { buildDependents } from '../../../src/registry/dependents.js';
import { renderDependentsHtml } from '../../../src/registry/dependents-html.js';
import { record } from '../support/builders.js';

/*
 * Spec 010 T024 (US2; research R6 "Viewer"): one static page, no script, one section per record
 * that has dependents, held stated in words, every id escaped.
 */
const ENTRY = 'tc:tc:bibliography_entry:bibliography_entry-000001';
const SOURCE = 'tc:tc:source:source-000001';

function page(records = [record('bibliography_entry', 1, { lifecycle: 'published', release: 'released' }), record('source', 1, { entry: ENTRY })]) {
  return renderDependentsHtml(buildDependents(records), { commit: 'abc123', generated_at: '2026-11-22T10:00:00.000Z' });
}

describe('renderDependentsHtml (US2 viewer)', () => {
  it('is one HTML document with no script', () => {
    const html = page();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html.match(/<html/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script/i);
  });

  it('has one section per record that has dependents, and none for the others', () => {
    const html = page();
    expect(html.match(/<section/g)).toHaveLength(1);
    expect(html).toContain(`id="${ENTRY}"`);
    expect(html).toContain(SOURCE);
  });

  it('marks a held dependent in text, not colour alone', () => {
    expect(page()).toMatch(new RegExp(`${SOURCE}[\\s\\S]*?held`));
  });

  it('escapes every id and title', () => {
    const odd = 'tc:tc:place:<b>&"';
    const html = page([record('place', 1, { title: '<i>x</i>', relations: [odd] })]);
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<i>x</i>');
    expect(html).toContain('&lt;b&gt;&amp;&quot;');
  });

  it('says so when nothing has dependents', () => {
    expect(page([record('place', 1)])).toContain('No record has dependents.');
  });
});
