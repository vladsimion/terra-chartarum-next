/*
 * How geometry provenance and date uncertainty are drawn (spec 005 FR-015, SC-006,
 * contracts/atlas-page.md). Each class has its own line and fill pattern, so no layer is told apart
 * by colour alone; the legend and the inspector say the same in words.
 */

export type LinePattern = 'solid' | 'dashed' | 'dash-dot' | 'dotted';
export type FillPattern = 'solid' | 'diagonal-hatch' | 'cross-hatch' | 'none';

export interface StyleClass {
  id: 'documentary' | 'reconstruction' | 'generalised' | 'reference';
  line: LinePattern;
  fill: FillPattern;
  /** Legend and inspector text. */
  label: string;
  /** The pattern in words, for a reader who cannot see it. */
  description: string;
  /** Drawn thin and grey: the present-day reference. */
  thin: boolean;
}

/** The classes, in the order the legend lists them. */
export const STYLE_CLASSES: readonly StyleClass[] = [
  { id: 'documentary', line: 'solid', fill: 'solid', label: 'Documentary geometry', description: 'solid line, solid fill', thin: false },
  { id: 'reconstruction', line: 'dashed', fill: 'diagonal-hatch', label: 'Reconstruction', description: 'dashed line, diagonal hatching', thin: false },
  { id: 'generalised', line: 'dash-dot', fill: 'cross-hatch', label: 'Generalised (editorial)', description: 'dash-dot line, cross hatching', thin: false },
  { id: 'reference', line: 'dotted', fill: 'none', label: 'Present-day reference', description: 'thin grey dotted line, no fill', thin: true },
];

const BY_PROVENANCE: Record<string, StyleClass['id']> = {
  source_geometry: 'documentary',
  georeferenced_trace: 'documentary',
  scholarly_reconstruction: 'reconstruction',
  generalized_editorial: 'generalised',
  modern_reference: 'reference',
};

/** The style of a geometry provenance value, or null when it is none of the five. */
export function styleFor(provenance: unknown): StyleClass | null {
  const id = typeof provenance === 'string' && Object.hasOwn(BY_PROVENANCE, provenance) ? BY_PROVENANCE[provenance] : undefined;
  return STYLE_CLASSES.find((c) => c.id === id) ?? null;
}

/** A feature only possibly valid at the chosen year: reduced opacity, with its own legend line. */
export const DATE_UNCERTAIN = {
  marker: 'reduced-opacity',
  opacity: 0.45,
  label: 'Date uncertain',
  description: 'drawn paler: the feature is only possibly valid at this year',
} as const;

/** Dash lengths (in line widths) for MapLibre's `line-dasharray`; solid is none. */
export function lineDash(line: LinePattern): number[] {
  return { solid: [], dashed: [4, 2], 'dash-dot': [4, 2, 1, 2], dotted: [1, 2] }[line];
}

export interface LegendEntry {
  label: string;
  description: string;
}

/** What is on the map: a provenance value, and whether some of it is drawn as date-uncertain. */
export interface Present {
  provenance: unknown;
  uncertain?: boolean;
}

/** The legend: only the classes present, in the contract order, and "Date uncertain" only if some feature is. */
export function legendFor(present: readonly Present[]): LegendEntry[] {
  const used = new Set(present.map((p) => styleFor(p.provenance)?.id).filter((id) => id !== undefined));
  const entries: LegendEntry[] = STYLE_CLASSES.filter((c) => used.has(c.id)).map(({ label, description }) => ({ label, description }));
  if (entries.length > 0 && present.some((p) => p.uncertain === true && styleFor(p.provenance))) {
    entries.push({ label: DATE_UNCERTAIN.label, description: DATE_UNCERTAIN.description });
  }
  return entries;
}
