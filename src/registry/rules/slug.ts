import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

const key = (family: string, slug: string) => `${family}/${slug}`;

function groupBy(records: readonly RegistryRecord[], keys: (r: RegistryRecord) => string[]): Map<string, RegistryRecord[]> {
  const groups = new Map<string, RegistryRecord[]>();
  for (const record of records) {
    for (const k of new Set(keys(record))) {
      const group = groups.get(k);
      if (group) group.push(record);
      else groups.set(k, [record]);
    }
  }
  return groups;
}

/**
 * Every record's current slug is claimed, a superseded record's included: that slug is where its
 * redirect starts, so a live record reusing it would be shadowed by a 301 away from its own page.
 */
const liveKeys = (r: RegistryRecord) => (r.slug ? [key(r.family, r.slug)] : []);

export const slugUnique = defineRule({
  id: 'SLUG-UNIQUE',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const [, group] of groupBy(records, liveKeys)) {
      if (group.length < 2) continue;
      for (const record of group) {
        findings.push({
          record,
          field: 'slug',
          value: record.slug,
          expected: `a slug used by one ${record.family} only; also used by ${group
            .filter((r) => r !== record)
            .map((r) => r.id)
            .join(', ')}`,
        });
      }
    }
    return findings;
  },
});

export const slugHistoryCollision = defineRule({
  id: 'SLUG-HISTORY-COLLISION',
  from: 'always',
  check: ({ records }) => {
    const live = groupBy(records, liveKeys);
    const claimed = groupBy(records, (r) => (r.slug_history ?? []).map((s) => key(r.family, s)));
    const findings: Finding[] = [];
    for (const record of records) {
      for (const former of new Set(record.slug_history ?? [])) {
        const k = key(record.family, former);
        const clashesWithLive = (live.get(k)?.length ?? 0) > 0;
        const claimedByOthers = (claimed.get(k) ?? []).some((r) => r !== record);
        if (clashesWithLive || claimedByOthers) {
          findings.push({
            record,
            field: 'slug_history',
            value: former,
            expected: 'a former slug that no live slug and no other record uses',
          });
        }
      }
    }
    return findings;
  },
});

export const SLUG_RULES = [slugUnique, slugHistoryCollision];
