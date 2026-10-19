/** A map overlay begins part-transparent so the layers under it stay readable (spec 005 FR-019). */
export const DEFAULT_OVERLAY_OPACITY = 0.7;

/** Opacity is a number from 0 to 1; anything else falls back to the default. */
export function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_OVERLAY_OPACITY;
  return Math.min(1, Math.max(0, value));
}
