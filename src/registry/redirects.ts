import type { LoadedRecord } from './load.ts';
import { isRoutable, pagePath } from './routes.ts';

export interface RedirectRule {
  from: string;
  to: string;
  status: 301;
}

/**
 * One permanent redirect per previous slug of a routable record, so a renamed
 * page never breaks an old link (spec 001 US1-AS2). Deterministic output.
 *
 * A live page is never redirected away: a superseded record keeps its address
 * as a tombstone linking to its successor (spec 002 FR-011, research R4), so a
 * previous slug that collides with any current page path is dropped.
 */
export function redirectsFor(records: readonly LoadedRecord[]): RedirectRule[] {
  const rules: RedirectRule[] = [];
  const live = new Set<string>();
  for (const { record } of records) {
    const family = record['family'];
    const slug = record['slug'];
    if (typeof family === 'string' && isRoutable(family) && typeof slug === 'string') live.add(pagePath(family, slug));
  }

  for (const { record } of records) {
    const family = record['family'];
    const slug = record['slug'];
    const previous = record['previous_slugs'];
    if (typeof family !== 'string' || !isRoutable(family) || typeof slug !== 'string' || !Array.isArray(previous)) {
      continue;
    }

    const to = pagePath(family, slug);
    for (const old of previous) {
      if (typeof old !== 'string') continue;
      const from = pagePath(family, old);
      if (!live.has(from)) rules.push({ from, to, status: 301 });
    }
  }

  return rules.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Render rules in the static host's `_redirects` format: `from to status` per line. */
export function toRedirectsFile(rules: readonly RedirectRule[]): string {
  return rules.map((r) => `${r.from} ${r.to} ${r.status}\n`).join('');
}
