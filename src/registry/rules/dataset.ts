import { defineRule, type Finding } from './framework.js';

/**
 * A pin that names one fixed release of the upstream data (TCX-65): a DOI, a release tag, or the
 * sha256 of the file the dataset was built from. A moving name such as `latest`, or a bare version
 * that does not say which kind of pin it is, does not pin anything.
 */
const PIN = /^(?:doi:10\.\d{4,9}\/\S+|tag:\S+|sha256:[0-9a-f]{64})$/;

function isHttps(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** A dataset built from someone else's data says where it came from and which release (TCX-65). */
export const datasetPin = defineRule({
  id: 'DATASET-PIN',
  from: 'ready_for_build',
  check: ({ records }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'dataset' || record.upstream === undefined) continue;
      const upstream = (record.upstream ?? {}) as { url?: unknown; pin?: unknown };
      if (!isHttps(upstream.url)) {
        findings.push({ record, field: 'upstream.url', value: upstream.url ?? null, expected: 'the https address of the upstream data' });
      }
      if (typeof upstream.pin !== 'string' || !PIN.test(upstream.pin)) {
        findings.push({ record, field: 'upstream.pin', value: upstream.pin ?? null, expected: 'doi:10.…/…, tag:<release> or sha256:<64 hex>' });
      }
    }
    return findings;
  },
});

export const DATASET_RULES = [datasetPin];
