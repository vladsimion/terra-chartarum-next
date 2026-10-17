import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, readPage } from '../support/build.js';

/* US5: About and Colophon are real pages in the shell, marked as draft copy, and the footer's licences link lands on the Colophon's Licences section. */
let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe.each([
  ['about', '/about/', 'About'],
  ['colophon', '/colophon/', 'Colophon'],
])('%s page', (_id, href, title) => {
  const file = `${href.slice(1)}index.html`;

  it('renders in the shell with its heading, and is no longer a stub', () => {
    const page = readPage(dir, file);
    expect(page.querySelector('main h1')?.text.trim()).toBe(title);
    expect(page.querySelector('[data-stub]')).toBeNull();
    expect(page.querySelector('header nav')).not.toBeNull();
    expect(page.querySelector('footer')).not.toBeNull();
  });

  it('is marked data-draft while its copy is draft', () => {
    expect(readPage(dir, file).querySelector('main [data-draft]')).not.toBeNull();
  });
});

describe('licences', () => {
  it('the Colophon has a #licences section stating the split', () => {
    const page = readPage(dir, 'colophon/index.html');
    const section = page.querySelector('#licences');
    expect(section).not.toBeNull();
    const text = page.querySelector('main')?.text ?? '';
    expect(text).toMatch(/MIT/);
    expect(text).toMatch(/CC BY 4\.0/);
  });

  it('the footer links to it', () => {
    const hrefs = readPage(dir, 'index.html').querySelectorAll('footer a').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/colophon/#licences');
  });
});
