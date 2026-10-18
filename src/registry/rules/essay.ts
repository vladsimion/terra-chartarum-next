import { ACCENT_SLOTS } from '../accent-slots.js';
import { isEdtf } from '../dates.js';
import type { BodyTag, EssayBody } from '../essay-body.js';
import { isPublic } from '../publication.js';
import { ESSAY_STAGES, stageAtLeast, type EssayStage } from '../stages.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding, type Rule, type RuleContext } from './framework.js';

/*
 * The essay stage rules (spec 003 contracts/essay-rule-ids.md). They are stage checks, not lifecycle
 * severities: each applies from its own stage onward and is always an error there, so each rule is
 * `from: 'always'` and gates itself on the essay's `stage` through `stages.ts`. The lifecycle an
 * essay is allowed to have is a different rule (`LIFE-ESSAY-DERIVED`).
 */

type Check = (essay: RegistryRecord, ctx: RuleContext) => Omit<Finding, 'record'>[];

/** A rule that runs `check` on every essay at `from` or later. */
function stageRule(id: string, from: EssayStage, check: Check): Rule {
  return defineRule({
    id,
    from: 'always',
    check: (ctx) => {
      const findings: Finding[] = [];
      for (const essay of ctx.records) {
        if (essay.family !== 'essay' || !stageAtLeast(essay.stage, from)) continue;
        for (const found of check(essay, ctx)) findings.push({ record: essay, ...found });
      }
      return findings;
    },
  });
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const present = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const idsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const bodyOf = (essay: RegistryRecord): EssayBody | undefined => (isObject(essay.body) ? (essay.body as unknown as EssayBody) : undefined);
const tagsOf = (essay: RegistryRecord, ...names: BodyTag['tag'][]): BodyTag[] => (bodyOf(essay)?.tags ?? []).filter((t) => names.includes(t.tag));

/** A named, dated person: `{by, on}` with a name and an EDTF date. */
function namedAndDated(value: unknown): string | null {
  if (!isObject(value)) return 'an object with by and on';
  if (!present(value.by)) return 'a non-empty by';
  if (!present(value.on) || !isEdtf(value.on)) return 'a valid EDTF on';
  return null;
}

export const essayQuestion = stageRule('ESSAY-QUESTION', 'Concept', (essay) =>
  present(essay.question) ? [] : [{ field: 'question', value: essay.question ?? null, expected: 'the question the essay asks' }],
);

export const essayRooms = stageRule('ESSAY-ROOMS', 'Concept', (essay, { index }) => {
  const rooms = isObject(essay.rooms) ? essay.rooms : {};
  const findings: Omit<Finding, 'record'>[] = [];
  const primary = rooms.primary;
  if (!present(primary) || index.get(primary)?.family !== 'room') {
    findings.push({ field: 'rooms.primary', value: primary ?? null, expected: 'a primary room' });
  }
  const secondary = idsOf(rooms.secondary);
  if (secondary.length > 2) findings.push({ field: 'rooms.secondary', value: secondary, expected: 'at most two secondary rooms' });
  for (const id of secondary) {
    if (index.get(id)?.family !== 'room') findings.push({ field: 'rooms.secondary', value: id, expected: 'a room' });
    else if (id === primary) findings.push({ field: 'rooms.secondary', value: id, expected: 'a secondary room other than the primary' });
  }
  return findings;
});

/** The first thing wrong with a stage history, or null: contiguous from Concept, each stage once, named and dated, ending at `stage`. */
function historyProblem(essay: RegistryRecord): string | null {
  const history = essay.stage_history;
  if (!Array.isArray(history) || history.length === 0) return 'a stage_history with an entry for each stage reached';
  for (const [i, entry] of history.entries()) {
    if (!isObject(entry)) return `entry ${i + 1} as an object with stage, on and by`;
    if (entry.stage !== ESSAY_STAGES[i]) {
      return i === 0 ? 'a history that starts at Concept' : `${ESSAY_STAGES[i]} as entry ${i + 1}, with no stage skipped or repeated`;
    }
    if (!present(entry.on) || !isEdtf(entry.on)) return `a valid date on ${String(entry.stage)}`;
    if (!present(entry.by)) return `a name in by on ${String(entry.stage)}`;
  }
  const last = (history.at(-1) as Record<string, unknown>).stage;
  return last === essay.stage ? null : `a last entry equal to the current stage ${String(essay.stage)}`;
}

export const essayHistory = stageRule('ESSAY-HISTORY', 'Concept', (essay) => {
  const problem = historyProblem(essay);
  return problem ? [{ field: 'stage_history', value: essay.stage_history ?? null, expected: problem }] : [];
});

export const essayAccent = stageRule('ESSAY-ACCENT', 'Concept', (essay) =>
  essay.accent === undefined || (ACCENT_SLOTS as readonly string[]).includes(String(essay.accent))
    ? []
    : [{ field: 'accent', value: essay.accent, expected: `one of ${ACCENT_SLOTS.join(' | ')}` }],
);

export const essayCorpus = stageRule('ESSAY-CORPUS', 'Corpus', (essay, { index }) => {
  const maps = idsOf(essay.maps);
  if (maps.length === 0) return [{ field: 'maps', value: essay.maps ?? null, expected: 'at least one map in the corpus' }];
  const findings: Omit<Finding, 'record'>[] = [];
  for (const id of maps) {
    const map = index.get(id);
    if (!map) findings.push({ field: 'maps', value: id, expected: 'a map that resolves' });
    else if (!isObject(map.rights)) findings.push({ field: 'maps', value: id, expected: 'a map with a rights state' });
  }
  return findings;
});

export const essayResearch = stageRule('ESSAY-RESEARCH', 'Research', (essay, { index }) => {
  const findings: Omit<Finding, 'record'>[] = [];
  const evidence = idsOf(essay.evidence);
  if (evidence.length === 0) findings.push({ field: 'evidence', value: essay.evidence ?? null, expected: 'evidence for the argument' });
  for (const id of evidence) {
    const record = index.get(id);
    if (record && !(isObject(record.locator) && present(record.locator.value))) {
      findings.push({ field: 'evidence', value: id, expected: 'evidence that carries a locator' });
    }
  }
  if (essay.open_questions === undefined) findings.push({ field: 'open_questions', value: null, expected: 'an open_questions list, even if empty' });
  return findings;
});

export const essayOutline = stageRule('ESSAY-OUTLINE', 'Outline', (essay) =>
  present(essay.thesis) ? [] : [{ field: 'thesis', value: essay.thesis ?? null, expected: 'the thesis' }],
);

export const essayInteraction = stageRule('ESSAY-INTERACTION', 'Outline', (essay, { index }) => {
  const findings: Omit<Finding, 'record'>[] = [];
  const declared = essay.interactions === undefined ? [] : essay.interactions;
  if (!Array.isArray(declared)) return [{ field: 'interactions', value: declared, expected: 'a list of interaction declarations' }];
  const ids = new Set<string>();
  for (const [i, d] of declared.entries()) {
    const at = `interactions[${i}]`;
    if (!isObject(d)) {
      findings.push({ field: at, value: d, expected: 'an object with id, question, evidence and interpretation' });
      continue;
    }
    if (!present(d.id)) findings.push({ field: `${at}.id`, value: d.id ?? null, expected: 'an id the body can refer to' });
    else if (ids.has(d.id)) findings.push({ field: `${at}.id`, value: d.id, expected: 'an id used once in this essay' });
    else ids.add(d.id);
    if (!present(d.question)) findings.push({ field: `${at}.question`, value: d.question ?? null, expected: 'the question the interaction asks' });
    if (!present(d.interpretation)) findings.push({ field: `${at}.interpretation`, value: d.interpretation ?? null, expected: 'the expected interpretation' });
    const evidence = idsOf(d.evidence);
    if (evidence.length === 0) findings.push({ field: `${at}.evidence`, value: d.evidence ?? null, expected: 'at least one evidence id' });
    for (const id of evidence) {
      if (index.get(id)?.family !== 'evidence') findings.push({ field: `${at}.evidence`, value: id, expected: 'an evidence record that resolves' });
    }
  }
  const body = bodyOf(essay);
  if (body?.exists) {
    const used = new Set<string>();
    for (const tag of tagsOf(essay, 'Interaction')) {
      const id = tag.props.id;
      if (id === undefined) continue;
      used.add(id);
      if (!ids.has(id)) findings.push({ field: 'body', value: id, expected: 'an <Interaction id> declared in interactions[]' });
    }
    if (stageAtLeast(essay.stage, 'Build')) {
      for (const id of ids) {
        if (!used.has(id)) findings.push({ field: 'interactions', value: id, expected: 'a declared interaction the body uses' });
      }
    }
  }
  return findings;
});

export const essayDraft = stageRule('ESSAY-DRAFT', 'Draft', (essay, { index }) => {
  if (!bodyOf(essay)?.exists) return [{ field: 'body', value: null, expected: 'an .mdx body beside the record' }];
  const findings: Omit<Finding, 'record'>[] = [];
  const seen = new Set<string>();
  for (const tag of tagsOf(essay, 'Cite', 'EvidencePanel')) {
    const id = tag.props.evidence ?? '';
    if (seen.has(id)) continue;
    seen.add(id);
    const cited = index.get(id);
    if (cited?.family !== 'evidence') {
      findings.push({ field: 'body', value: id || null, expected: `${tag.tag} naming an evidence record that resolves (line ${tag.line})` });
    } else if (typeof cited.source === 'string' && index.get(cited.source)?.is_finding_aid === true) {
      findings.push({ field: 'body', value: id, expected: 'evidence whose source is not a finding aid' });
    }
  }
  return findings;
});

export const essayBodyDynamic = stageRule('ESSAY-BODY-DYNAMIC', 'Draft', (essay) =>
  (bodyOf(essay)?.tags ?? [])
    .filter((tag) => tag.dynamic.length > 0)
    .map((tag) => ({
      field: 'body',
      value: { tag: tag.tag, line: tag.line, props: tag.dynamic },
      expected: 'framework tag props that are string literals',
    })),
);

export const essayBuild = stageRule('ESSAY-BUILD', 'Build', (essay, { index }) => {
  const findings: Omit<Finding, 'record'>[] = [];
  for (const field of ['layers', 'bibliography'] as const) {
    for (const id of idsOf(essay[field])) {
      if (!index.has(id)) findings.push({ field, value: id, expected: `a ${field === 'layers' ? 'layer' : 'bibliography entry'} that resolves` });
    }
  }
  const seen = new Set<string>();
  for (const tag of tagsOf(essay, 'MapFigure')) {
    const id = tag.props.map ?? '';
    if (seen.has(id)) continue;
    seen.add(id);
    if (index.get(id)?.family !== 'map') findings.push({ field: 'body', value: id || null, expected: `a map that exists (MapFigure, line ${tag.line})` });
  }
  return findings;
});

const SIGNOFFS = ['historical', 'cartographic', 'data'] as const;

export const essaySignoff = stageRule('ESSAY-SIGNOFF', 'Publish', (essay) => {
  const findings: Omit<Finding, 'record'>[] = [];
  const signoffs = isObject(essay.signoffs) ? essay.signoffs : {};
  for (const kind of SIGNOFFS) {
    const problem = namedAndDated(signoffs[kind]);
    if (problem) findings.push({ field: `signoffs.${kind}`, value: signoffs[kind] ?? null, expected: `${kind} sign-off: ${problem}` });
  }
  if (essay.design_qa_passed !== true) findings.push({ field: 'design_qa_passed', value: essay.design_qa_passed ?? null, expected: 'design QA passed' });
  return findings;
});

export const essayPublish = stageRule('ESSAY-PUBLISH', 'Publish', (essay) => {
  const findings: Omit<Finding, 'record'>[] = [];
  if (essay.release !== 'released') findings.push({ field: 'release', value: essay.release ?? null, expected: 'release: released' });
  if (!isEdtf(essay.published_on)) findings.push({ field: 'published_on', value: essay.published_on ?? null, expected: 'a valid EDTF date' });
  return findings;
});

export const essayBodyPublic = stageRule('ESSAY-BODY-PUBLIC', 'Publish', (essay, { index }) => {
  const findings: Omit<Finding, 'record'>[] = [];
  const seen = new Set<string>();
  /** Reports an entity that is not public, once; false when it was already seen or does not resolve (the business of ESSAY-DRAFT and ESSAY-BUILD). */
  const check = (id: string | undefined, expected: string): RegistryRecord | undefined => {
    const target = id === undefined ? undefined : index.get(id);
    if (id === undefined || !target || seen.has(id)) return undefined;
    seen.add(id);
    if (!isPublic(target)) findings.push({ field: 'body', value: id, expected });
    return target;
  };
  /** What the reader sees behind a piece of evidence is its source and that source's bibliography entry (FR-017). */
  const checkEvidence = (id: string | undefined, where: string) => {
    const evidence = check(id, `${where} naming a published and released entity`);
    if (!evidence) return;
    const source = check(typeof evidence.source === 'string' ? evidence.source : undefined, `${where} resting on a published and released source (evidence ${id})`);
    if (source) check(typeof source.entry === 'string' ? source.entry : undefined, `${where} resting on a published and released bibliography entry (source ${source.id})`);
  };
  for (const tag of tagsOf(essay, 'MapFigure', 'Cite', 'EvidencePanel')) {
    if (tag.tag === 'MapFigure') check(tag.props.map, `MapFigure naming a published and released entity (line ${tag.line})`);
    else checkEvidence(tag.props.evidence, `${tag.tag} (line ${tag.line})`);
  }
  for (const interaction of Array.isArray(essay.interactions) ? essay.interactions : []) {
    if (!isObject(interaction)) continue;
    for (const id of idsOf(interaction.evidence)) checkEvidence(id, `interaction ${String(interaction.id)}`);
  }
  return findings;
});

export const essayCrosslink = stageRule('ESSAY-CROSSLINK', 'Cross-link', (essay) => {
  if (!present(essay.legacy_url)) return [];
  const problem = namedAndDated(essay.redirect_switched);
  return problem ? [{ field: 'redirect_switched', value: essay.redirect_switched ?? null, expected: `confirmation that the redirect was switched: ${problem}` }] : [];
});

export const ESSAY_RULES: Rule[] = [
  essayQuestion,
  essayRooms,
  essayHistory,
  essayAccent,
  essayCorpus,
  essayResearch,
  essayOutline,
  essayInteraction,
  essayDraft,
  essayBodyDynamic,
  essayBuild,
  essaySignoff,
  essayPublish,
  essayBodyPublic,
  essayCrosslink,
];
