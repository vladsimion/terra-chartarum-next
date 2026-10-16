import { z } from 'zod';

const Table = z.record(z.string(), z.string());

/**
 * A mapping file under `vocab-mappings/` (TC-D016). Strict, so a misspelt table name is a load
 * error rather than a table that silently maps nothing. Whether a target is a shared term is
 * VOCAB-TARGET's call.
 */
export const VocabMappingSchema = z.strictObject({
  vocabulary: z.string().min(1),
  lifecycle: Table.optional(),
  confidence: Table.optional(),
  evidence_type: Table.optional(),
  geometry_provenance: Table.optional(),
});
