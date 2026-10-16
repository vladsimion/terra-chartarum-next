import { parseDate } from '../dates.js';
import { defineRule, type Finding } from './framework.js';

/** `valid_from` and `valid_to` are EDTF level 0-1 with four-digit signed years (ADR 0007). */
export const dateInvalid = defineRule({
  id: 'DATE-INVALID',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      for (const field of ['valid_from', 'valid_to'] as const) {
        const value = record[field];
        if (value !== undefined && parseDate(value) === null) {
          findings.push({
            record,
            field,
            value,
            expected: 'an EDTF date (levels 0-1, four-digit signed years), e.g. 0106, -0106, 1595-03, 159X, 1595?, 1595/1602',
          });
        }
      }
    }
    return findings;
  },
});

/**
 * The start cannot be definitely later than the end: it fails only when the earliest the start can
 * mean is after the latest the end can mean, so imprecise dates that might overlap pass.
 */
export const dateOrder = defineRule({
  id: 'DATE-ORDER',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      const from = parseDate(record.valid_from);
      const to = parseDate(record.valid_to);
      if (from && to && from.earliest > to.latest) {
        findings.push({
          record,
          field: 'valid_from',
          value: record.valid_from,
          expected: `a start no later than the end (valid_to ${String(record.valid_to)})`,
        });
      }
    }
    return findings;
  },
});

/** Precision is derived from the date and never authored, so it cannot contradict it (ADR 0007). */
export const datePrecisionAuthored = defineRule({
  id: 'DATE-PRECISION-AUTHORED',
  from: 'always',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.date_precision !== undefined) {
        findings.push({
          record,
          field: 'date_precision',
          value: record.date_precision,
          expected: 'no date_precision: it is derived from the EDTF value and never authored',
        });
      }
    }
    return findings;
  },
});

export const DATE_RULES = [dateInvalid, dateOrder, datePrecisionAuthored];
