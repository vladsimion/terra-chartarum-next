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
}

/**
 * The integrity gate (spec 001). Pure: same input, same output. Checks the whole
 * registry as one linked graph and returns every violation found, never only the first.
 */
export function validateRegistry(input: RegistryInput): RegistryCheck {
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
  let references = 0;
  for (const { file, record } of input.records) {
    const found = referenceViolations(file, record, known);
    references += found.count;
    violations.push(...found.violations, ...collectionViolations(file, record));
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
      return issue.keys.map((key) => ({
        code: 'SCHEMA_INVALID',
        message: `unknown field "${key}"`,
        field: key,
        ...at,
      }));
    }
    const field = issue.path.map(String).join('.');
    return [{ code: 'SCHEMA_INVALID', message: `${field}: ${issue.message}`, field, ...at }];
  });
}

interface RefSite {
  field: string;
  value: unknown;
  expected: Family;
}

/** Every reference a record makes, with the family it must point to. */
function referenceSites(family: Family, record: Record<string, unknown>): RefSite[] {
  const sites: RefSite[] = [];
  const add = (field: string, value: unknown, expected: Family) => {
    if (Array.isArray(value)) value.forEach((v, i) => sites.push({ field: `${field}.${i}`, value: v, expected }));
    else if (value !== undefined) sites.push({ field, value, expected });
  };

  for (const [field, expected] of Object.entries(REFERENCE_FIELDS[family])) add(field, record[field], expected);
  add('superseded_by', record['superseded_by'], family);
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
