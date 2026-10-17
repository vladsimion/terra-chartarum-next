/**
 * The seven bibliography sections, in the order they appear on a page (spec 003 FR-005,
 * Constitution VI). A section with no entries is hidden. Shared with spec 006's Bibliography pages.
 */
export const BIBLIOGRAPHY_SECTIONS = [
  'primary_sources',
  'historical_maps',
  'reference_works',
  'specialised_studies',
  'digital_resources',
  'datasets_licences',
  'further_reading',
] as const;

export type BibliographySection = (typeof BIBLIOGRAPHY_SECTIONS)[number];

/** The reader-facing heading of each section. */
export const BIBLIOGRAPHY_SECTION_LABELS: Readonly<Record<BibliographySection, string>> = {
  primary_sources: 'Primary sources',
  historical_maps: 'Historical maps',
  reference_works: 'Reference works',
  specialised_studies: 'Specialised studies',
  digital_resources: 'Digital resources',
  datasets_licences: 'Datasets and licences',
  further_reading: 'Further reading',
};
