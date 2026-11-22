import type { RegistryRecord } from '../registry/types.js';

/*
 * The external URLs the records depend on (spec 010 FR-015, contracts/link-check.md "URLs checked"),
 * each once, with every record and field that uses it. Held records count: a held record's dead
 * source matters to the editor. `same_as[]` identifiers are not URLs and are not collected.
 */

export interface UrlUse {
  id: string;
  file: string;
  field: string;
}

export interface CollectedUrl {
  url: string;
  uses: UrlUse[];
  /** The URL is an IIIF manifest (a map image of `type: iiif`), so its canvases are fingerprinted too. */
  manifest: boolean;
}

/** Every http(s) URL in free text, without trailing sentence punctuation. */
export function urlsIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/g)].map((m) => m[0].replace(/[.,;:!?)\]]+$/, ''));
}

export function collectUrls(records: readonly RegistryRecord[]): CollectedUrl[] {
  const found = new Map<string, CollectedUrl>();
  const add = (url: unknown, record: RegistryRecord, field: string, manifest = false) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return;
    const entry = found.get(url) ?? { url, uses: [], manifest: false };
    entry.uses.push({ id: record.id, file: record.file, field });
    entry.manifest ||= manifest;
    found.set(url, entry);
  };

  for (const record of records) {
    const locator = record.locator as { consulted_copy?: unknown } | undefined;
    if (typeof locator?.consulted_copy === 'string') {
      for (const url of urlsIn(locator.consulted_copy)) add(url, record, 'locator.consulted_copy');
    }
    if (record.family === 'map' && Array.isArray(record.images)) {
      record.images.forEach((image: unknown, i: number) => {
        if (image === null || typeof image !== 'object') return;
        const { type, url, static_url: staticUrl } = image as { type?: unknown; url?: unknown; static_url?: unknown };
        add(url, record, `images[${i}].url`, type === 'iiif');
        add(staticUrl, record, `images[${i}].static_url`);
      });
    }
    if (record.family === 'bibliography_entry') add(record.digital_copy, record, 'digital_copy');
    if (record.family === 'dataset') add((record.upstream as { url?: unknown } | undefined)?.url, record, 'upstream.url');
  }
  return [...found.values()];
}
