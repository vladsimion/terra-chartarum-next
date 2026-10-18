import { BIBLIOGRAPHY_SECTIONS, BIBLIOGRAPHY_SECTION_LABELS, type BibliographySection } from '../registry/schemas/bibliography-section.js';

/*
 * An essay's bibliography page section (spec 003 FR-005): entries grouped into the seven sections in
 * the constitution's order, an empty section hidden, each entry once, alphabetical by its formatted text.
 */

export interface BibliographyEntryText {
  id: string;
  section: string;
  /** The entry as formatted by `formatBibliographyItem`. */
  text: string;
}

export interface BibliographyGroup {
  section: BibliographySection;
  label: string;
  entries: BibliographyEntryText[];
}

const isSection = (value: string): value is BibliographySection => (BIBLIOGRAPHY_SECTIONS as readonly string[]).includes(value);

export function groupBibliography(entries: readonly BibliographyEntryText[]): BibliographyGroup[] {
  const seen = new Set<string>();
  const bySection = new Map<BibliographySection, BibliographyEntryText[]>();
  for (const entry of entries) {
    if (!isSection(entry.section)) throw new Error(`bibliography entry ${entry.id} has section "${entry.section}", which is not one of the seven`);
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    bySection.set(entry.section, [...(bySection.get(entry.section) ?? []), entry]);
  }
  return BIBLIOGRAPHY_SECTIONS.filter((s) => bySection.has(s)).map((section) => ({
    section,
    label: BIBLIOGRAPHY_SECTION_LABELS[section],
    entries: [...bySection.get(section)!].sort((a, b) => a.text.localeCompare(b.text, 'en')),
  }));
}
