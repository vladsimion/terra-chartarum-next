import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { main } from '../../../src/registry/cli.js';
import { writeRegistry } from '../support/disk.js';
import { EV, essayAt, historyTo, world } from '../support/essays.js';

/*
 * Spec 003 T018 (ADR 0010, contracts/cli-additions.md): `registry promote` moves one essay one stage,
 * only when the candidate passes the whole registry's checks, keeping the file's comments and order.
 */
const ID = 'tc:tc:essay:essay-000001';
const FILE = 'content/essay/essay-000001.yaml';

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await main(args, { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

const read = (root: string) => readFileSync(path.join(root, FILE), 'utf8');
const today = () => new Date().toISOString().slice(0, 10);
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** An essay at Corpus that already holds what Research asks for, so one promotion is valid. */
const readyForResearch = () => essayAt('Corpus', { evidence: [EV], sources: ['tc:tc:source:source-000001'], open_questions: [] });

const COMMENTED = `# Frontier essay; keep this comment.
id: ${ID}
family: essay
origin: minted
title: essay 1
slug: essay-1
slug_history: []
stage: Corpus   # trailing note
lifecycle: researching
release: held
relations: []
question: How did a map fix a frontier?
authors:
  - A. Editor
rooms:
  primary: tc:tc:room:map
  secondary:
    - tc:tc:room:border
accent: verdigris
rights:
  licence: CC-BY-4.0
maps:
  - tc:tc:map:map-000001
evidence:
  - ${EV}
sources:
  - tc:tc:source:source-000001
open_questions: []
stage_history:
  - stage: Concept
    on: 2026-10-01
    by: A. Editor
  - stage: Corpus
    on: 2026-10-02
    by: A. Editor
`;

describe('registry promote', () => {
  it('moves an essay one stage, writing stage, derived lifecycle and a history entry', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    const { code, out } = await run(['promote', ID, 'Research', '--by', 'B. Reviewer', '--dir', root]);
    expect(code).toBe(0);
    expect(out).toMatch(/Research/);
    const essay = parse(read(root));
    expect(essay.stage).toBe('Research');
    expect(essay.lifecycle).toBe('researching');
    const last = essay.stage_history.at(-1);
    expect(last).toMatchObject({ stage: 'Research', by: 'B. Reviewer' });
    expect([today(), todayLocal()]).toContain(String(last.on));
    expect(essay.stage_history).toHaveLength(3);
  });

  it('writes the lifecycle that goes with the new stage when it changes', async () => {
    // Research -> Outline changes researching -> verified
    const outline = essayAt('Research', { thesis: 'It did so by omission.', interactions: [] });
    const root = writeRegistry([...world(), outline]);
    const { code } = await run(['promote', ID, 'Outline', '--by', 'B', '--dir', root]);
    expect(code).toBe(0);
    expect(parse(read(root)).lifecycle).toBe('verified');
  });

  it('keeps the file’s comments and key order', async () => {
    const root = writeRegistry([...world(), readyForResearch()], { yamlByFile: { [FILE]: COMMENTED } });
    expect((await run(['promote', ID, 'Research', '--by', 'B', '--dir', root])).code).toBe(0);
    const after = read(root);
    expect(after).toContain('# Frontier essay; keep this comment.');
    expect(after).toContain('# trailing note');
    const keys = (text: string) => text.split('\n').filter((l) => /^[a-z_]+:/.test(l)).map((l) => l.split(':')[0]);
    expect(keys(after)).toEqual(keys(COMMENTED));
  });

  it('leaves every other file untouched', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    const map = readFileSync(path.join(root, 'content/map/map-000001.yaml'), 'utf8');
    await run(['promote', ID, 'Research', '--by', 'B', '--dir', root]);
    expect(readFileSync(path.join(root, 'content/map/map-000001.yaml'), 'utf8')).toBe(map);
  });

  it('refuses a skipped stage and writes nothing', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    const before = read(root);
    const { code, err } = await run(['promote', ID, 'Draft', '--by', 'B', '--dir', root]);
    expect(code).toBe(1);
    expect(err + '').toMatch(/Research/);
    expect(read(root)).toBe(before);
  });

  it('refuses to stay or go back', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    expect((await run(['promote', ID, 'Corpus', '--by', 'B', '--dir', root])).code).toBe(1);
    expect((await run(['promote', ID, 'Concept', '--by', 'B', '--dir', root])).code).toBe(1);
  });

  it('refuses a failing check, naming the rule, and writes nothing', async () => {
    const root = writeRegistry([...world(), essayAt('Corpus')]);
    const before = read(root);
    const { code, out, err } = await run(['promote', ID, 'Research', '--by', 'B', '--dir', root]);
    expect(code).toBe(1);
    expect(out + err).toContain('ESSAY-RESEARCH');
    expect(read(root)).toBe(before);
  });

  it('is not stopped by an error on another entity', async () => {
    const broken = { ...world().find((r) => r.family === 'source')!, release: 'maybe' };
    const root = writeRegistry([...world().filter((r) => r.family !== 'source'), broken, readyForResearch()]);
    expect((await run(['promote', ID, 'Research', '--by', 'B', '--dir', root])).code).toBe(0);
  });

  it('--check does everything except write', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    const before = read(root);
    const { code, out } = await run(['promote', ID, 'Research', '--by', 'B', '--check', '--dir', root]);
    expect(code).toBe(0);
    expect(out).toMatch(/Research/);
    expect(read(root)).toBe(before);
  });

  it('--check exits 1 when the promotion would be refused', async () => {
    const root = writeRegistry([...world(), essayAt('Corpus')]);
    expect((await run(['promote', ID, 'Research', '--by', 'B', '--check', '--dir', root])).code).toBe(1);
  });

  it('exits 2 for an unknown essay, an unknown stage and a missing or empty --by', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    expect((await run(['promote', 'tc:tc:essay:essay-000099', 'Research', '--by', 'B', '--dir', root])).code).toBe(2);
    expect((await run(['promote', ID, 'Printing', '--by', 'B', '--dir', root])).code).toBe(2);
    expect((await run(['promote', ID, 'Research', '--dir', root])).code).toBe(2);
    expect((await run(['promote', ID, 'Research', '--by', '  ', '--dir', root])).code).toBe(2);
    expect((await run(['promote', '--dir', root])).code).toBe(2);
  });

  it('exits 2 for a record that is not an essay', async () => {
    const root = writeRegistry([...world(), readyForResearch()]);
    expect((await run(['promote', 'tc:tc:map:map-000001', 'Research', '--by', 'B', '--dir', root])).code).toBe(2);
  });

  describe('Publish', () => {
    // released and signed off while still at Design QA, as the contract expects
    const designQa = () =>
      essayAt('Publish', { stage: 'Design QA', lifecycle: 'publishable', stage_history: historyTo('Design QA') });

    it('promotes and prints that CI proves accessibility and performance, never that it ran them', async () => {
      const root = writeRegistry([...world(true), designQa()]);
      const { code, out } = await run(['promote', ID, 'Publish', '--by', 'B', '--dir', root]);
      expect(code).toBe(0);
      expect(parse(read(root)).lifecycle).toBe('published');
      expect(out).toMatch(/accessibility/i);
      expect(out).toMatch(/performance/i);
      expect(out).toMatch(/pull request/i);
      expect(out).toMatch(/template/i);
      expect(out).not.toMatch(/\b(passed|verified) accessibility/i);
    });

    it('prints the same requirement for --check', async () => {
      const root = writeRegistry([...world(true), designQa()]);
      const { out } = await run(['promote', ID, 'Publish', '--by', 'B', '--check', '--dir', root]);
      expect(out).toMatch(/pull request/i);
    });

    it('stays quiet about CI for other stages', async () => {
      const root = writeRegistry([...world(), readyForResearch()]);
      const { out } = await run(['promote', ID, 'Research', '--by', 'B', '--dir', root]);
      expect(out).not.toMatch(/pull request/i);
    });
  });
});
