import type { Severity, Violation } from '../report.js';
import type { ProvenanceStep } from '../schemas/provenance-step.js';
import type { RegistryRecord } from '../types.js';

/** Lowest lifecycle at which a rule is an error; below it the same finding is a warning (research R6). */
export type Threshold = 'always' | 'ready_for_build' | 'publishable' | 'published';

/** Order of the main lifecycle line (ADR 0003). */
const RANK: Record<string, number> = {
  proposed: 0,
  researching: 1,
  verified: 2,
  ready_for_build: 3,
  in_build: 4,
  qa: 5,
  publishable: 6,
  published: 7,
};

/*
 * Side states have no place on the main line. `blocked` is not progressing, so it is treated as
 * `proposed`; `superseded` was public, so it keeps the strictness of `published`. Assumption
 * recorded in data-model.md "Lifecycle behaviour".
 */
const SIDE_STATE_RANK: Record<string, number> = { blocked: 0, superseded: 7 };

const THRESHOLD_RANK: Record<Threshold, number> = {
  always: Number.NEGATIVE_INFINITY,
  ready_for_build: 3,
  publishable: 6,
  published: 7,
};

function rankOf(lifecycle: string | undefined): number {
  if (lifecycle === undefined) return 0;
  return RANK[lifecycle] ?? SIDE_STATE_RANK[lifecycle] ?? 0;
}

export function severityFor(from: Threshold, lifecycle: string | undefined): Severity {
  return rankOf(lifecycle) >= THRESHOLD_RANK[from] ? 'error' : 'warning';
}

/**
 * What a finding is about. Usually a record; for a record that should exist but does not (a
 * missing room), just the id and the file it was expected in.
 */
export interface Subject {
  id: string | null;
  file: string;
  lifecycle?: string;
}

/** What a rule reports; the framework turns it into a Violation with the right severity. */
export interface Finding {
  record: Subject;
  field: string | null;
  value: unknown;
  expected: string;
}

export interface RuleContext {
  records: readonly RegistryRecord[];
  /** Canonical id -> record. First record wins when ids are duplicated. */
  index: ReadonlyMap<string, RegistryRecord>;
  options: ValidateOptions;
}

export interface ValidateOptions {
  now?: Date;
  commit?: string;
  /** Also run registry-level completeness rules such as `ROOM-SET`. The CLI turns this on. */
  completeness?: boolean;
  /** Logged automated steps by id, for the AUTO-* rules. Without it a provenance_chain cannot be judged. */
  provenanceIndex?: ReadonlyMap<string, ProvenanceStep>;
  /** feature ids per geometry file path, for `REF-FEATURE`. */
  featureIndex?: ReadonlyMap<string, ReadonlySet<string>>;
  /** asset paths that exist, for `LIFE-AVAILABILITY`. */
  assetIndex?: ReadonlySet<string>;
}

export interface Rule {
  id: string;
  from: Threshold;
  /** Registry-level rule that needs the whole registry to be present; skipped unless requested. */
  completeness?: boolean;
  check(ctx: RuleContext): Finding[];
}

export function defineRule(rule: Rule): Rule {
  return rule;
}

export function toViolation(rule: Rule, finding: Finding): Violation {
  return {
    rule: rule.id,
    severity: severityFor(rule.from, finding.record.lifecycle),
    entity: finding.record.id,
    file: finding.record.file,
    field: finding.field,
    value: finding.value,
    expected: finding.expected,
  };
}
