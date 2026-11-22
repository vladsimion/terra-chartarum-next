/*
 * IIIF manifest fingerprints (spec 010 FR-017, research R8 "Manifests"): the sorted canvas ids and
 * their count, from Presentation 3 `items` or Presentation 2 `sequences[0].canvases`. A reordering
 * is not a change; a canvas added, removed or renamed is, and the editor reviews what points at it.
 */

export interface Fingerprint {
  canvases: string[];
  count: number;
}

export interface FingerprintDiff {
  changed: boolean;
  added: string[];
  removed: string[];
  countBefore: number;
  countAfter: number;
}

export function fingerprint(manifest: unknown): Fingerprint {
  const m = (manifest ?? {}) as { items?: unknown; sequences?: unknown };
  let canvases: unknown[] | undefined;
  if (Array.isArray(m.items)) canvases = m.items;
  else if (Array.isArray(m.sequences)) {
    const first = m.sequences[0] as { canvases?: unknown } | undefined;
    if (Array.isArray(first?.canvases)) canvases = first.canvases;
  }
  if (!canvases) throw new Error('not an IIIF manifest: no Presentation 3 items or Presentation 2 sequences[0].canvases');
  const ids = canvases
    .map((c) => {
      const canvas = (c ?? {}) as { id?: unknown; '@id'?: unknown };
      return typeof canvas.id === 'string' ? canvas.id : typeof canvas['@id'] === 'string' ? canvas['@id'] : null;
    })
    .filter((id): id is string => id !== null)
    .sort();
  return { canvases: ids, count: canvases.length };
}

export function diffFingerprint(before: Fingerprint, after: Fingerprint): FingerprintDiff {
  const was = new Set(before.canvases);
  const now = new Set(after.canvases);
  const added = after.canvases.filter((id) => !was.has(id));
  const removed = before.canvases.filter((id) => !now.has(id));
  return { changed: added.length > 0 || removed.length > 0 || before.count !== after.count, added, removed, countBefore: before.count, countAfter: after.count };
}
