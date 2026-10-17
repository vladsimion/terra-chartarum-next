/** The parts of a registry `rights` object a reader-facing line needs. */
export interface RightsInput {
  licence?: string;
  attribution?: string;
  /** Separate facts (Constitution VI): carried on a registry rights object, never part of the line. */
  reproduction_cleared?: boolean;
  text_public_domain?: boolean;
}

/**
 * The licence line shown with an image, dataset or layer (spec 002 FR-017, ADR 0009), generated
 * from the registry `rights` and never typed. A record with no licence gets no line rather than a
 * guessed one; whether reproduction is cleared is a separate fact and does not change the text.
 */
export function rightsLine(rights: RightsInput | undefined): string | null {
  const licence = rights?.licence?.trim();
  if (!licence) return null;
  const attribution = rights?.attribution?.trim();
  return attribution ? `Licence: ${licence} · ${attribution}` : `Licence: ${licence}`;
}
