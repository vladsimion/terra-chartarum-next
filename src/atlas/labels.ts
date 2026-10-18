import type { IndexLayer } from './types.js';

/* How a layer reads in a list: its role, or "Present-day reference" for modern reference geometry. */
const ROLE: Record<string, string> = { historical: 'Historical', context: 'Context', evidence: 'Evidence', 'map-overlay': 'Map overlay' };

export const kindOf = (layer: Pick<IndexLayer, 'provenance' | 'role'>): string => (layer.provenance === 'modern_reference' ? 'Present-day reference' : (ROLE[layer.role] ?? layer.role));
