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
 */
export function redirectsFor(records: readonly LoadedRecord[]): RedirectRule[] {
  const rules: RedirectRule[] = [];

  for (const { record } of records) {
    const family = record['family'];
    const slug = record['slug'];
    const previous = record['previous_slugs'];
    if (typeof family !== 'string' || !isRoutable(family) || typeof slug !== 'string' || !Array.isArray(previous)) {
      continue;
    }

    const to = pagePath(family, slug);
    for (const old of previous) {
      if (typeof old === 'string' && old !== slug) {
        rules.push({ from: pagePath(family, old), to, status: 301 });
      }
    }
  }

  return rules.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Render rules in the static host's `_redirects` format: `from to status` per line. */
export function toRedirectsFile(rules: readonly RedirectRule[]): string {
  return rules.map((r) => `${r.from} ${r.to} ${r.status}\n`).join('');
}
