import { ALL_RULES } from './rules/index.js';
import type { Threshold } from './rules/framework.js';

export interface ChecklistItem {
  field: string;
  /** The rules that report the field missing, each with the lifecycle from which it is an error. */
  rules: { id: string; from: Threshold }[];
}

/** What a stub of a family must gain, under the lifecycle from which each field becomes an error. */
export interface Checklist {
  ready_for_build: ChecklistItem[];
  publishable: ChecklistItem[];
}

const LATE: readonly Threshold[] = ['publishable', 'published'];

/**
 * The provenance checklist for a new record of `family` (spec 010 FR-003, ADR 0018), read from the
 * rules' `requires`, never typed. A field is listed once: under `ready_for_build` when any rule needs
 * it from then, otherwise under `publishable`.
 */
export function checklistFor(family: string): Checklist {
  const byField = new Map<string, ChecklistItem['rules']>();
  for (const rule of ALL_RULES) {
    for (const requirement of rule.requires ?? []) {
      if (requirement.family !== family) continue;
      byField.set(requirement.field, [...(byField.get(requirement.field) ?? []), { id: rule.id, from: rule.from }]);
    }
  }
  const checklist: Checklist = { ready_for_build: [], publishable: [] };
  for (const [field, rules] of byField) {
    const early = rules.some((rule) => !LATE.includes(rule.from));
    checklist[early ? 'ready_for_build' : 'publishable'].push({ field, rules });
  }
  return checklist;
}
