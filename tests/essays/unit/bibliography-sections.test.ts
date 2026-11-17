import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { groupBibliography } from '../../../src/essays/bibliography.js';
import { loadRegistry } from '../../../src/registry/load.js';
import { BIBLIOGRAPHY_SECTIONS } from '../../../src/registry/schemas/bibliography-section.js';
import { stageAtLeast } from '../../../src/registry/stages.js';

/*
 * Spec 009 T034 (US3, data-model.md "Bibliography entries"): the twelve entries behind the stones'
 * sources. Each needs a CSL file to be citable and a `section` to be public, chosen from the seven
 * the shell prints in order. The author chooses the section; this test says what a choice has to be,
 * and holds the twelve to it from Build on, which is where the gate first requires them to be public.
 */
const SOURCES = [
  'src-ptolemy-geographia',
  'src-tabula-peutingeriana',
  'src-hereford-mappa',
  'src-vesconte-portolan',
  'src-honterus-chorographia',
  'src-ortelius-parergon',
  'src-cantacuzino-wallachia',
  'src-cantemir-moldavia',
  'src-iosephina-survey',
  'src-russian-staff-1835',
  'src-szathmari-charta',
  'src-secret-century',
];

const registry = await loadRegistry('.');
const byId = new Map(registry.records.map((r) => [r.id, r]));
const essay = registry.records.find((r) => r.family === 'essay' && r.slug === 'dacia-lapidarium');
const entryOf = (slug: string) => {
  const source = byId.get(`tc:tc:source:${slug}`);
  const id = typeof source?.entry === 'string' ? source.entry : '';
  return byId.get(id);
};

describe('the seven sections', () => {
  it('are the seven the spec names, in the order the page prints them', () => {
    expect([...BIBLIOGRAPHY_SECTIONS]).toEqual([
      'primary_sources',
      'historical_maps',
      'reference_works',
      'specialised_studies',
      'digital_resources',
      'datasets_licences',
      'further_reading',
    ]);
  });

  it('are the only sections the essay’s bibliography builder accepts', () => {
    const entry = (section: string) => ({ id: 'tc:tc:bibliography_entry:bibliography_entry-000035', section, text: 'An entry.' });
    expect(() => groupBibliography([entry('historical_maps')])).not.toThrow();
    expect(() => groupBibliography([entry('maps')])).toThrow(/not one of the seven/);
    expect(() => groupBibliography([entry('')])).toThrow(/not one of the seven/);
  });
});

describe.each(SOURCES)('the bibliography entry behind %s', (slug) => {
  const entry = entryOf(slug);

  it('exists, so the source can be cited at all', () => {
    expect(entry?.family, `${slug} names no bibliography entry that resolves`).toBe('bibliography_entry');
  });

  it('names a CSL file that is there, which is what a note and an export are built from', () => {
    const csl = typeof entry?.csl === 'string' ? entry.csl : '';
    expect(csl, `${entry?.id ?? slug} has no csl path`).not.toBe('');
    expect(existsSync(csl), `${csl} does not exist`).toBe(true);
    expect(() => JSON.parse(readFileSync(csl, 'utf8'))).not.toThrow();
  });

  it('has a section from the seven, or none yet while the author is still choosing', () => {
    const section = entry?.section;
    if (section !== undefined) expect(BIBLIOGRAPHY_SECTIONS).toContain(section);
  });

  it('has its section by the time the essay reaches Build, because an entry without one is not public', () => {
    if (!stageAtLeast(essay?.stage, 'Build')) return;
    expect(BIBLIOGRAPHY_SECTIONS, `${entry?.id ?? slug} has no section`).toContain(entry?.section);
  });
});
