import { Collector, ImportError, idOf, number, text, type Row } from '../context.js';
import type { EntryBook } from '../entries.js';
import { base } from './common.js';

const MAPPED = new Set(['id', 'author', 'year', 'title', 'citation', 'url']);

/**
 * Bibliography (`bibliography.ts`): each legacy item is a Source that keeps its legacy id and points
 * at an entry (ADR 0014). The entry comes from the matcher, so two items that cite one work share one
 * entry. `section` is left unset: no section is public until the editor sets one (FR-012).
 */
export function importBibliography(rows: Row[], book: EntryBook, out: Collector): Map<string, string> {
  const entries = new Map<string, string>();
  for (const row of rows) {
    const local = text(row, 'id');
    const title = text(row, 'title');
    if (!local || !title) throw new ImportError(`a bibliography item has no id or title: ${JSON.stringify(Object.keys(row))}`);
    const entry = book.resolve({ citation: text(row, 'citation') ?? title, title, author: text(row, 'author'), year: number(row, 'year'), url: text(row, 'url'), note: text(row, 'citation') }, out);
    out.record({ ...base('source', idOf('source', local), local, title), is_finding_aid: false, entry });
    entries.set(local, entry);
    out.rest('bibliography', row, MAPPED);
  }
  return entries;
}
