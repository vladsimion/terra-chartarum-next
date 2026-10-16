import {
  AUTHORITY_RULE,
  DEFAULT_AUTHORITY,
  LOCAL_ID_RULE,
  isAuthority,
  isFamily,
  isLocalId,
  parseRef,
  qualify,
} from './ids.ts';
import { isEdtf } from './dates.ts';
import { effectiveLifecycle } from './lifecycle.ts';
import { applyMappings, type VocabMappings } from './mappings.ts';
import type { LoadError, LoadedRecord } from './load.ts';
import { schemaFor } from './schemas/envelope.ts';
import { REFERENCE_FIELDS } from './schemas/families.ts';
import type { Family } from './vocab.ts';

/** Violation codes (data-model.md "Integrity rules"; contracts/integrity-report.schema.json). */
export type ViolationCode =
  | 'FILE_UNREADABLE'
  | 'SCHEMA_INVALID'
  | 'ID_SYNTAX'
  | 'ID_DUPLICATE'
  | 'REF_UNKNOWN'
  | 'REF_FAMILY'
  | 'ENUM_INVALID'
  | 'DATE_INVALID'
  | 'PROVENANCE_MISSING'
  | 'LOCATOR_UNVERIFIED_SECURE'
  | 'LOCATOR_VERIFICATION_INCOMPLETE'
  | 'ESSAY_LIFECYCLE_DECLARED'
  | 'SUPERSEDED_WITHOUT_SUCCESSOR'
  | 'COLLECTION_DEFAULTS'
  | 'ASSET_MISSING'
  | 'EXTRACTION_UNADJUDICATED'
  | 'FINDING_AID_AS_SOURCE';

export interface Violation {
  code: ViolationCode;
  message: string;
  /** Qualified ID, when one can be formed. */
  entity?: string;
  /** Path of the offending field inside the record. */
  field?: string;
  value?: unknown;
  files: string[];
}

export interface RegistryCheck {
  status: 'pass' | 'fail';
  counts: {
    entities: number;
    by_family: Record<string, number>;
    references: number;
    violations: number;
  };
  violations: Violation[];
}

export interface RegistryInput {
  records: LoadedRecord[];
  loadErrors?: LoadError[];
  /** Per-authority specialist vocabulary mappings (data/vocab-mappings). */
  vocabMappings?: VocabMappings;
  /** Asset paths available for publication (relative, `/`-separated). When absent, ASSET_MISSING is not checked. */
  assets?: ReadonlySet<string>;
}

/**
 * The integrity gate (spec 001). Pure: same input, same output. Checks the whole
 * registry as one linked graph and returns every violation found, never only the first.
 */
export function validateRegistry(rawInput: RegistryInput): RegistryCheck {
  const input = {
    ...rawInput,
    records: rawInput.records.map(({ file, record }) => ({ file, record: applyMappings(record, rawInput.vocabMappings) })),
  };
  const violations: Violation[] = [];
  const byFamily: Record<string, number> = {};
  const filesByIdentity = new Map<string, string[]>();

  for (const error of input.loadErrors ?? []) {
    const where = error.line === undefined ? '' : ` (line ${error.line})`;
    violations.push({ code: 'FILE_UNREADABLE', message: `${error.message}${where}`, files: [error.file] });
  }

  for (const { file, record } of input.records) {
    const authority = typeof record['authority'] === 'string' ? record['authority'] : DEFAULT_AUTHORITY;
    const family = record['family'];
    const id = record['id'];
    const entity = typeof family === 'string' && typeof id === 'string' ? qualify(authority, family, id) : undefined;
    const at = entity === undefined ? { files: [file] } : { entity, files: [file] };

    violations.push(...schemaViolations(record, at));

    if (entity !== undefined) {
      filesByIdentity.set(entity, [...(filesByIdentity.get(entity) ?? []), file]);
    }

    if (typeof id === 'string' && !isLocalId(id)) {
      violations.push({
        code: 'ID_SYNTAX',
        message: `local id "${id}" does not match ${LOCAL_ID_RULE}`,
        field: 'id',
        value: id,
        ...at,
      });
    }

    if (typeof record['authority'] === 'string' && !isAuthority(authority)) {
      violations.push({
        code: 'ID_SYNTAX',
        message: `authority "${authority}" does not match ${AUTHORITY_RULE}`,
        field: 'authority',
        value: authority,
        ...at,
      });
    }

    if (typeof family === 'string') {
      if (isFamily(family)) {
        byFamily[family] = (byFamily[family] ?? 0) + 1;
      } else {
        violations.push({
          code: 'ID_SYNTAX',
          message: `"${family}" is not a registry family`,
          field: 'family',
          value: family,
          ...at,
        });
      }
    }
  }

  for (const [entity, files] of filesByIdentity) {
    if (files.length > 1) {
      violations.push({
        code: 'ID_DUPLICATE',
        message: `${entity} is declared in ${files.length} files`,
        entity,
        files: [...files].sort(),
      });
    }
  }

  const known = new Set(filesByIdentity.keys());
  const byIdentity = new Map<string, Record<string, unknown>>();
  for (const { file, record } of input.records) {
    const { entity } = entityOf(file, record);
    if (entity !== undefined) byIdentity.set(entity, record);
  }

  let references = 0;
  for (const { file, record } of input.records) {
    const found = referenceViolations(file, record, known);
    references += found.count;
    violations.push(
      ...found.violations,
      ...collectionViolations(file, record),
      ...evidenceViolations(file, record, byIdentity),
      ...provenanceViolations(file, record),
      ...dateViolations(file, record),
      ...lifecycleViolations(file, record),
      ...assetViolations(file, record, input.assets),
    );
  }

  return {
    status: violations.length === 0 ? 'pass' : 'fail',
    counts: {
      entities: input.records.length,
      by_family: byFamily,
      references,
      violations: violations.length,
    },
    violations,
  };
}

