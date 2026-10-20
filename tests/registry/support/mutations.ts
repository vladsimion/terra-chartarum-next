import type { ProvenanceStep } from '../../../src/registry/schemas/provenance-step.js';
import type { ValidateOptions } from '../../../src/registry/rules/framework.js';
import type { RegistryRecord } from '../../../src/registry/types.js';
import { validateRegistry } from '../../../src/registry/validate.js';
import { ESSAY_STAGES, lifecycleFor, type EssayStage } from '../../../src/registry/stages.js';
import { STATIC_ASSET_LIMIT_BYTES } from '../../../src/registry/schemas/atlas-values.js';
import { record as build, rooms } from './builders.js';
import { generatedFeatures, generatedProvenance, generateRegistry, STEP_ID } from './synthetic.js';

/** A named change to a valid registry that must trigger one specific rule as an error (SC-003). */
export interface Mutation {
  name: string;
  /** Stable rule ID from contracts/rule-ids.md. */
  rule: string;
  apply(records: RegistryRecord[]): RegistryRecord[];
  /** For rules that judge more than the records (logged steps, geometry files). */
  options?(base: ValidateOptions): ValidateOptions;
}

export interface MutationResult {
  baseErrors: number;
  rules: string[];
}

function baseOptions(records: RegistryRecord[]): ValidateOptions {
  return {
    now: new Date('2026-10-16T12:00:00.000Z'),
    commit: 'mutation',
    completeness: true,
    provenanceIndex: generatedProvenance(),
    featureIndex: generatedFeatures(),
    // every asset a generated layer names exists
    assetIndex: new Set(records.map((r) => r.asset).filter((a): a is string => typeof a === 'string')),
  };
}

/** The seven rooms plus 200 generated records: valid, and complete. */
export function baseRegistry(): RegistryRecord[] {
  return [...rooms(), ...generateRegistry(200, 1)];
}

export function runMutation(mutation: Mutation, flags: { allowNoop?: boolean } = {}): MutationResult {
  const base = baseRegistry();
  const baseReport = validateRegistry(base, baseOptions(base));
  if (baseReport.counts.errors !== 0) {
    const first = baseReport.violations.filter((v) => v.severity === 'error').slice(0, 3).map((v) => `${v.rule} ${v.entity}`).join('; ');
    throw new Error(`base registry has ${baseReport.counts.errors} errors; fix the generator first (${first})`);
  }
  const mutated = mutation.apply(structuredClone(base));
  const options = mutation.options ? mutation.options(baseOptions(base)) : baseOptions(base);
  const mutatedReport = validateRegistry(mutated, options);
  const changedOptions = Boolean(mutation.options);
  if (!flags.allowNoop && !changedOptions && JSON.stringify(mutated) === JSON.stringify(base)) {
    throw new Error(`mutation "${mutation.name}" did not change the registry`);
  }
  const rules = [...new Set(mutatedReport.violations.map((v) => v.rule))];
  const asError = mutatedReport.violations.some((v) => v.rule === mutation.rule && v.severity === 'error');
  if (!flags.allowNoop && !asError) {
    throw new Error(`mutation "${mutation.name}" did not trigger ${mutation.rule} as an error (got: ${rules.join(', ') || 'none'})`);
  }
  return { baseErrors: baseReport.counts.errors, rules };
}

/** The `n`th record (0-based) of a family. */
export function nth(records: RegistryRecord[], family: string, n = 0): RegistryRecord {
  const found = records.filter((r) => r.family === family)[n];
  if (!found) throw new Error(`no ${family} record at position ${n}`);
  return found;
}

/** Change the `n`th record of a family in place (the input is already a clone). */
export function editOf(
  family: string,
  change: (record: RegistryRecord, all: RegistryRecord[]) => void,
  n = 0,
): (records: RegistryRecord[]) => RegistryRecord[] {
  return (records) => {
    change(nth(records, family, n), records);
    return records;
  };
}

export const MISSING_ID = 'tc:tc:place:place-999999';

/** Replace the one logged step in a copy of the provenance index. */
function withStep(change: (step: ProvenanceStep) => void): (base: ValidateOptions) => ValidateOptions {
  return (base) => {
    const index = new Map(base.provenanceIndex);
    const step = structuredClone(index.get(STEP_ID) as ProvenanceStep);
    change(step);
    index.set(STEP_ID, step);
    return { ...base, provenanceIndex: index };
  };
}

