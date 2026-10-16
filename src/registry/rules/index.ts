import type { Rule } from './framework.js';
import { ID_RULES } from './id.js';
import { loadPath } from './path.js';
import { REFERENCE_RULES } from './references.js';
import { roomSet } from './rooms.js';
import { SLUG_RULES } from './slug.js';

/** Every registered rule. Each story adds its rule modules here. */
export const ALL_RULES: Rule[] = [...ID_RULES, loadPath, ...SLUG_RULES, ...REFERENCE_RULES, roomSet];