/** Turn schema failures into SCHEMA_INVALID violations, one per offending field. */
function schemaViolations(record: Record<string, unknown>, at: { entity?: string; files: string[] }): Violation[] {
  const parsed = schemaFor(record['family']).safeParse(record);
  if (parsed.success) return [];

  return parsed.error.issues.flatMap((issue): Violation[] => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => {
        const field = [...issue.path.map(String), key].join('.');
        return { code: 'SCHEMA_INVALID', message: `unknown field "${field}"`, field, ...at };
      });
    }
    const field = issue.path.map(String).join('.');
    if (issue.code === 'invalid_value') {
      const value = valueAt(record, issue.path);
      return [{ code: 'ENUM_INVALID', message: `${field}: "${String(value)}" is not in the shared vocabulary`, field, value, ...at }];
    }
    return [{ code: 'SCHEMA_INVALID', message: `${field}: ${issue.message}`, field, ...at }];
  });
}

export interface RefSite {
  field: string;
  value: unknown;
  expected: Family;
}

/** Every reference a record makes, with the family it must point to. */
export function referenceSites(family: Family, record: Record<string, unknown>): RefSite[] {
  const sites: RefSite[] = [];
  const add = (field: string, value: unknown, expected: Family) => {
    if (Array.isArray(value)) value.forEach((v, i) => sites.push({ field: `${field}.${i}`, value: v, expected }));
    else if (value !== undefined) sites.push({ field, value, expected });
  };

  for (const [field, expected] of Object.entries(REFERENCE_FIELDS[family])) add(field, record[field], expected);
  add('superseded_by', record['superseded_by'], family);
  const evidence = record['evidence'];
  if (Array.isArray(evidence)) {
    evidence.forEach((entry, i) => {
      if (entry !== null && typeof entry === 'object') add(`evidence.${i}.source`, (entry as Record<string, unknown>)['source'], 'source');
    });
  }
  const rooms = record['rooms'];
  if (rooms !== null && typeof rooms === 'object') {
    add('rooms.primary', (rooms as Record<string, unknown>)['primary'], 'room');
    add('rooms.secondary', (rooms as Record<string, unknown>)['secondary'], 'room');
  }
  return sites;
}

