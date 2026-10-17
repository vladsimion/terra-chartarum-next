/**
 * The named accent slots (ADR 0008, spec 002 FR-012). An essay picks one by name; a free colour is
 * not accepted, because it could not be guaranteed to pass the contrast test in both colour
 * schemes. The values live in tokens.css; a test keeps that file and this list identical.
 */
import { ACCENT_SLOTS, type AccentSlot } from '../registry/accent-slots.js';

// The list is owned by the registry (it checks `ESSAY-ACCENT` against it); the shell re-exports it.
export { ACCENT_SLOTS, type AccentSlot };

export const DEFAULT_ACCENT: AccentSlot = 'gold';

/** The slot for a page: the default when none is given, an error for a name that is not a slot. */
export function accentFor(name: string | undefined): AccentSlot {
  if (name === undefined) return DEFAULT_ACCENT;
  if ((ACCENT_SLOTS as readonly string[]).includes(name)) return name as AccentSlot;
  throw new Error(`unknown accent "${name}"; the accent slots are ${ACCENT_SLOTS.join(', ')}`);
}
