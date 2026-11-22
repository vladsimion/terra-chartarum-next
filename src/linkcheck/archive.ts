import type { RegistryRecord } from '../registry/types.js';
import { urlsIn } from './collect.js';

/*
 * Archived copies (spec 010 FR-018, ADR 0019 §3, contracts/link-check.md "Archived-copy pull
 * request"): for a verified locator whose consulted copy is a URL and which has no archived copy
 * yet, ask the Wayback Machine for a snapshot and read back where it is. The result is a proposal;
 * a person merges it. The Wayback client is injected.
 */

export interface Wayback {
  /** Ask for a snapshot to be taken (https://web.archive.org/save/<url>). */
  save(url: string): Promise<void>;
  /** The closest snapshot (https://archive.org/wayback/available?url=<url>), or null. */
  available(url: string): Promise<{ url: string; timestamp: string } | null>;
}

export interface ArchiveProposal {
  id: string;
  file: string;
  /** The consulted-copy URL that was archived. */
  url: string;
  archived_copy: string;
  archived_on: string;
}

interface Locator {
  state?: unknown;
  consulted_copy?: unknown;
  archived_copy?: unknown;
}

/** `YYYYMMDDhhmmss` → `YYYY-MM-DD`. */
function dayOf(timestamp: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(timestamp);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function proposeArchivedCopies(records: readonly RegistryRecord[], wayback: Wayback): Promise<ArchiveProposal[]> {
  const proposals: ArchiveProposal[] = [];
  for (const record of records) {
    const locator = record.locator as Locator | undefined;
    if (locator?.state !== 'verified' || locator.archived_copy !== undefined || typeof locator.consulted_copy !== 'string') continue;
    const url = urlsIn(locator.consulted_copy)[0];
    if (!url) continue;
    try {
      await wayback.save(url);
    } catch {
      // a refused save still leaves any earlier snapshot to find
    }
    let snapshot: { url: string; timestamp: string } | null = null;
    try {
      snapshot = await wayback.available(url);
    } catch {
      snapshot = null;
    }
    const day = snapshot ? dayOf(snapshot.timestamp) : null;
    if (!snapshot || !day || !snapshot.url.startsWith('https://')) continue;
    proposals.push({ id: record.id, file: record.file, url, archived_copy: snapshot.url, archived_on: day });
  }
  return proposals;
}

/** The real client, over an injected fetch, as the workflow runs it. */
export function waybackOver(fetchImpl: typeof fetch): Wayback {
  return {
    async save(url) {
      await fetchImpl(`https://web.archive.org/save/${url}`, { method: 'GET', signal: AbortSignal.timeout(120_000) });
    },
    async available(url) {
      const response = await fetchImpl(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) return null;
      const json = (await response.json()) as { archived_snapshots?: { closest?: { available?: boolean; url?: string; timestamp?: string } } };
      const closest = json.archived_snapshots?.closest;
      if (!closest?.available || !closest.url || !closest.timestamp) return null;
      return { url: closest.url.replace(/^http:\/\//, 'https://'), timestamp: closest.timestamp };
    },
  };
}
