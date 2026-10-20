import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { matchItem, normaliseDoi, type Known } from '../bibliography/match.js';
import type { CslItem } from '../essays/citations.js';
import { slugFor } from '../registry/import-bib.js';
import { counterOf, formatCounterLocalId } from '../registry/ids.js';
import { Collector, idOf, type Row } from './context.js';

/*
 * Bibliography entries made by the import (spec 008 FR-012). A legacy bibliography item or an inline
 * citation on a map becomes an entry through spec 006's duplicate matcher: a work the registry or
 * this run already has is matched and reused, a new one is minted. An entry already in the registry
 * is written again with its own id and slug, so a re-run stages the same files and a hand edit shows
 * as a change from upstream instead of being overwritten.
 */
interface Existing {
  id: string;
  slug: string;
  item: CslItem;
}

export interface LegacyWork {
  /** The text the legacy site gave: shown in the report. */
  citation: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
  note?: string;
}

export class EntryBook {
  private readonly known: Known[] = [];
  private readonly existing = new Map<string, Existing>();
  private readonly written = new Set<string>();
  private readonly taken = new Set<string>();
  private next: number;

  private constructor(existing: Existing[], next: number) {
    for (const e of existing) {
      this.existing.set(e.id, e);
      this.known.push({ id: e.id, item: e.item });
      this.taken.add(e.slug);
    }
    this.next = next;
  }

  /** The entries already under `root/content/bibliography_entry`, with their CSL items. */
  static async open(root: string | undefined): Promise<EntryBook> {
    const found: Existing[] = [];
    let highest = 0;
    if (root !== undefined) {
      const dir = path.join(root, 'content/bibliography_entry');
      const names = await readdir(dir).catch(() => [] as string[]);
      for (const name of names.filter((n) => n.endsWith('.yaml')).sort()) {
        const record = parse(await readFile(path.join(dir, name), 'utf8')) as Row;
        const local = name.slice(0, -'.yaml'.length);
        const counter = counterOf('bibliography_entry', local);
        if (counter !== null && counter > highest) highest = counter;
        const csl = await readFile(path.join(dir, `${local}.csl.json`), 'utf8').catch(() => null);
        if (csl === null || typeof record.id !== 'string') continue;
        const parsed = JSON.parse(csl) as unknown;
        const item = (Array.isArray(parsed) ? parsed[0] : parsed) as CslItem;
        found.push({ id: record.id, slug: String(record.slug), item });
      }
    }
    return new EntryBook(found, highest + 1);
  }

  /** The entry for a legacy work: matched when the registry or this run has it, otherwise minted. */
  resolve(work: LegacyWork, out: Collector): string {
    const draft = toCsl(work, 'pending');
    const hit = matchItem(draft, this.known) ?? this.sameCitation(draft);
    if (hit) {
      out.matched.push({ citation: work.citation, entry: hit.id, rule: hit.rule });
      const existing = this.existing.get(hit.id);
      if (existing && !this.written.has(hit.id)) this.write(out, existing.id, existing.slug, toCsl(work, existing.id), work.title);
      return hit.id;
    }
    const local = formatCounterLocalId('bibliography_entry', this.next);
    this.next += 1;
    const id = idOf('bibliography_entry', local);
    const item = toCsl(work, id);
    const slug = slugFor(item, this.taken);
    this.taken.add(slug);
    this.known.push({ id, item });
    this.write(out, id, slug, item, work.title);
    return id;
  }

  /**
   * The matcher gives a work with nothing to go on (no DOI, ISBN, author or year) no match, so a citation
   * like that would be minted again on every run. The import keeps the site's own text in `note`, so the
   * same text under the same title is the entry this import made before.
   */
  private sameCitation(draft: CslItem): { id: string; rule: string } | null {
    if (typeof draft.note !== 'string' || draft.note === '') return null;
    const found = this.known.find((k) => k.item.note === draft.note && k.item.title === draft.title);
    return found ? { id: found.id, rule: 'citation' } : null;
  }

  private write(out: Collector, id: string, slug: string, item: CslItem, title: string): void {
    this.written.add(id);
    const local = id.split(':').slice(3).join(':');
    out.record({ id, family: 'bibliography_entry', origin: 'minted', title, slug, lifecycle: 'researching', release: 'held', csl: `content/bibliography_entry/${local}.csl.json` });
    out.file(`content/bibliography_entry/${local}.csl.json`, `${JSON.stringify(item, null, 2)}\n`);
  }
}

/** The CSL-JSON of a legacy work: what the site said about it and nothing else (spec 008 field-mappings.md). */
export function toCsl(work: LegacyWork, id: string): CslItem {
  // a legacy `url` that is a DOI address is the work's DOI, which the matcher compares
  const doi = normaliseDoi(work.url);
  return {
    id,
    type: 'document',
    title: work.title,
    ...(work.author ? { author: [{ literal: work.author }] } : {}),
    ...(work.year !== undefined ? { issued: { 'date-parts': [[work.year]] } } : {}),
    ...(work.url ? { URL: work.url } : {}),
    ...(doi ? { DOI: doi } : {}),
    ...(work.note ? { note: work.note } : {}),
  } as CslItem;
}
