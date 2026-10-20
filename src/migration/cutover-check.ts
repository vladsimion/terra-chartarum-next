import { isPublic } from '../registry/publication.js';
import type { RegistryRecord } from '../registry/types.js';
import type { DeadLink } from '../shell/links.js';
import type { InventoryEntry } from './inventory.js';

/*
 * The automated half of the cutover checklist (spec 008 FR-018, contracts/cutover.md). Each step is a pure
 * comparison over what `scripts/cutover-check.ts` gathers from the build, the registry and `gh`, so a
 * broken fixture is tested without a build. A finding names the page, URL or rule, never page text.
 */
/** The v1 anchor essay (ADR 0002): Terra Sigillata · Lapidarium Dacicum, rebuilt; the editor chose this slug on 2026-10-20. The script lets the editor name another slug. */
export const ANCHOR_ESSAY_SLUG = 'dacia-lapidarium';

export type CiResult = { ok: true } | { ok: false; message: string };

export interface CutoverInput {
  /** Integrity gate errors, one line each. */
  gate: string[];
  /** `shell:check` findings (stub pages, draft copy), one line each. */
  shell: string[];
  links: DeadLink[];
  inventory: readonly InventoryEntry[];
  /** The text of `archive/_redirects`. */
  rules: string;
  /** Whether a successor path (`/rooms/earth/`) is a page of the production build. */
  isBuiltPage: (path: string) => boolean;
  ci: CiResult;
  records: readonly RegistryRecord[];
  anchorSlug: string;
}

export interface CutoverStep {
  name: string;
  ok: boolean;
  findings: string[];
}
export interface CutoverResult {
  ok: boolean;
  steps: CutoverStep[];
}

interface Rule {
  from: string;
  to: string;
}
const parseRules = (text: string): Rule[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => {
      const [from = '', to = ''] = l.split(/\s+/);
      return { from, to };
    });

function redirectFindings(input: CutoverInput): string[] {
  const findings: string[] = [];
  const rules = parseRules(input.rules);
  const byPath = new Map<string, Rule[]>();
  for (const r of rules) byPath.set(r.from, [...(byPath.get(r.from) ?? []), r]);
  const listed = new Map(input.inventory.map((e) => [e.path, e]));
  for (const entry of input.inventory) {
    if (entry.outcome === 'rule' && !byPath.has(entry.path)) findings.push(`${entry.path}: the inventory says rule, the file has none`);
  }
  for (const [from, found] of byPath) {
    const entry = listed.get(from);
    if (!entry || entry.outcome !== 'rule') findings.push(`${from}: a rule the inventory does not list`);
    if (found.length > 1) findings.push(`${from}: two rules for one path`);
    for (const r of found.slice(0, 1)) {
      let target: string;
      try {
        target = new URL(r.to).pathname;
      } catch {
        findings.push(`${from}: the target ${r.to} is not an absolute URL`);
        continue;
      }
      if (entry?.outcome === 'rule' && !input.isBuiltPage(target)) findings.push(`${from}: the target ${target} is not a built page`);
    }
  }
  return findings;
}

function anchorFindings(input: CutoverInput): string[] {
  const essay = input.records.find((r) => r.family === 'essay' && r.slug === input.anchorSlug);
  if (!essay) return [`essay ${input.anchorSlug}: no such record`];
  if (isPublic(essay)) return [];
  return [`essay ${input.anchorSlug}: not published and released (lifecycle ${essay.lifecycle}, release ${essay.release})`];
}

export function runCutoverCheck(input: CutoverInput): CutoverResult {
  const step = (name: string, findings: string[]): CutoverStep => ({ name, ok: findings.length === 0, findings });
  const steps = [
    step('integrity gate', input.gate),
    step('stub pages and draft copy', input.shell),
    step('links', input.links.map((l) => `${l.page}: ${l.href} (${l.reason})`)),
    step('redirect file against the inventory', redirectFindings(input)),
    step('Lighthouse budgets (registry CI run)', input.ci.ok ? [] : [input.ci.message]),
    step('v1 anchor essay', anchorFindings(input)),
  ];
  return { ok: steps.every((s) => s.ok), steps };
}

/**
 * Reads the output of `gh run list --workflow registry --commit <sha> --json status,conclusion` (or the error
 * from running it). The most recent run for the commit must be completed and successful.
 */
export function ciFinding(output: string | Error, sha: string): CiResult {
  if (output instanceof Error) return { ok: false, message: `the GitHub CLI (gh) is needed to read the registry workflow run and could not be run: ${output.message}` };
  let runs: { status?: string; conclusion?: string }[];
  try {
    runs = JSON.parse(output) as typeof runs;
    if (!Array.isArray(runs)) throw new Error('not a list');
  } catch {
    return { ok: false, message: `could not read the registry workflow runs for ${sha}: gh did not return a JSON list` };
  }
  const latest = runs[0];
  if (!latest) return { ok: false, message: `no registry workflow run for ${sha}` };
  if (latest.status !== 'completed') return { ok: false, message: `the registry workflow run for ${sha} is ${latest.status ?? 'unknown'}, not completed` };
  if (latest.conclusion !== 'success') return { ok: false, message: `the registry workflow run for ${sha} concluded ${latest.conclusion || 'unknown'}, not success` };
  return { ok: true };
}
