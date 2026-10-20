import { ESSAY_STAGES, lifecycleFor } from '../registry/stages.js';
import type { RegistryRecord } from '../registry/types.js';

/*
 * The pure part of `essay:preview` (spec 009, contracts/review-tooling.md): which records an essay uses,
 * and what the temporary preview copy changes in them. The script copies files and runs the build; this
 * module never touches the filesystem, so the real registry cannot be written from here.
 */
const ids = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

function essayBySlug(records: readonly RegistryRecord[], slug: string): RegistryRecord {
  const essay = records.find((r) => r.family === 'essay' && r.slug === slug);
  if (!essay) throw new Error(`no essay with the slug ${slug}`);
  return essay;
}

/** The essay and every record it needs to be public: its maps, evidence, sources and entries, plus each evidence record's source and that source's entry. */
export function selectUsedRecords(records: readonly RegistryRecord[], slug: string, omittedMaps: readonly string[] = []): Set<string> {
  const essay = essayBySlug(records, slug);
  const byId = new Map(records.map((r) => [r.id, r]));
  const used = new Set<string>([essay.id]);
  for (const key of ['maps', 'evidence', 'sources', 'bibliography'] as const) {
    for (const id of ids(essay[key])) if (!omittedMaps.includes(id)) used.add(id);
  }
  for (const id of [...used]) {
    const record = byId.get(id);
    if (record?.family === 'evidence' && typeof record.source === 'string') used.add(record.source);
  }
  for (const id of [...used]) {
    const record = byId.get(id);
    if (record?.family === 'source' && typeof record.entry === 'string') used.add(record.entry);
  }
  return used;
}

const PREVIEW = 'preview';

/**
 * The fields to change in the temporary copy, by record id. The essay becomes a published essay at the
 * Publish stage so the build's whole-registry gate accepts it, with every person-dated field stamped
 * `preview` (never a real sign-off or date); each record it uses becomes published and released.
 */
export function previewPatches(
  records: readonly RegistryRecord[],
  slug: string,
  today: string,
  options: { without?: readonly string[] } = {},
): Record<string, Record<string, unknown>> {
  const essay = essayBySlug(records, slug);
  const maps = ids(essay.maps);
  // a map left out is named by its slug and must be one of the essay's own maps
  const omitted = (options.without ?? []).map((mapSlug) => {
    const map = records.find((r) => r.family === 'map' && r.slug === mapSlug && maps.includes(r.id));
    if (!map) throw new Error(`the essay does not use a map with the slug ${mapSlug}`);
    return map.id;
  });
  const used = selectUsedRecords(records, slug, omitted);
  const patches: Record<string, Record<string, unknown>> = {};
  for (const id of used) patches[id] = { lifecycle: 'published', release: 'released' };
  const stamp = { by: PREVIEW, on: today };
  patches[essay.id] = {
    stage: 'Publish',
    lifecycle: lifecycleFor('Publish', true),
    release: 'released',
    ...(omitted.length > 0 ? { maps: maps.filter((id) => !omitted.includes(id)) } : {}),
    design_qa_passed: true,
    published_on: today,
    stage_history: ESSAY_STAGES.slice(0, ESSAY_STAGES.indexOf('Publish') + 1).map((stage) => ({ stage, ...stamp })),
    signoffs: { historical: { ...stamp }, cartographic: { ...stamp }, data: { ...stamp } },
  };
  return patches;
}

/** The body without the `<MapFigure>` of each named map, so a stone left out of the preview is source-only there. */
export function stripMapFigures(body: string, mapIds: readonly string[]): string {
  let out = body;
  for (const id of mapIds) out = out.replace(new RegExp(`<MapFigure\\s+map="${id}"\\s*/>`, 'g'), '');
  return out;
}

