import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

/*
 * The internal link and fragment check (spec 007 FR-010, research R2). Static output makes resolution
 * a file-system question: every `<a href>` that stays on the site must name a built page or file, and
 * every `#fragment` an element id on the page it names. External, `mailto:`, `tel:` and `data:` links
 * are ignored. A path covered by `_redirects` counts as resolved: the redirect is the site's answer.
 *
 * Scope: only `<a href>` is checked (FR-010 is about links a reader follows); images, scripts and
 * stylesheets are the build's own and are checked by the shell's static-output tests. Used by the tests
 * and by `scripts/cutover-check.ts`. A `_redirects`
 * rule counts by its exact first column, so a splat rule does not cover a link (the site has none).
 */
export interface DeadLink {
  /** The built file the link is on, relative to the output folder. */
  page: string;
  href: string;
  reason: string;
}

const SKIPPED = /^(mailto:|tel:|data:|javascript:|[a-z][a-z0-9+.-]*:|\/\/)/i;

function htmlFiles(dir: string, rel = ''): string[] {
  return readdirSync(path.join(dir, rel), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? htmlFiles(dir, path.join(rel, e.name)) : e.name.endsWith('.html') ? [path.join(rel, e.name)] : []))
    .sort();
}

/** The paths a `_redirects` file answers, from its first column. */
function redirected(dir: string): Set<string> {
  const file = path.join(dir, '_redirects');
  if (!existsSync(file)) return new Set();
  return new Set(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0] ?? '')
      .filter((from) => from.startsWith('/')),
  );
}

/** The built file a site path names: a directory address is its index.html, a file address is the file. */
function fileFor(dir: string, pathname: string): string | null {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  const direct = path.join(dir, clean);
  // a link can never be answered by a file outside the built folder
  if (path.relative(dir, direct).startsWith('..')) return null;
  if (clean !== '' && !clean.endsWith('/') && existsSync(direct) && statSync(direct).isFile()) return clean;
  const index = path.join(clean, 'index.html');
  return existsSync(path.join(dir, index)) ? index : null;
}

export function checkLinks(dir: string): DeadLink[] {
  const answered = redirected(dir);
  const ids = new Map<string, Set<string>>();
  const idsOf = (file: string): Set<string> => {
    let found = ids.get(file);
    if (!found) {
      found = new Set(
        parse(readFileSync(path.join(dir, file), 'utf8'))
          .querySelectorAll('[id]')
          .map((n) => n.getAttribute('id') ?? ''),
      );
      ids.set(file, found);
    }
    return found;
  };

  const dead: DeadLink[] = [];
  for (const page of htmlFiles(dir)) {
    const address = `/${page.replace(/index\.html$/, '')}`;
    for (const a of parse(readFileSync(path.join(dir, page), 'utf8')).querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') ?? '';
      if (href === '' || SKIPPED.test(href)) continue;
      let url: URL;
      let target: string | null;
      let fragment: string;
      try {
        url = new URL(href, `https://site.invalid${address}`);
        target = url.pathname === address ? page : fileFor(dir, url.pathname);
        fragment = decodeURIComponent(url.hash.slice(1));
      } catch {
        dead.push({ page, href, reason: 'malformed address' });
        continue;
      }
      if (target === null) {
        if (!answered.has(url.pathname)) dead.push({ page, href, reason: 'no such page' });
        continue;
      }
      if (fragment !== '' && target.endsWith('.html') && !idsOf(target).has(fragment)) {
        dead.push({ page, href, reason: `no element with id "${fragment}" on ${target === page ? 'this page' : url.pathname}` });
      }
    }
  }
  return dead;
}
