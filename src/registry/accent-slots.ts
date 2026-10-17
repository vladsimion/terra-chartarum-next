/**
 * The named accent slots (ADR 0008, spec 002 FR-012). An essay picks one by name (`ESSAY-ACCENT`);
 * a free colour is not accepted, because it could not be guaranteed to pass the contrast test in
 * both colour schemes. The values live in the shell's `tokens.css`; a shell test keeps that file
 * and this list identical. The registry owns the list so it stays framework-free and the shell
 * re-exports it.
 */
export const ACCENT_SLOTS = ['gold', 'verdigris', 'madder', 'indigo', 'umber', 'sage'] as const;
export type AccentSlot = (typeof ACCENT_SLOTS)[number];
