import type { Row } from '../context.js';

/** The fields every imported record starts with: legacy origin, held, researching, no editor confirmation (TC-D024). */
export function base(family: string, id: string, local: string, title: string): Row {
  return { id, family, origin: 'legacy', title, slug: local, slug_history: [], lifecycle: 'researching', release: 'held', relations: [] };
}

/** A record without its undefined fields: an import never writes an empty one. */
export function defined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}
