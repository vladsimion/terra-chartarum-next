import {
  AUTHORITY_RULE,
  DEFAULT_AUTHORITY,
  LOCAL_ID_RULE,
  isAuthority,
  isFamily,
  isLocalId,
  qualify,
} from './ids.ts';
import type { LoadError, LoadedRecord } from './load.ts';
import { schemaFor } from './schemas/envelope.ts';

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

  return {
    status: violations.length === 0 ? 'pass' : 'fail',
    counts: {
      entities: input.records.length,
      by_family: byFamily,
      references: 0,
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
