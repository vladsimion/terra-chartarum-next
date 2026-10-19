import type { RegistryRecord } from '../../../src/registry/types.js';
import type { ValidateOptions } from '../../../src/registry/rules/framework.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { ROOM_NAMES, rooms } from './builders.js';

/** Spec 007: the seven rooms as the successor repository holds them (public, with copy), and one of them to break. */
export const sevenRooms = (): RegistryRecord[] => rooms();
export const roomNamed = (name: (typeof ROOM_NAMES)[number], over: Partial<RegistryRecord> = {}): RegistryRecord => ({ ...rooms().find((r) => r.slug === name)!, ...over });

/** Violations of one rule over the seven rooms with one replaced. */
export const roomHits = (rule: string, replacement: RegistryRecord, options: ValidateOptions = { completeness: true }) =>
  validateRegistry(
    rooms().map((r) => (r.id === replacement.id ? replacement : r)),
    options,
  ).violations.filter((v) => v.rule === rule);
