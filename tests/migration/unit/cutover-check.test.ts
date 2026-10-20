import { describe, expect, it } from 'vitest';
import { ANCHOR_ESSAY_SLUG, ciFinding, runCutoverCheck, type CutoverInput } from '../../../src/migration/cutover-check.js';
import type { InventoryEntry } from '../../../src/migration/inventory.js';
import type { RegistryRecord } from '../../../src/registry/types.js';

/*
 * Spec 008 T039 (US4 scenarios 1, 2; SC-006): the automated half of the cutover checklist. Every step is
 * a pure comparison over what the script gathers, so each broken fixture is one field away from the clean
 * one and the failure names the page, URL or rule.
 */
const anchor = { id: `tc:tc:essay:${ANCHOR_ESSAY_SLUG}`, family: 'essay', slug: ANCHOR_ESSAY_SLUG, lifecycle: 'published', release: 'released' } as RegistryRecord;
const inventory: InventoryEntry[] = [
  { path: '/essays/old/', kind: 'essay', outcome: 'in-place' },
  { path: '/rooms/earth/', kind: 'room', outcome: 'rule', to: '/rooms/earth/' },
];
const rules = '# header\n/rooms/earth/ https://terra-chartarum.org/rooms/earth/ 301\n';
const built = new Set(['/rooms/earth/']);

const clean = (): CutoverInput => ({
  gate: [],
  shell: [],
  links: [],
  inventory,
  rules,
  isBuiltPage: (p) => built.has(p),
  ci: { ok: true },
  records: [anchor],
  anchorSlug: ANCHOR_ESSAY_SLUG,
});
const failing = (input: CutoverInput) => runCutoverCheck(input).steps.filter((s) => !s.ok);
const lines = (input: CutoverInput) => failing(input).flatMap((s) => s.findings);

describe('the anchor essay', () => {
  it("is dacia-lapidarium, the editor's choice (the rebuilt Terra Sigillata · Lapidarium Dacicum, legacy /essays/dacia/)", () => {
    expect(ANCHOR_ESSAY_SLUG).toBe('dacia-lapidarium');
  });
});

describe('runCutoverCheck', () => {
  it('passes a clean fixture and reports all six steps', () => {
    const result = runCutoverCheck(clean());
    expect(result.ok).toBe(true);
    expect(result.steps).toHaveLength(6);
  });
  it('fails on an integrity gate error and names it', () => {
    expect(lines({ ...clean(), gate: ['ESSAY-X content/essay/a.yaml: broken'] })).toEqual(['ESSAY-X content/essay/a.yaml: broken']);
  });
  it('fails on a stub page or draft copy and names the page', () => {
    expect(lines({ ...clean(), shell: ['stub about (owner 003): about/index.html', 'draft: rooms/earth/index.html'] })).toEqual(['stub about (owner 003): about/index.html', 'draft: rooms/earth/index.html']);
  });
  it('fails on a dead link and names the page and href', () => {
    expect(lines({ ...clean(), links: [{ page: 'about/index.html', href: '/gone/', reason: 'no such page' }] })).toEqual(['about/index.html: /gone/ (no such page)']);
  });
  it('fails an inventory URL with a rule outcome and no rule, naming the URL', () => {
    expect(lines({ ...clean(), rules: '# header\n' })).toEqual(['/rooms/earth/: the inventory says rule, the file has none']);
  });
  it('fails an extra rule, naming the rule', () => {
    expect(lines({ ...clean(), rules: `${rules}/rooms/extra/ https://terra-chartarum.org/rooms/earth/ 301\n` })).toEqual(['/rooms/extra/: a rule the inventory does not list']);
  });
  it('fails a duplicate rule', () => {
    expect(lines({ ...clean(), rules: `${rules}${rules.split('\n')[1]}\n` })).toEqual(['/rooms/earth/: two rules for one path']);
  });
  it('fails a rule with a dangling target', () => {
    expect(lines({ ...clean(), isBuiltPage: () => false })).toEqual(['/rooms/earth/: the target /rooms/earth/ is not a built page']);
  });
  it('fails when the anchor essay is missing, held or unpublished', () => {
    expect(lines({ ...clean(), records: [] })).toEqual([`essay ${ANCHOR_ESSAY_SLUG}: no such record`]);
    expect(lines({ ...clean(), records: [{ ...anchor, release: 'held' } as RegistryRecord] })).toEqual([`essay ${ANCHOR_ESSAY_SLUG}: not published and released (lifecycle published, release held)`]);
    expect(lines({ ...clean(), records: [{ ...anchor, lifecycle: 'draft' } as RegistryRecord] })[0]).toMatch(/not published and released/);
  });
  it('fails when the CI run is absent or not green', () => {
    expect(lines({ ...clean(), ci: { ok: false, message: 'no registry run for abc1234' } })).toEqual(['no registry run for abc1234']);
  });
  it('names a step per failure, so one break fails one step', () => {
    expect(failing({ ...clean(), gate: ['x'] }).map((s) => s.name)).toEqual(['integrity gate']);
  });
});

describe('ciFinding', () => {
  const sha = 'abc1234';
  it('passes a completed, successful run', () => {
    expect(ciFinding(JSON.stringify([{ status: 'completed', conclusion: 'success' }]), sha)).toEqual({ ok: true });
  });
  it('fails an absent run, naming the commit', () => {
    expect(ciFinding('[]', sha)).toEqual({ ok: false, message: `no registry workflow run for ${sha}` });
  });
  it('fails a run that is not green', () => {
    expect(ciFinding(JSON.stringify([{ status: 'completed', conclusion: 'failure' }]), sha)).toMatchObject({ ok: false });
    expect(ciFinding(JSON.stringify([{ status: 'in_progress', conclusion: '' }]), sha)).toMatchObject({ ok: false });
  });
  it('fails clearly when gh is missing or its output is not JSON', () => {
    expect(ciFinding(new Error('spawn gh ENOENT'), sha)).toEqual({ ok: false, message: 'the GitHub CLI (gh) is needed to read the registry workflow run and could not be run: spawn gh ENOENT' });
    expect(ciFinding('not json', sha)).toMatchObject({ ok: false });
  });
});