/** REF_FAMILY and REF_UNKNOWN. Malformed references are left to SCHEMA_INVALID. */
function referenceViolations(
  file: string,
  record: Record<string, unknown>,
  known: ReadonlySet<string>,
): { count: number; violations: Violation[] } {
  const family = record['family'];
  if (typeof family !== 'string' || !isFamily(family)) return { count: 0, violations: [] };
  const at = entityOf(file, record);

  const violations: Violation[] = [];
  let count = 0;
  for (const site of referenceSites(family, record)) {
    if (typeof site.value !== 'string') continue;
    const ref = parseRef(site.value);
    if (ref === undefined) continue;
    count += 1;

    if (ref.family !== site.expected) {
      violations.push({
        code: 'REF_FAMILY',
        message: `${site.field} must point to a ${site.expected}, not a ${ref.family}`,
        field: site.field,
        value: site.value,
        ...at,
      });
    } else if (!known.has(qualify(ref.authority, ref.family, ref.id))) {
      violations.push({
        code: 'REF_UNKNOWN',
        message: `${site.field} points to ${site.value}, which is not in the registry`,
        field: site.field,
        value: site.value,
        ...at,
      });
    }
  }
  return { count, violations };
}

/** A collection's defaults must be members, and no member may be listed twice. */
function collectionViolations(file: string, record: Record<string, unknown>): Violation[] {
  if (record['family'] !== 'collection') return [];
  const members = record['layer_ids'];
  const defaults = record['default_layer_ids'];
  if (!Array.isArray(members) || !Array.isArray(defaults)) return [];
  const at = entityOf(file, record);
  const violations: Violation[] = [];

  const seen = new Set<string>();
  members.forEach((value, i) => {
    const key = normalisedRef(value);
    if (key === undefined) return;
    if (seen.has(key)) {
      violations.push({ code: 'COLLECTION_DEFAULTS', message: `${String(value)} is listed twice`, field: `layer_ids.${i}`, value, ...at });
    }
    seen.add(key);
  });

  defaults.forEach((value, i) => {
    const key = normalisedRef(value);
    if (key !== undefined && !seen.has(key)) {
      violations.push({
        code: 'COLLECTION_DEFAULTS',
        message: `default ${String(value)} is not a member of layer_ids`,
        field: `default_layer_ids.${i}`,
        value,
        ...at,
      });
    }
  });
  return violations;
}

function normalisedRef(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const ref = parseRef(value);
  return ref === undefined ? undefined : qualify(ref.authority, ref.family, ref.id);
}

function entityOf(file: string, record: Record<string, unknown>): { entity?: string; files: string[] } {
  const authority = typeof record['authority'] === 'string' ? record['authority'] : DEFAULT_AUTHORITY;
  const family = record['family'];
  const id = record['id'];
  return typeof family === 'string' && typeof id === 'string'
    ? { entity: qualify(authority, family, id), files: [file] }
    : { files: [file] };
}

