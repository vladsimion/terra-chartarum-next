import type { HTMLElement } from 'node-html-parser';

/**
 * The template a built page belongs to, for the CI template list (contracts/ci-matrix.md). A page
 * that fits no rule is "unknown", which the template-list test reports, so a new kind of page has
 * to be classified here and listed in tests/shell/ci-templates.json. Pages of the test fixtures
 * that exist only to prove a gate fails are "test-only" and are never measured as templates.
 */
export function pageType(file: string, page: HTMLElement): string {
  if (file === '404.html') return '404';
  if (file === 'index.html') return 'home';
  if (file.startsWith('fixtures/')) {
    const slug = file.split('/')[1] ?? '';
    if (slug === 'essay-a') return 'essay-fixture-a';
    if (slug === 'essay-b') return 'essay-fixture-b';
    if (slug === 'long-title') return 'content-with-breadcrumb';
    return 'test-only';
  }
  if (page.querySelector('[data-stub]')) return 'stub';
  if (file.startsWith('essays/') && page.querySelector('article.essay')) return 'essay';
  if (file === 'cartographers/index.html' && page.querySelector('ol.cartographers')) return 'cartographer-list';
  if (file.startsWith('cartographers/') && page.querySelector('article.cartographer')) return 'cartographer-profile';
  if (file === 'collection/index.html' && page.querySelector('form.filters')) return 'collection-list';
  if (file.startsWith('collection/') && page.querySelector('article.map-record')) return 'collection-record';
  if (file === 'bibliography/index.html' && page.querySelector('form.filters')) return 'bibliography-index';
  if (file.startsWith('bibliography/') && page.querySelector('article.bibliography-entry')) return 'bibliography-entry';
  if (file === 'atlas/index.html' && page.querySelector('[data-atlas]')) return 'atlas';
  if (file === 'atlas/handbook/index.html') return 'handbook-index';
  if (file.startsWith('atlas/handbook/')) return 'handbook-topic';
  if (file === 'about/index.html') return 'about';
  if (file === 'colophon/index.html') return 'colophon';
  return 'unknown';
}
