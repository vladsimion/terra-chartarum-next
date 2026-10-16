import { AUTHORITIES, FAMILIES, isFamily } from '../families.js';
import { BOUNDARY_FORM, isCounterLocalId, parseStableId } from '../ids.js';
import { ORIGIN_VALUES } from '../schemas/shared.js';
import type { RegistryRecord } from '../types.js';
import { defineRule, type Finding } from './framework.js';

export const idSyntax = defineRule({
  id: 'ID-SYNTAX',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const parsed = parseStableId(String(record.id));
      if (!parsed) {
        findings.push({
          record,
          field: 'id',
          value: record.id,
          expected: `${BOUNDARY_FORM} (authority [a-z0-9][a-z0-9-]*, family [a-z][a-z0-9_-]*, local-id [A-Za-z0-9][A-Za-z0-9._:-]*)`,
        });
      } else if (record.origin === 'minted' && !isCounterLocalId(parsed.family, parsed.localId)) {
        findings.push({
          record,
          field: 'id',
          value: record.id,
          expected: `a minted local-id in counter form ${parsed.family}-NNNNNN`,
        });
      }
    }
    return findings;
  },
});

export const idAuthority = defineRule({
  id: 'ID-AUTHORITY',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const parsed = parseStableId(String(record.id));
      if (parsed && !(AUTHORITIES as readonly string[]).includes(parsed.authority)) {
        findings.push({
          record,
          field: 'id',
          value: parsed.authority,
          expected: `an allowlisted authority: ${AUTHORITIES.join(', ')}`,
        });
      }
    }
    return findings;
  },
});

export const idFamily = defineRule({
  id: 'ID-FAMILY',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const parsed = parseStableId(String(record.id));
      if (!parsed) continue;
      if (!isFamily(parsed.family)) {
        findings.push({
          record,
          field: 'id',
          value: parsed.family,
          expected: `a family from the closed list: ${FAMILIES.join(', ')}`,
        });
      } else if (record.family !== parsed.family) {
        findings.push({
          record,
          field: 'family',
          value: record.family,
          expected: `the family in the id (${parsed.family})`,
        });
      }
    }
    return findings;
  },
});

export const idOrigin = defineRule({
  id: 'ID-ORIGIN',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (!(ORIGIN_VALUES as readonly string[]).includes(String(record.origin))) {
        findings.push({
          record,
          field: 'origin',
          value: record.origin ?? null,
          expected: `one of ${ORIGIN_VALUES.join(' | ')}`,
        });
      }
    }
    return findings;
  },
});

export const idDuplicate = defineRule({
  id: 'ID-DUPLICATE',
  from: 'always',
  check: ({ records }) => {
    const byId = new Map<string, RegistryRecord[]>();
    for (const record of records) {
      const group = byId.get(record.id);
      if (group) group.push(record);
      else byId.set(record.id, [record]);
    }
    const findings: Finding[] = [];
    for (const [id, group] of byId) {
      if (group.length < 2) continue;
      const files = group.map((r) => r.file).join(', ');
      for (const record of group) {
        findings.push({
          record,
          field: 'id',
          value: id,
          expected: `an id declared once; also declared in: ${files}`,
        });
      }
    }
    return findings;
  },
});

export const ID_RULES = [idSyntax, idAuthority, idFamily, idOrigin, idDuplicate];
