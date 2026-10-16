import { qualifiedIdOf } from './ids.ts';
import { effectiveLifecycle } from './lifecycle.ts';
import { applyMappings, type VocabMappings } from './mappings.ts';

/** A record as it may appear in any public page or payload. */
export type PublicRecord = Record<string, unknown> & { qualified_id: string };

export interface PublicOptions {
  /** Specialist vocabulary mappings, so a mapped lifecycle term decides release. */
  vocabMappings?: VocabMappings;
}

/**
 * Released means published (data-model.md): derived from `stage` for essays,
 * from the (mapped) `lifecycle` otherwise. Superseded records are not released.
 */
export function isReleased(record: Record<string, unknown>, options: PublicOptions = {}): boolean {
  return effectiveLifecycle(applyMappings(record, options.vocabMappings)) === 'published';
}

/**
 * The public projection (spec 001 FR-009, research.md R8): every public output
 * goes through here, so private data and held content have one exit to guard.
 * Throws on a held record: callers filter with `isReleased` first, and a held
 * record reaching this point is a bug, not a case to render.
 */
export function toPublic(record: Record<string, unknown>, options: PublicOptions = {}): PublicRecord {
  const qualified_id = qualifiedIdOf(record) ?? '(unidentified record)';
  if (!isReleased(record, options)) {
    throw new Error(`${qualified_id} is not released and must not reach public output`);
  }
  const { private: _private, ...rest } = record;
  return { ...rest, qualified_id };
}
