import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadPublicRecords, registryRoot } from '../shell/public-records.js';
import type { PublicRecord } from '../registry/project.js';
import { cslItemFor, type CslItem } from './citations.js';

/*
 * What the essay pages read from the registry at build time: the public records, and the CSL-JSON
 * file of each public bibliography entry. Loaded once per build. Held records never get here:
 * `loadPublicRecords` projects through the one public allowlist.
 */
export interface EssaySite {
  records: PublicRecord[];
  cslFor(entryId: string): CslItem;
}

let cached: Promise<EssaySite> | null = null;

export function loadEssaySite(): Promise<EssaySite> {
  cached ??= (async () => {
    const root = registryRoot();
    const records = await loadPublicRecords(root);
    const items = new Map<string, CslItem>();
    for (const entry of records.filter((r) => r.family === 'bibliography_entry')) {
      const read = (file: string) => {
        try {
          return readFileSync(path.join(root, file), 'utf8');
        } catch {
          return null;
        }
      };
      items.set(entry.id, cslItemFor({ id: entry.id, csl: typeof entry.csl === 'string' ? entry.csl : undefined }, read));
    }
    return {
      records,
      cslFor: (entryId) => {
        const item = items.get(entryId);
        if (!item) throw new Error(`no CSL-JSON for bibliography entry ${entryId}: it is not a public bibliography entry`);
        return item;
      },
    };
  })();
  return cached;
}
