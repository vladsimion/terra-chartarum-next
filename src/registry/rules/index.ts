import type { Rule } from './framework.js';
import { AUTOMATED_RULES } from './automated.js';
import { ENUM_RULES } from './enums.js';
import { famRequired } from './family.js';
import { refFeature } from './geometry.js';
import { ID_RULES } from './id.js';
import { IMPORT_RULES } from './import.js';
import { LIFECYCLE_RULES } from './lifecycle.js';
import { LOCATOR_RULES } from './locators.js';
import { loadPath } from './path.js';
import { PROVENANCE_RULES } from './provenance.js';
import { REFERENCE_RULES } from './references.js';
import { roomSet } from './rooms.js';
import { RIGHTS_RULES } from './rights.js';
import { SILENCE_RULES } from './silence.js';
import { SLUG_RULES } from './slug.js';

/** Every registered rule. Each story adds its rule modules here. */
export const ALL_RULES: Rule[] = [
  ...ID_RULES,
  loadPath,
  ...SLUG_RULES,
  ...REFERENCE_RULES,
  roomSet,
  ...ENUM_RULES,
  ...PROVENANCE_RULES,
  ...LOCATOR_RULES,
  ...SILENCE_RULES,
  ...RIGHTS_RULES,
  ...AUTOMATED_RULES,
  ...IMPORT_RULES,
  refFeature,
  famRequired,
  ...LIFECYCLE_RULES,
];
