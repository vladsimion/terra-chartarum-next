/**
 * The named accent slots (ADR 0008, spec 002 FR-012). An essay picks one by name; a free colour is
 * not accepted, because it could not be guaranteed to pass the contrast test in both colour
 * schemes. The values live in tokens.css; a test keeps that file and this list identical.
 */
export const ACCENT_SLOTS = ['gold', 'verdigris', 'madder', 'indigo', 'umber', 'sage'] as const;
export type AccentSlot = (typeof ACCENT_SLOTS)[number];

export const DEFAULT_ACCENT: AccentSlot = 'gold';

/** The slot for a page: the default when none is given, an error for a name that is not a slot. */
export function accentFor(name: string | undefined): AccentSlot {
  if (name === undefined) return DEFAULT_ACCENT;
  if ((ACCENT_SLOTS as readonly string[]).includes(name)) return name as AccentSlot;
  throw new Error(`unknown accent "${name}"; the accent slots are ${ACCENT_SLOTS.join(', ')}`);
}