/*
 * generateRegistry orders evidence like this: the 1st rests on the logged step, the 2nd is about
 * a single feature, the rest are plain claims about a map. Mutations below pick accordingly.
 */
const PLAIN = 2;

const US1_MUTATIONS: Mutation[] = [
  { name: 'id loses its tc prefix', rule: 'ID-SYNTAX', apply: editOf('place', (r) => { r.id = 'not-an-id'; }) },
  {
    name: 'two records declare one id',
    rule: 'ID-DUPLICATE',
    apply: (rs) => [...rs, { ...nth(rs, 'place'), file: 'content/place/duplicate-copy.yaml' }],
  },
  { name: 'unlisted authority', rule: 'ID-AUTHORITY', apply: editOf('place', (r) => { r.id = r.id.replace('tc:tc:', 'tc:nope:'); }) },
  { name: 'unknown family', rule: 'ID-FAMILY', apply: editOf('place', (r) => { r.family = 'ghost'; }) },
  { name: 'origin removed', rule: 'ID-ORIGIN', apply: editOf('place', (r) => { delete r.origin; }) },
  { name: 'file name differs from local-id', rule: 'LOAD-PATH', apply: editOf('place', (r) => { r.file = 'content/place/renamed-file.yaml'; }) },
  {
    name: 'two places share a live slug',
    rule: 'SLUG-UNIQUE',
    apply: editOf('place', (r, all) => { r.slug = nth(all, 'place', 0).slug; }, 1),
  },
  {
    name: "a former slug equals another record's live slug",
    rule: 'SLUG-HISTORY-COLLISION',
    apply: editOf('place', (r, all) => { r.slug_history = [String(nth(all, 'place', 1).slug)]; }),
  },
];

