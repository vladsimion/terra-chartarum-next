/**
 * A registry record as the validator sees it. Enumerated fields are plain strings on purpose:
 * `loadRegistry` checks structure only and the rules check membership, so records built in
 * memory and records loaded from disk go through the same checks (contracts/module-api.md).
 */
export interface RegistryRecord {
  /** Boundary form `tc:{authority}:{family}:{local-id}`. */
  id: string;
  family: string;
  origin?: string;
  title?: string;
  slug?: string;
  slug_history?: string[];
  lifecycle?: string;
  release?: string;
  same_as?: { authority: string; id: string }[];
  relations?: string[];
  superseded_by?: string;
  /** Path of the file the record came from, used in violations. */
  file: string;
  [field: string]: unknown;
}