function valueAt(record: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

/** Lifecycle states from which a record may be built or published (ADR 0003). */
const PAST_VERIFIED = new Set(['ready_for_build', 'in_build', 'qa', 'publishable', 'published']);
const PUBLISHABLE = new Set(['publishable', 'published']);

function entries(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((v) => (v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {})) : [];
}

/** Locator verification, secure claims and finding aids (spec 001 US2; ADR 0003; TC-D018). */
function evidenceViolations(
  file: string,
  record: Record<string, unknown>,
  byIdentity: ReadonlyMap<string, Record<string, unknown>>,
): Violation[] {
  const at = entityOf(file, record);
  const violations: Violation[] = [];

  entries(record['evidence']).forEach((evidence, i) => {
    const field = `evidence.${i}`;
    if (evidence['locator_state'] === 'verified') {
      const missing = ['verified_by', 'verified_on', 'consulted_copy'].filter((k) => evidence[k] === undefined);
      if (missing.length > 0) {
        violations.push({
          code: 'LOCATOR_VERIFICATION_INCOMPLETE',
          message: `a verified locator must record ${missing.join(', ')}`,
          field,
          ...at,
        });
      }
    }

    if (evidence['confidence'] === 'secure' && evidence['locator_state'] !== 'verified') {
      violations.push({
        code: 'LOCATOR_UNVERIFIED_SECURE',
        message: 'a secure claim must rest on a verified locator',
        field,
        ...at,
      });
    }

    const source = typeof evidence['source'] === 'string' ? parseRef(evidence['source']) : undefined;
    const target = source === undefined ? undefined : byIdentity.get(qualify(source.authority, source.family, source.id));
    if (target?.['family'] === 'source' && target['kind'] === 'finding_aid') {
      violations.push({
        code: 'FINDING_AID_AS_SOURCE',
        message: `${String(evidence['source'])} is a finding aid, not evidence`,
        field: `${field}.source`,
        value: evidence['source'],
        ...at,
      });
    }
  });
  return violations;
}

/** Rights on publishable records and adjudication of automated extraction (FR-005, FR-008). */
function provenanceViolations(file: string, record: Record<string, unknown>): Violation[] {
  const lifecycle = effectiveLifecycle(record);
  if (lifecycle === undefined) return [];
  const at = entityOf(file, record);
  const violations: Violation[] = [];

  if (PUBLISHABLE.has(lifecycle)) {
    const rights = record['rights'];
    if (rights === undefined || rights === null || typeof rights !== 'object') {
      violations.push({ code: 'PROVENANCE_MISSING', message: `a ${lifecycle} record must declare its rights`, field: 'rights', ...at });
    } else if ((rights as Record<string, unknown>)['licence'] === undefined) {
      violations.push({ code: 'PROVENANCE_MISSING', message: `a ${lifecycle} record must declare a licence`, field: 'rights.licence', ...at });
    }
  }

  const extraction = record['extraction'];
  if (PAST_VERIFIED.has(lifecycle) && extraction !== null && typeof extraction === 'object') {
    const e = extraction as Record<string, unknown>;
    if (e['method'] !== 'manual' && (e['adjudicated_by'] === undefined || e['adjudicated_on'] === undefined)) {
      violations.push({
        code: 'EXTRACTION_UNADJUDICATED',
        message: `${String(e['method'])} extraction must be adjudicated by a person before the record is ${lifecycle}`,
        field: 'extraction',
        ...at,
      });
    }
  }
  return violations;
}

/** Every historical date must be EDTF level 0–1 (ADR 0006). */
function dateViolations(file: string, record: Record<string, unknown>): Violation[] {
  const at = entityOf(file, record);
  const sites: { field: string; value: unknown }[] = [];
  const collect = (prefix: string, holder: Record<string, unknown>) => {
    for (const key of ['valid_from', 'valid_to']) {
      if (holder[key] !== undefined) sites.push({ field: `${prefix}${key}`, value: holder[key] });
    }
  };

  collect('', record);
  entries(record['evidence']).forEach((e, i) => collect(`evidence.${i}.`, e));
  entries(record['names']).forEach((n, i) => collect(`names.${i}.`, n));

  return sites
    .filter((site) => typeof site.value !== 'string' || !isEdtf(site.value))
    .map((site) => ({
      code: 'DATE_INVALID',
      message: `${site.field}: "${String(site.value)}" is not an EDTF level 0–1 date (e.g. 0106, -0106, 159X, 1595?, 1595/1602)`,
      field: site.field,
      value: site.value,
      ...at,
    }));
}

/** Essays may not declare a lifecycle; superseded records must name a successor (ADR 0003). */
function lifecycleViolations(file: string, record: Record<string, unknown>): Violation[] {
  const at = entityOf(file, record);
  const violations: Violation[] = [];
  if (record['family'] === 'essay' && record['lifecycle'] !== undefined) {
    violations.push({
      code: 'ESSAY_LIFECYCLE_DECLARED',
      message: 'an essay\'s lifecycle is derived from its stage and may not be declared',
      field: 'lifecycle',
      value: record['lifecycle'],
      ...at,
    });
  }
  if (effectiveLifecycle(record) === 'superseded' && record['superseded_by'] === undefined) {
    violations.push({
      code: 'SUPERSEDED_WITHOUT_SUCCESSOR',
      message: 'a superseded record must name its successor in superseded_by',
      field: 'superseded_by',
      ...at,
    });
  }
  return violations;
}

/** A published layer must have its asset available (layer availability is derived, never stored; ADR 0003). */
function assetViolations(file: string, record: Record<string, unknown>, assets: ReadonlySet<string> | undefined): Violation[] {
  if (assets === undefined || record['family'] !== 'layer' || effectiveLifecycle(record) !== 'published') return [];
  const asset = record['asset'];
  if (typeof asset === 'string' && assets.has(asset)) return [];
  return [
    {
      code: 'ASSET_MISSING',
      message:
        typeof asset === 'string'
          ? `published layer asset "${asset}" is not available`
          : 'a published layer must name its asset',
      field: 'asset',
      ...(typeof asset === 'string' ? { value: asset } : {}),
      ...entityOf(file, record),
    },
  ];
}