const US3_MUTATIONS: Mutation[] = [
  { name: 'relations[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('place', (r) => { r.relations = [MISSING_ID]; }) },
  {
    name: 'superseded_by points nowhere',
    rule: 'REF-UNKNOWN',
    apply: editOf('place', (r) => { r.lifecycle = 'superseded'; r.superseded_by = MISSING_ID; }),
  },
  { name: 'essay maps[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.maps = [MISSING_ID]; }) },
  { name: 'essay places[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.places = [MISSING_ID]; }) },
  { name: 'essay sources[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.sources = [MISSING_ID]; }) },
  { name: 'essay evidence[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('essay', (r) => { r.evidence = [MISSING_ID]; }) },
  { name: 'collection members[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('collection', (r) => { r.members = [MISSING_ID]; r.default_layers = []; }) },
  {
    name: 'collection default_layers[] points nowhere',
    rule: 'REF-UNKNOWN',
    apply: editOf('collection', (r) => { r.default_layers = [MISSING_ID]; }),
  },
  { name: 'map makers[] points nowhere', rule: 'REF-UNKNOWN', apply: editOf('map', (r) => { r.makers = [MISSING_ID]; }) },
  { name: 'layer dataset points nowhere', rule: 'REF-UNKNOWN', apply: editOf('layer', (r) => { r.dataset = MISSING_ID; }) },
  { name: 'evidence target.entity points nowhere', rule: 'REF-UNKNOWN', apply: editOf('evidence', (r) => { r.target = { entity: MISSING_ID }; }, PLAIN) },
  { name: 'evidence source points nowhere', rule: 'REF-UNKNOWN', apply: editOf('evidence', (r) => { r.source = MISSING_ID; }, PLAIN) },
  { name: 'attestation place points nowhere', rule: 'REF-UNKNOWN', apply: editOf('attestation', (r) => { r.place = MISSING_ID; }) },
  { name: 'attestation source points nowhere', rule: 'REF-UNKNOWN', apply: editOf('attestation', (r) => { r.source = MISSING_ID; }) },
  { name: 'provenance_chain names an unlogged step', rule: 'REF-UNKNOWN', apply: editOf('evidence', (r) => { r.provenance_chain = ['prov-9999']; }) },
  {
    name: 'an essay cites a place as a map',
    rule: 'REF-FAMILY',
    apply: editOf('essay', (r, all) => { r.maps = [nth(all, 'place').id]; }),
  },
  {
    name: 'a collection lists a place as a layer',
    rule: 'REF-FAMILY',
    apply: editOf('collection', (r, all) => { r.members = [nth(all, 'place').id]; r.default_layers = []; }),
  },
  {
    name: 'a record is superseded by a record of another family',
    rule: 'REF-FAMILY',
    apply: editOf('place', (r, all) => { r.lifecycle = 'superseded'; r.superseded_by = nth(all, 'source').id; }),
  },
  {
    name: 'a default layer is not a member',
    rule: 'REF-COLLECTION-SUBSET',
    apply: editOf('collection', (r, all) => {
      r.members = [];
      r.default_layers = [nth(all, 'layer', 0).id];
    }),
  },
  { name: 'a room is missing', rule: 'ROOM-SET', apply: (rs) => rs.filter((r) => r.id !== 'tc:tc:room:road') },
  {
    name: 'an eighth room appears',
    rule: 'ROOM-SET',
    apply: (rs) => [...rs, { ...nth(rs, 'room'), id: 'tc:tc:room:moon', slug: 'moon', file: 'content/room/moon.yaml' }],
  },
];

const READY = 'ready_for_build';
const VERIFIED_LOCATOR = {
  value: 'p. 1',
  state: 'verified',
  proposed_by: 'person',
  verified_by: 'V. Simion',
  verified_on: '2026-10-01',
  consulted_copy: 'Venice 1548',
};

const US2_MUTATIONS: Mutation[] = [
  {
    name: 'a feature claim loses its geometry provenance',
    rule: 'PROV-GEOMETRY',
    apply: editOf('evidence', (r) => { delete r.geometry_provenance; r.lifecycle = READY; }, 1),
  },
  {
    name: 'a scholarly reconstruction is not flagged',
    rule: 'PROV-RECONSTRUCTION',
    apply: editOf('evidence', (r) => { r.geometry_provenance = 'scholarly_reconstruction'; r.lifecycle = READY; }, 1),
  },
  { name: 'evidence loses its source', rule: 'PROV-SOURCE', apply: editOf('evidence', (r) => { delete r.source; r.lifecycle = READY; }, PLAIN) },
  {
    name: 'evidence uses modern reference geometry',
    rule: 'PROV-MODERN-AS-EVIDENCE',
    apply: editOf('evidence', (r) => { r.geometry_provenance = 'modern_reference'; }, 1),
  },
  {
    name: 'a historical layer uses modern reference geometry',
    rule: 'PROV-MODERN-AS-EVIDENCE',
    apply: editOf('layer', (r) => { r.geometry_provenance = 'modern_reference'; }),
  },
  {
    name: 'a verified locator has no verifier',
    rule: 'LOC-VERIFIED-FIELDS',
    apply: editOf('evidence', (r) => { r.locator = { value: 'p. 1', state: 'verified', proposed_by: 'person' }; }, PLAIN),
  },
  {
    name: 'an AI-proposed locator is verified by an AI',
    rule: 'LOC-AI-VERIFIED',
    apply: editOf('evidence', (r) => { r.locator = { ...VERIFIED_LOCATOR, proposed_by: 'ai', verified_by: 'Claude' }; }, PLAIN),
  },
  { name: 'a secure claim rests on a pending locator', rule: 'LOC-SECURE-PENDING', apply: editOf('evidence', (r) => { r.confidence = 'secure'; }, PLAIN) },
  {
    name: 'evidence cites a finding aid',
    rule: 'REF-FINDING-AID',
    apply: (rs) => {
      const src = nth(rs, 'source');
      src.is_finding_aid = true;
      const ev = nth(rs, 'evidence', PLAIN);
      ev.source = src.id;
      ev.lifecycle = READY;
      return rs;
    },
  },
  { name: 'a silence has no state', rule: 'SIL-STATE', apply: editOf('attestation', (r) => { r.form = 'silence'; }) },
  { name: 'a place carries a silence state', rule: 'SIL-MISPLACED', apply: editOf('place', (r) => { r.silence_state = 'non_survey'; }) },
  {
    name: 'a silence is rated secure without verified coverage',
    rule: 'SIL-SECURE',
    apply: editOf('attestation', (r) => { r.form = 'silence'; r.silence_state = 'non_survey'; r.confidence = 'secure'; }),
  },
  { name: 'evidence loses its rights', rule: 'RIGHTS-MISSING', apply: editOf('evidence', (r) => { delete r.rights; r.lifecycle = READY; }, PLAIN) },
  {
    name: 'images are published without cleared reproduction rights',
    rule: 'RIGHTS-CLEARED',
    apply: editOf('layer', (r) => { r.images = ['images/overview.jpg']; r.lifecycle = 'publishable'; }),
  },
  {
    name: 'a publishable claim rests on an unadjudicated step',
    rule: 'AUTO-UNADJUDICATED',
    apply: editOf('evidence', (r) => { r.lifecycle = 'publishable'; }),
    options: withStep((s) => { s.status = 'proposed'; }),
  },
  {
    name: 'an llm_assisted import is published without adjudication',
    rule: 'AUTO-UNADJUDICATED',
    apply: editOf('place', (r) => { r.origin = 'legacy'; r.legacy_normalization_method = 'llm_assisted'; r.lifecycle = 'publishable'; }),
  },
  {
    name: 'a logged step has no tool',
    rule: 'AUTO-LOG',
    apply: editOf('evidence', (r) => { r.lifecycle = READY; }),
    options: withStep((s) => { delete s.tool; }),
  },
  {
    name: 'a large artefact has no checksum',
    rule: 'AUTO-ARTEFACT-HASH',
    apply: editOf('evidence', (r) => { r.lifecycle = READY; }),
    options: withStep((s) => { s.artefact = { url: 'https://example.org/scan.tif' }; }),
  },
  {
    name: 'a legacy project is imported',
    rule: 'IMPORT-FAMILY',
    apply: editOf('place', (r) => { r.origin = 'legacy'; r.legacy_family = 'project'; }),
  },
  {
    name: 'imported confidence is made secure',
    rule: 'IMPORT-CONFIDENCE',
    apply: editOf('evidence', (r) => { r.legacy_confidence = 'high'; r.confidence = 'secure'; }, PLAIN),
  },
  {
    name: 'an unconfirmed import skips ahead of researching',
    rule: 'IMPORT-REVIEW',
    apply: editOf('place', (r) => { r.origin = 'legacy'; r.lifecycle = 'verified'; }),
  },
  {
    name: 'an import is confirmed with a bare flag',
    rule: 'IMPORT-CONFIRMED',
    apply: editOf('place', (r) => { r.origin = 'legacy'; r.editor_confirmed = true; }),
  },
  {
    name: 'an imported layer ignores the lifecycle mapping',
    rule: 'IMPORT-LAYER-LIFECYCLE',
    apply: editOf('layer', (r) => { r.legacy_layer_status = 'planned'; r.lifecycle = 'qa'; }),
  },
  {
    name: 'legacy reviewer data is carried over unconfirmed',
    rule: 'IMPORT-REVIEWER',
    apply: editOf('place', (r) => { r.legacy_reviewer = 'A. Reviewer'; r.verified_by = 'A. Reviewer'; }),
  },
  { name: 'an unknown confidence', rule: 'ENUM-INVALID', apply: editOf('evidence', (r) => { r.confidence = 'certain'; }, PLAIN) },
  { name: 'valid_from after valid_to', rule: 'DATE-ORDER', apply: editOf('evidence', (r) => { r.valid_from = '0200'; r.valid_to = '0100'; }, PLAIN) },
  { name: 'a date that is not EDTF (an integer year)', rule: 'DATE-INVALID', apply: editOf('evidence', (r) => { r.valid_from = 106; }, PLAIN) },
  {
    name: 'date precision is authored instead of derived',
    rule: 'DATE-PRECISION-AUTHORED',
    apply: editOf('evidence', (r) => { r.valid_from = '1595'; r.date_precision = 'year'; }, PLAIN),
  },
  {
    name: 'an unlisted same_as authority',
    rule: 'SAMEAS-SYNTAX',
    apply: editOf('place', (r) => { r.same_as = [{ authority: 'geonames', id: '1' }]; }),
  },
  {
    name: 'a claim names a feature that is not in the file',
    rule: 'REF-FEATURE',
    apply: editOf('evidence', (r) => { r.target = { entity: (r.target as { entity: string }).entity, feature: 'f-404' }; }, 1),
  },
  { name: 'a map has no makers and its maker status is only not_yet_verified', rule: 'FAM-REQUIRED', apply: editOf('map', (r) => { r.makers = []; r.field_status = { makers: 'not_yet_verified' }; r.lifecycle = READY; }) },
  { name: 'a place loses its place type', rule: 'FAM-REQUIRED', apply: editOf('place', (r) => { delete r.place_type; r.lifecycle = READY; }) },
  { name: 'a place misspells slug_history', rule: 'FAM-UNKNOWN', apply: editOf('place', (r) => { r.slug_histroy = ['former-slug']; }) },
  { name: 'a place names a vocabulary with no mapping file', rule: 'VOCAB-UNKNOWN', apply: editOf('place', (r) => { r.vocabulary = 'cnd'; }) },
  {
    name: 'a mapping lands on a lifecycle term the shared vocabulary lacks',
    rule: 'VOCAB-TARGET',
    apply: (records) => records,
    options: (base) => ({ ...base, vocabularies: new Map([['atlas', { name: 'atlas', file: 'vocab-mappings/atlas.yaml', tables: { lifecycle: { planned: 'nonsense' } } }]]) }),
  },
  {
    name: 'a mapping gives the shared term published another meaning',
    rule: 'VOCAB-SHADOW',
    apply: (records) => records,
    options: (base) => ({ ...base, vocabularies: new Map([['atlas', { name: 'atlas', file: 'vocab-mappings/atlas.yaml', tables: { lifecycle: { published: 'qa' } } }]]) }),
  },
];

/* PRIV-LEAK is a scan of built output, not a registry rule; leak-scan.test.ts covers it. */
const US5_MUTATIONS: Mutation[] = [
  { name: 'an unknown lifecycle value', rule: 'LIFE-VALUE', apply: editOf('place', (r) => { r.lifecycle = 'nonsense'; }) },
  {
    name: 'an essay lifecycle is set by hand',
    rule: 'LIFE-ESSAY-DERIVED',
    apply: editOf('essay', (r) => { r.lifecycle = 'published'; }),
  },
  {
    name: 'a published layer has no asset',
    rule: 'LIFE-AVAILABILITY',
    apply: editOf('layer', (r) => { r.lifecycle = 'published'; r.asset = 'data/missing.pmtiles'; }),
  },
  { name: 'a superseded record has no successor', rule: 'LIFE-SUPERSEDED', apply: editOf('place', (r) => { r.lifecycle = 'superseded'; }) },
  { name: 'an unknown release value', rule: 'REL-VALUE', apply: editOf('place', (r) => { r.release = 'public'; }) },
];

/** Put the first generated essay at `stage`, with a history that reaches it, so a later-stage rule has something to judge. */
function atStage(stage: EssayStage, change: (essay: RegistryRecord, all: RegistryRecord[]) => void = () => {}) {
  return editOf('essay', (essay, all) => {
    essay.stage = stage;
    essay.lifecycle = lifecycleFor(stage, ESSAY_STAGES.indexOf(stage) > ESSAY_STAGES.indexOf('Design QA'));
    essay.stage_history = ESSAY_STAGES.slice(0, ESSAY_STAGES.indexOf(stage) + 1).map((s, i) => ({ stage: s, on: `2026-02-${String(i + 1).padStart(2, '0')}`, by: 'Mutation' }));
    change(essay, all);
  });
}

const body = (...tags: { tag: string; props?: Record<string, string>; dynamic?: string[] }[]) => ({
  exists: true,
  text: '',
  tags: tags.map((t, i) => ({ tag: t.tag, props: t.props ?? {}, dynamic: t.dynamic ?? [], line: i + 1 })),
});

/* Spec 003 US2: the essay stage rules. Each moves an essay to the stage the rule starts at and breaks one thing. */
const ESSAY_MUTATIONS: Mutation[] = [
  { name: 'an essay has no question', rule: 'ESSAY-QUESTION', apply: editOf('essay', (r) => { delete r.question; }) },
  { name: 'an essay has no primary room', rule: 'ESSAY-ROOMS', apply: editOf('essay', (r) => { r.rooms = {}; }) },
  { name: 'an essay history skips a stage', rule: 'ESSAY-HISTORY', apply: atStage('Research', (r) => { r.stage_history = (r.stage_history as unknown[]).slice(1); }) },
  { name: 'an essay picks an accent that is not a slot', rule: 'ESSAY-ACCENT', apply: editOf('essay', (r) => { r.accent = 'chartreuse'; }) },
  { name: 'a corpus map does not resolve', rule: 'ESSAY-CORPUS', apply: atStage('Corpus', (r) => { r.maps = ['tc:tc:map:map-999999']; }) },
  { name: 'a researched essay has no open_questions key', rule: 'ESSAY-RESEARCH', apply: atStage('Research', (r) => { delete r.open_questions; }) },
  { name: 'an outlined essay has no thesis', rule: 'ESSAY-OUTLINE', apply: atStage('Outline', (r) => { delete r.thesis; }) },
  {
    name: 'an interaction is declared without a question',
    rule: 'ESSAY-INTERACTION',
    apply: atStage('Outline', (r) => { r.thesis = 'A thesis.'; r.interactions = [{ id: 'i1', evidence: [], interpretation: 'x' }]; }),
  },
  { name: 'a drafted essay has no body', rule: 'ESSAY-DRAFT', apply: atStage('Draft', (r) => { r.body = { exists: false, tags: [], text: '' }; }) },
  {
    name: 'a body tag prop is computed',
    rule: 'ESSAY-BODY-DYNAMIC',
    apply: atStage('Draft', (r) => { r.body = body({ tag: 'MapFigure', dynamic: ['map'] }); }),
  },
  { name: 'a built essay names a layer that does not exist', rule: 'ESSAY-BUILD', apply: atStage('Build', (r) => { r.layers = ['tc:tc:layer:layer-999999']; }) },
  { name: 'a published essay has no sign-offs', rule: 'ESSAY-SIGNOFF', apply: atStage('Publish', (r) => { delete r.signoffs; }) },
  { name: 'a published essay is still held', rule: 'ESSAY-PUBLISH', apply: atStage('Publish', (r) => { r.release = 'held'; }) },
  {
    name: 'a published essay shows a held map',
    rule: 'ESSAY-BODY-PUBLIC',
    apply: atStage('Publish', (r, all) => { r.body = body({ tag: 'MapFigure', props: { map: nth(all, 'map').id } }); nth(all, 'map').release = 'held'; }),
  },
  { name: 'a legacy essay is cross-linked without confirming the redirect', rule: 'ESSAY-CROSSLINK', apply: atStage('Cross-link', (r) => { r.legacy_url = '/essays/old/'; }) },
];

/** Each story adds its entries here. */
/* Spec 004 Foundation: the map and cartographer rules. A map is taken to the lifecycle where the rule speaks, then broken in one way. */
const atLifecycle = (lifecycle: string, change: (record: RegistryRecord, all: RegistryRecord[]) => void = () => {}) =>
  editOf('map', (r, all) => {
    r.lifecycle = lifecycle;
    change(r, all);
  });
const MAP_MUTATIONS: Mutation[] = [
  { name: 'a publishable map states nothing about a displayed field', rule: 'MAP-FIELD-STATUS', apply: atLifecycle('publishable') },
  { name: 'a held witness has provenance but no basis', rule: 'MAP-BASIS', apply: atLifecycle('publishable', (r) => { r.witness_kind = 'held'; r.provenance = 'Bequest.'; }) },
  { name: 'a map is verified by a word outside the vocabulary', rule: 'MAP-VERIFICATION', apply: editOf('map', (r) => { r.verification = 'glanced_at'; }) },
  { name: 'a map image has a type outside the three', rule: 'MAP-IMAGE', apply: editOf('map', (r) => { r.images = [{ type: 'pdf' }]; }) },
  {
    name: 'a workshop maker with an exact attribution',
    rule: 'MAP-ATTRIBUTION',
    apply: atLifecycle('ready_for_build', (r, all) => { all.find((x) => x.id === (r.makers as string[])[0])!.kind = 'workshop'; }),
  },
  { name: 'a publishable map has no attribution evidence', rule: 'MAP-DEALER-ONLY', apply: atLifecycle('publishable', (r) => { r.attribution_evidence = []; }) },
  { name: 'a released map with a held maker', rule: 'MAP-MAKER-HELD', apply: atLifecycle('publishable', (r) => { r.release = 'released'; }) },
  { name: 'a record carries a price', rule: 'MAP-PRIVATE-FIELD', apply: editOf('map', (r) => { r.price = 1; }) },
  { name: 'a publishable object map has no witness_kind', rule: 'MAP-SCOPE', apply: atLifecycle('publishable', (r) => { delete r.witness_kind; }) },
  { name: 'a cartographer is neither person nor workshop', rule: 'CART-KIND', apply: editOf('cartographer', (r) => { r.lifecycle = 'ready_for_build'; r.kind = 'firm'; }) },
];

/* Spec 005 Foundation: the layer and place rules. A record is taken to the lifecycle where the rule errors, then broken in one way. */
const GEOREFERENCED = { map: 'tc:tc:map:map-000001', annotation: 'data/layers/o.annotation.json', transformation: 'polynomial1', residual_error_m: 10, control_points: 4, confidence: 'probable' };
const ATLAS_MUTATIONS: Mutation[] = [
  { name: 'a publishable layer has no theme', rule: 'LAYER-THEME', apply: editOf('layer', (r) => { r.lifecycle = 'publishable'; r.time_mode = 'envelope_only'; r.envelope = '0106/0271'; }) },
  { name: 'a publishable layer has a reversed envelope', rule: 'LAYER-TIME', apply: editOf('layer', (r) => { r.lifecycle = 'publishable'; r.theme = 'territories-boundaries'; r.time_mode = 'per_feature'; r.envelope = '0271/0106'; }) },
  { name: 'a layer declares one facet twice', rule: 'LAYER-FACET', apply: editOf('layer', (r) => { r.facets = [{ property: 'p', label: 'P', kind: 'category' }, { property: 'p', label: 'Q', kind: 'range' }]; }) },
  {
    name: 'an overlay layer has no georef',
    rule: 'LAYER-GEOREF',
    apply: editOf('layer', (r) => { r.lifecycle = 'ready_for_build'; r.role = 'map-overlay'; }),
  },
  {
    name: 'an overlay georef has two control points',
    rule: 'LAYER-GEOREF',
    apply: editOf('layer', (r, all) => { r.lifecycle = 'ready_for_build'; r.role = 'map-overlay'; r.georef = { ...GEOREFERENCED, control_points: 2, map: nth(all, 'map').id }; }),
  },
  {
    name: 'a layer source is over the host limit',
    rule: 'LAYER-ASSET-SIZE',
    apply: (rs) => rs,
    options: (base) => ({ ...base, assetSizes: new Map([[String(base.assetIndex && [...base.assetIndex][0]), STATIC_ASSET_LIMIT_BYTES + 1]]) }),
  },
  { name: 'a publishable place has no names', rule: 'PLACE-NAMES', apply: editOf('place', (r) => { r.lifecycle = 'publishable'; r.location = { lon: 1, lat: 1 }; }) },
  { name: 'a publishable place has a latitude of 100', rule: 'PLACE-LOCATION', apply: editOf('place', (r) => { r.lifecycle = 'publishable'; r.names = [{ name: 'X', language: 'en', kind: 'modern' }]; r.location = { lon: 1, lat: 100 }; }) },
];

/* Spec 006 Foundation: the source, edition, CSL and listing rules. The generated registry has no entries, so a mutation adds the ones it needs. */
const entryOf = (n: number, over: Partial<RegistryRecord> = {}): RegistryRecord =>
  build('bibliography_entry', n, { csl: `content/bibliography_entry/bibliography_entry-${String(n).padStart(6, '0')}.csl.json`, section: 'specialised_studies', ...over });
const BIBLIOGRAPHY_MUTATIONS: Mutation[] = [
  {
    name: 'a publishable source has no entry',
    rule: 'SRC-ENTRY',
    apply: editOf('source', (r) => { r.lifecycle = 'publishable'; delete r.entry; }),
  },
  {
    name: 'an entry is its own edition',
    rule: 'BIB-EDITION',
    apply: (rs) => { const e = entryOf(1); e.edition_of = e.id; return [...rs, e]; },
  },
  {
    name: 'two entries are editions of each other',
    rule: 'BIB-EDITION',
    apply: (rs) => { const a = entryOf(1); const b = entryOf(2); a.edition_of = b.id; b.translation_of = a.id; return [...rs, a, b]; },
  },
  {
    name: 'an entry names a CSL file that is not there',
    rule: 'BIB-CSL',
    apply: (rs) => [...rs, entryOf(1)],
    options: (base) => ({ ...base, cslFiles: new Map() }),
  },
  {
    name: 'an entry’s CSL item is for another id',
    rule: 'BIB-CSL',
    apply: (rs) => [...rs, entryOf(1)],
    options: (base) => ({ ...base, cslFiles: new Map([['content/bibliography_entry/bibliography_entry-000001.csl.json', JSON.stringify({ id: 'smith1994', type: 'book', title: 'A study' })]]) }),
  },
  {
    name: 'a publishable cartographer lists a held entry',
    rule: 'BIB-LISTED-HELD',
    apply: (rs) => {
      const held = entryOf(1);
      editOf('cartographer', (r) => { r.lifecycle = 'publishable'; r.release = 'released'; r.bibliography = [held.id]; })(rs);
      return [...rs, held];
    },
  },
];

/* Spec 007 Foundation: the seven rooms are public and their own fields are right. */
const ROOM_MUTATIONS: Mutation[] = [
  { name: 'a room is held', rule: 'ROOM-PUBLIC', apply: editOf('room', (r) => { r.release = 'held'; }) },
  { name: 'a room is not published', rule: 'ROOM-PUBLIC', apply: editOf('room', (r) => { r.lifecycle = 'verified'; }) },
  { name: 'a room has another room’s order', rule: 'ROOM-COPY', apply: editOf('room', (r) => { r.order = 7; }) },
  { name: 'a room’s copy_status is neither draft nor final', rule: 'ROOM-COPY', apply: editOf('room', (r) => { r.copy_status = 'done'; }) },
  { name: 'a published room has no short description', rule: 'ROOM-COPY', apply: editOf('room', (r) => { delete r.short_description; }) },
  { name: 'a published room has no body file', rule: 'ROOM-COPY', apply: editOf('room', (r) => { delete r.body; }) },
  { name: 'a room is final with an empty body', rule: 'ROOM-COPY', apply: editOf('room', (r) => { r.copy_status = 'final'; r.body = ' '; }) },
];

/* Spec 008 Foundation: records brought in from the legacy site. The generated registry has no legacy maps, so a mutation adds the one it needs. */
const legacyMapOf = (over: Partial<RegistryRecord> = {}): RegistryRecord =>
  build('map', 90, {
    id: 'tc:tc:map:legacy-plan', origin: 'legacy', slug: 'legacy-plan', file: 'content/map/legacy-plan.yaml', lifecycle: 'researching', release: 'held',
    record_scope: 'object', witness_kind: 'institutional', legacy_record_scope: 'object', legacy_custody: 'institutional', ...over,
  });
const MIGRATION_MUTATIONS: Mutation[] = [
  { name: 'a legacy record has lost its legacy local-id as slug', rule: 'MIG-SLUG', apply: (rs) => [...rs, legacyMapOf({ slug: 'renamed' })] },
  { name: 'a minted map carries a legacy_custody', rule: 'MIG-LEGACY', apply: editOf('map', (r) => { r.legacy_custody = 'held'; }) },
  { name: 'a legacy work is record_scope object', rule: 'MIG-LEGACY', apply: (rs) => [...rs, legacyMapOf({ legacy_record_scope: 'work' })] },
  { name: 'a legacy map has a publication status outside the legacy set', rule: 'MIG-LEGACY', apply: (rs) => [...rs, legacyMapOf({ legacy_publication_status: 'draft' })] },
  { name: 'a legacy map’s image is cleared with no named confirmation', rule: 'MIG-IMAGE-CLEARED', apply: (rs) => [...rs, legacyMapOf({ images: [{ type: 'static', url: 'https://terra-chartarum.pages.dev/a.jpg', static_url: 'https://terra-chartarum.pages.dev/a.jpg', attribution: 'x', licence: 'CC BY 4.0', alt: 'x', witness_kind: 'institutional', reproduction_cleared: true }] })] },
];

export const MUTATIONS: Mutation[] = [...US1_MUTATIONS, ...US3_MUTATIONS, ...US2_MUTATIONS, ...US5_MUTATIONS, ...ESSAY_MUTATIONS, ...MAP_MUTATIONS, ...ATLAS_MUTATIONS, ...BIBLIOGRAPHY_MUTATIONS, ...ROOM_MUTATIONS, ...MIGRATION_MUTATIONS];
