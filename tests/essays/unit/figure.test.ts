import { describe, expect, it } from 'vitest';
import { figureFor, literalCopies, type FigureMap } from '../../../src/essays/figure.js';

/*
 * Spec 003 T029 (FR-004, SC-003, AC 1.1): a figure's caption, attribution and rights come from the
 * map's public record and never from the essay's text; a body that copies a referenced record's
 * title or caption literally is reported.
 */
const MAP: FigureMap = {
  id: 'tc:tc:map:map-000001',
  title: 'Tabula Daciae',
  slug: 'tabula-daciae',
  date_published: '1528',
  makers: ['Wolfgang Lazius'],
  images: [{ attribution: 'Biblioteca Apostolica Vaticana' }],
  rights: { licence: 'CC BY 4.0', attribution: 'Image: BAV' },
};

describe('figureFor', () => {
  it('builds the caption from the record: title, makers, date', () => {
    expect(figureFor(MAP).caption).toBe('Tabula Daciae, Wolfgang Lazius, 1528');
  });

  it('leaves out what the record does not have', () => {
    expect(figureFor({ ...MAP, makers: [], date_published: undefined }).caption).toBe('Tabula Daciae');
    expect(figureFor({ ...MAP, makers: ['A', 'B'] }).caption).toBe('Tabula Daciae, A and B, 1528');
  });

  it('takes the attribution from the image holder, falling back to the rights attribution', () => {
    expect(figureFor(MAP).attribution).toBe('Biblioteca Apostolica Vaticana');
    expect(figureFor({ ...MAP, images: [] }).attribution).toBe('Image: BAV');
    expect(figureFor({ ...MAP, images: [], rights: { licence: 'CC BY 4.0' } }).attribution).toBeNull();
  });

  it('gives the licence as the rights line', () => {
    expect(figureFor(MAP).rights).toBe('CC BY 4.0');
    expect(figureFor({ ...MAP, rights: undefined }).rights).toBeNull();
  });

  it('links to the map’s catalogue record', () => {
    expect(figureFor(MAP).href).toBe('/collection/tabula-daciae/');
  });

  it('carries the title for the figure’s accessible name', () => {
    expect(figureFor(MAP).title).toBe('Tabula Daciae');
  });
});

describe('literalCopies', () => {
  const records = [{ id: MAP.id, title: MAP.title, caption: figureFor(MAP).caption }];

  it('reports a body that types the map’s title instead of taking it from the record', () => {
    const found = literalCopies('The Tabula Daciae shows the line.', records);
    expect(found).toEqual([{ id: MAP.id, copied: 'Tabula Daciae' }]);
  });

  it('reports a copy of the generated caption', () => {
    const found = literalCopies('See Tabula Daciae, Wolfgang Lazius, 1528 for this.', records);
    expect(found.map((f) => f.copied)).toContain('Tabula Daciae, Wolfgang Lazius, 1528');
  });

  it('ignores case and spacing', () => {
    expect(literalCopies('the  TABULA   daciae shows', records)).toHaveLength(1);
  });

  it('is silent when the body says something else', () => {
    expect(literalCopies('The frontier is drawn by omission.', records)).toEqual([]);
  });

  it('ignores titles too short to tell from ordinary text', () => {
    expect(literalCopies('A map of the area.', [{ id: 'x', title: 'Map', caption: 'Map' }])).toEqual([]);
  });

  it('reports each record once', () => {
    expect(literalCopies('Tabula Daciae and again Tabula Daciae.', records)).toHaveLength(1);
  });
});
