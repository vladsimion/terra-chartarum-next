/**
 * Boundary mappings for records imported from the live Terra Chartarum (ADR 0001, ADR 0006 items
 * 11 to 14). The importer lives in spec 008; the registry owns what an imported record must look
 * like until the editor has confirmed it.
 */

/** Never auto-`secure`: promotion needs a verified locator and a person. */
export const LEGACY_CONFIDENCE_MAP: Readonly<Record<string, string>> = {
  high: 'probable',
  medium: 'possible',
  low: 'conjectural',
};

/** FR-011: imported layer terms map onto the shared lifecycle. */
export const LEGACY_LAYER_LIFECYCLE_MAP: Readonly<Record<string, string>> = {
  planned: 'proposed',
  'in-preparation': 'in_build',
  'in-review': 'qa',
  published: 'published',
};

/** Legacy families that are not imported under their own name. */
export const LEGACY_FAMILY_PORT = 'port';
export const LEGACY_FAMILY_PROJECT = 'project';
