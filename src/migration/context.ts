import { stringify } from 'yaml';
import { PRIVATE_WORDS } from '../registry/schemas/map-values.js';

/*
 * What an import run collects as it goes (spec 008 data-model.md "Import report"): the files it
 * would write, and everything it set aside, by name and count and never by value. A private value
 * is dropped before it reaches a record, so it cannot reach a file or the report.
 */
export type Row = Record<string, unknown>;

export interface ImportReport {
  created: string[];
  skipped: string[];
  changed_upstream: { id: string; fields: string[] }[];
  matched: { citation: string; entry: string; rule: string }[];
  dropped: { field: string; count: number }[];
  lossy: { id: string; field: string; from: string; to: string }[];
  report_only: { registry: string; key: string; count: number }[];
  unmapped_terms: { vocabulary: string; term: string; id: string }[];
}

export type StagedFile = string | Uint8Array;

/** An error that stops the import and names the record, so the editor can fix the snapshot or the mapping. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Keys that mean acquisition detail never enter the registry (FR-006, MAP-PRIVATE-FIELD). */
const PRIVATE = new Set<string>([...PRIVATE_WORDS, 'acquisition']);
export const isPrivateKey = (key: string): boolean => PRIVATE.has(key.toLowerCase());

export class Collector {
  readonly files = new Map<string, StagedFile>();
  readonly ids = new Set<string>();
  readonly counts: Record<string, number> = {};
  readonly lossy: ImportReport['lossy'] = [];
  readonly matched: ImportReport['matched'] = [];
  private readonly dropped = new Map<string, number>();
  private readonly reportOnly = new Map<string, number>();

  /** Write a record as `content/<family>/<local-id>.yaml`; an id used twice is a collision and fails naming it. */
  record(record: Row, body?: { extension: string; text: string }): void {
    const id = String(record.id);
    const family = String(record.family);
    const local = id.split(':').slice(3).join(':');
    if (this.ids.has(id)) throw new ImportError(`two records have the id ${id}`);
    this.ids.add(id);
    this.counts[family] = (this.counts[family] ?? 0) + 1;
    this.files.set(`content/${family}/${local}.yaml`, stringify(record));
    if (body) this.files.set(`content/${family}/${local}${body.extension}`, body.text);
  }

  file(path: string, content: StagedFile): void {
    if (this.files.has(path)) throw new ImportError(`two imports write ${path}`);
    this.files.set(path, content);
  }

  drop(key: string): void {
    this.dropped.set(key, (this.dropped.get(key) ?? 0) + 1);
  }

  setAside(registry: string, key: string): void {
    const at = `${registry}\u0000${key}`;
    this.reportOnly.set(at, (this.reportOnly.get(at) ?? 0) + 1);
  }

  /**
   * Account for every key of a legacy row that no mapping used: private ones are dropped (name and
   * count), the rest are reported as set aside. `consumed` are the keys the adapter read.
   */
  rest(registry: string, row: Row, consumed: ReadonlySet<string>): void {
    for (const key of Object.keys(row)) {
      if (consumed.has(key)) continue;
      if (isPrivateKey(key)) this.drop(key);
      else this.setAside(registry, key);
    }
  }

  report(): Pick<ImportReport, 'dropped' | 'report_only' | 'lossy' | 'matched'> {
    const byName = (a: string, b: string) => a.localeCompare(b);
    return {
      dropped: [...this.dropped].sort(([a], [b]) => byName(a, b)).map(([field, count]) => ({ field, count })),
      report_only: [...this.reportOnly]
        .map(([at, count]) => ({ registry: at.split('\u0000')[0] as string, key: at.split('\u0000')[1] as string, count }))
        .sort((a, b) => byName(a.registry, b.registry) || byName(a.key, b.key)),
      lossy: [...this.lossy].sort((a, b) => byName(a.id, b.id) || byName(a.field, b.field)),
      matched: [...this.matched].sort((a, b) => byName(a.citation, b.citation) || byName(a.entry, b.entry)),
    };
  }
}

export const text = (row: Row, key: string): string | undefined => (typeof row[key] === 'string' && (row[key] as string).trim() !== '' ? (row[key] as string) : undefined);
export const number = (row: Row, key: string): number | undefined => (typeof row[key] === 'number' ? (row[key] as number) : undefined);
export const strings = (row: Row, key: string): string[] => (Array.isArray(row[key]) ? (row[key] as unknown[]).filter((v): v is string => typeof v === 'string') : []);
export const objects = (row: Row, key: string): Row[] => (Array.isArray(row[key]) ? (row[key] as unknown[]).filter((v): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)) : []);

export const idOf = (family: string, local: string): string => `tc:tc:${family}:${local}`;
export const ARCHIVE = 'https://terra-chartarum.pages.dev';
