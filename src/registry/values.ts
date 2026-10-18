/*
 * Small readers for the loosely typed fields of records, shared by the rules, the report and the
 * pages so each reads a field the same way (spec 004 review: they had been copied eight times).
 */

/** The strings of a list field; anything else is an empty list. */
export const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** A value that says something: a non-blank string, a non-empty list, or any other value that is set. */
export const present = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null;

export const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
