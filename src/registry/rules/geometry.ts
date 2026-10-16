import { defineRule, type Finding } from './framework.js';

/**
 * Evidence about a single feature must point at a feature that exists in the geometry file of its
 * target (FR-003). Without a feature index the file contents cannot be judged, so only the missing
 * geometry path is reported.
 */
export const refFeature = defineRule({
  id: 'REF-FEATURE',
  from: 'always',
  check: ({ records, index, options }) => {
    const findings: Finding[] = [];
    for (const record of records) {
      if (record.family !== 'evidence') continue;
      const target = record.target as { entity?: unknown; feature?: unknown } | undefined;
      if (!target || typeof target.feature !== 'string' || typeof target.entity !== 'string') continue;
      const entity = index.get(target.entity);
      if (!entity) continue; // a dangling target is REF-UNKNOWN's to report

      const geometry = entity.geometry;
      if (typeof geometry !== 'string') {
        findings.push({
          record,
          field: 'target.feature',
          value: target.feature,
          expected: `a target with a geometry file; ${target.entity} has none`,
        });
        continue;
      }
      if (!options.featureIndex) continue;
      const features = options.featureIndex.get(geometry);
      if (!features) {
        findings.push({
          record,
          field: 'target.feature',
          value: target.feature,
          expected: `a readable geometry file at ${geometry}`,
        });
      } else if (!features.has(target.feature)) {
        findings.push({
          record,
          field: 'target.feature',
          value: target.feature,
          expected: `a feature id present in ${geometry}`,
        });
      }
    }
    return findings;
  },
});
