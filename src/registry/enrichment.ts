import { DISPLAYED_FIELDS } from './schemas/map-values.js';
import { list, present } from './values.js';
import type { RegistryRecord } from './types.js';

/*
 * What is incomplete in the map records and what to enrich first (spec 004 US5, research R7). An
 * editor report: it reads every record, held ones included, because a held map is the work ahead.
 * Pure and framework-free, so it runs in CI and from R pipelines. Three ordinal factors from 1 to 3,
 * explainable and testable; the score is their product (1 to 27) and ties sort by id.
 */
export interface Completeness {
  id: string;
  lifecycle: string;
  /** How many fields a record page displays. */
  displayed: number;
  /** How many of them have a value. */
  recorded: number;
  /** Displayed fields with no value and no stated status. */
  gaps: string[];
  /** The stated status of each displayed field that has no value. */
  statuses: Record<string, string>;
}

export interface QueueItem {
  id: string;
  title: string;
  lifecycle: string;
  impact: number;
  risk: number;
  reuse: number;
  score: number;
  gaps: string[];
}

const maps = (records: readonly RegistryRecord[]): RegistryRecord[] => records.filter((r) => r.family === 'map');

export function completenessOf(map: RegistryRecord): Completeness {
  const stated = (typeof map.field_status === 'object' && map.field_status !== null ? map.field_status : {}) as Record<string, unknown>;
  const gaps: string[] = [];
  const statuses: Record<string, string> = {};
  let recorded = 0;
  for (const field of DISPLAYED_FIELDS) {
    const hasValue = field === 'dimensions' ? typeof map.dimensions === 'object' && map.dimensions !== null : present(map[field]);
    if (hasValue) recorded += 1;
    else if (typeof stated[field] === 'string') statuses[field] = stated[field] as string;
    else gaps.push(field);
  }
  return { id: map.id, lifecycle: String(map.lifecycle ?? ''), displayed: DISPLAYED_FIELDS.length, recorded, gaps, statuses };
}

/** 0 → 1, 1 → 2, two or more → 3. */
const band = (count: number): number => (count === 0 ? 1 : count === 1 ? 2 : 3);
/** 0 or 1 → 1, 2 to 4 → 2, 5 or more → 3. */
const riskBand = (count: number): number => (count <= 1 ? 1 : count <= 4 ? 2 : 3);

export function enrichmentQueue(records: readonly RegistryRecord[]): QueueItem[] {
  return maps(records)
    .map((map): QueueItem => {
      const c = completenessOf(map);
      const doubtful = Object.values(c.statuses).filter((s) => s === 'not_yet_verified' || s === 'unknown').length;
      const essays = records.filter((r) => r.family === 'essay' && list(r.maps).includes(map.id)).length;
      const reused = records.filter((r) => (r.family === 'layer' || r.family === 'place') && list(r.relations).includes(map.id)).length;
      const impact = band(essays);
      const risk = riskBand(c.gaps.length + doubtful);
      const reuse = band(reused);
      return { id: map.id, title: String(map.title), lifecycle: c.lifecycle, impact, risk, reuse, score: impact * risk * reuse, gaps: c.gaps };
    })
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Every map's completeness, in id order. */
export function completenessReport(records: readonly RegistryRecord[]): Completeness[] {
  return maps(records)
    .map((m) => completenessOf(m))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function renderQueueMarkdown(queue: readonly QueueItem[]): string {
  const lines = [
    '# Enrichment queue',
    '',
    'Map records ranked by impact × risk × reuse (specs/004-collection-catalogue/research.md R7). Impact: essays that cite the map, held ones too. Risk: gaps plus fields not yet verified or unknown. Reuse: layers and places that refer to it. Each factor is 1 to 3; ties by id. An editor report: it is never part of the site.',
    '',
  ];
  if (queue.length === 0) return [...lines, 'No map records.', ''].join('\n');
  lines.push('| Rank | Map | Lifecycle | Impact | Risk | Reuse | Score | Gaps |', '|---|---|---|---|---|---|---|---|');
  queue.forEach((item, i) => {
    lines.push(`| ${i + 1} | ${item.id} | ${item.lifecycle} | ${item.impact} | ${item.risk} | ${item.reuse} | ${item.score} | ${item.gaps.join(', ')} |`);
  });
  return [...lines, ''].join('\n');
}
