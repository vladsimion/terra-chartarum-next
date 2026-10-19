import type { RegistryRecord } from '../../../src/registry/types.js';
import type { ValidateOptions } from '../../../src/registry/rules/framework.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { localId, record, source } from './builders.js';

/** Spec 006: builders for bibliography entries and their neighbours that satisfy every bibliography rule, so a test breaks one thing. */
export const PUBLIC = { lifecycle: 'published', release: 'released' } as const;
export const HELD = { lifecycle: 'researching', release: 'held' } as const;

export const cslPath = (n: number) => `content/bibliography_entry/${localId('bibliography_entry', n)}.csl.json`;

export const entry = (n = 1, o: Partial<RegistryRecord> = {}) =>
  record('bibliography_entry', n, { csl: cslPath(n), section: 'specialised_studies', ...o });

/** The CSL-JSON text of an entry: one item whose id is the entry's stable id. */
export const cslText = (e: RegistryRecord, over: Record<string, unknown> = {}): string =>
  JSON.stringify({ id: e.id, type: 'book', title: 'A fixture study', author: [{ family: 'Moe', given: 'Jane' }], issued: { 'date-parts': [[1994]] }, ...over });

/** The CSL files the loader would have read for these entries. */
export const cslFilesFor = (...entries: RegistryRecord[]): ReadonlyMap<string, string> => new Map(entries.map((e) => [String(e.csl), cslText(e)]));

/** A Source that points at an entry. */
export const pointing = (n: number, at: RegistryRecord | null, o: Partial<RegistryRecord> = {}) => source(n, { ...(at ? { entry: at.id } : {}), ...o });

/** Violations of one rule over some records. */
export const hitsOf = (rule: string, records: RegistryRecord[], options?: ValidateOptions) =>
  validateRegistry(records, options).violations.filter((v) => v.rule === rule);

/** `hitsOf` for one record at a lifecycle, with its neighbours. */
export const atLifecycle = (rule: string, lifecycle: string, subject: RegistryRecord, others: RegistryRecord[] = [], options?: ValidateOptions) =>
  hitsOf(rule, [{ ...subject, lifecycle }, ...others], options);
