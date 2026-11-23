import { beforeAll, describe, expect, it } from 'vitest';
import { bibliographySite, hasFile, readHtml, readPage, textOf } from '../support/build.js';

/*
 * Spec 012 T039 (US3; FR-009, FR-014, FR-015; contracts/pages.md "Person"): a person's page lists
 * the public editions that name them, in date order, each with its production place and date, and
 * draws no path between them; an edition links back to its printer. Fixture: the Fixture Printer is
 * named by entry 15 (made 1508 at the Fixture Monastery), entry 10 (1972, no place recorded) and the
 * held entry 7; entry 15 also names a held apprentice.
 */
let dir = '';
beforeAll(() => {
  dir = bibliographySite();
});
const person = () => readPage(dir, 'people/fixture-printer/index.html');

describe('the person page', () => {
  it('exists for a public person, and not for a held one', () => {
    expect(hasFile(dir, 'people/fixture-printer/index.html')).toBe(true);
    expect(hasFile(dir, 'people/held-apprentice/index.html')).toBe(false);
  });

  it('gives the names with their language, and the life dates', () => {
    expect(person().querySelectorAll('h1').map((h) => textOf(h))).toEqual(['Fixture Printer']);
    const names = textOf(person().querySelector('.names'));
    expect(names).toContain('Tipograful');
    expect(names).toContain('ro');
    expect(textOf(person().querySelector('.life-dates'))).toContain('1480?/1540?');
  });

  it('lists the public editions that name them, in date order, with production place, date and role', () => {
    const items = person().querySelectorAll('.editions li').map((li) => textOf(li));
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('A fixture liturgy');
    expect(items[0]).toContain('Fixture Monastery');
    expect(items[0]).toContain('1508');
    expect(items[0]).toMatch(/printer.*stated in the book/);
    expect(items[1]).toContain('The Roads of the Province');
    expect(items[1]).toContain('place not recorded');
    expect(items[1]).toContain('attributed by scholarship');
    expect(person().querySelector('.editions li a[href="/bibliography/fixture-entry-15/"]')).not.toBeNull();
  });

  it('lists no held edition, and draws no path between the places', () => {
    const html = readHtml(dir, 'people/fixture-printer/index.html');
    expect(html).not.toContain('fixture-entry-7');
    expect(person().querySelector('svg path, canvas, [data-path]')).toBeNull();
  });
});

describe('the people index', () => {
  it('lists the public people only', () => {
    const index = readPage(dir, 'people/index.html');
    expect(index.querySelectorAll('h1').map((h) => textOf(h))).toEqual(['People']);
    expect(index.querySelectorAll('.people-list li a').map((a) => a.getAttribute('href'))).toEqual(['/people/fixture-printer/']);
    expect(readHtml(dir, 'people/index.html')).not.toMatch(/held-apprentice|A held apprentice/);
  });
});

describe('the edition page names its printer', () => {
  it('links the printer to their page, with role, basis and confidence, and names no held person', () => {
    const section = readPage(dir, 'bibliography/fixture-entry-15/index.html').querySelector('section#where-made-kept');
    const printer = section?.querySelector('.printers');
    expect(textOf(printer)).toMatch(/Printed by Fixture Printer \(stated in the book, confidence: probable(, locator pending)?\)/);
    expect(printer?.querySelector('a[href="/people/fixture-printer/"]')).not.toBeNull();
    expect(readHtml(dir, 'bibliography/fixture-entry-15/index.html')).not.toMatch(/held-apprentice|A held apprentice/);
  });
});

/*
 * Code review, spec 012 Polish (contracts/pages.md: "Pending locators are marked pending"): a printer
 * named on the strength of a pending locator says so, on the edition and on the person's page.
 */
describe('a printer resting on a pending locator', () => {
  it('is marked pending on the edition page', () => {
    const printer = readPage(dir, 'bibliography/fixture-entry-15/index.html').querySelector('section#where-made-kept .printers');
    expect(textOf(printer)).toMatch(/locator pending/);
  });

  it('is marked pending on the person page, edition by edition', () => {
    for (const item of person().querySelectorAll('.editions li').map((li) => textOf(li))) expect(item).toMatch(/locator pending/);
  });
});
