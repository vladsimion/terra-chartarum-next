import { Collector, ImportError, idOf, number, text, type Row } from '../context.js';
import { EssayLinks } from '../essay-links.js';
import { yearToEdtf } from '../year-to-edtf.js';
import { base, defined } from './common.js';

const MAPPED = new Set(['id', 'name', 'sortName', 'born', 'died', 'bio', 'room', 'secondaryRooms', 'essaySlugs', 'roomAnchor']);

/** Cartographers (`cartographers.ts`): a person with names, life dates and a biography file; their essay and room links are seeds, not fields. */
export function importCartographers(rows: Row[], out: Collector, links: EssayLinks): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const local = text(row, 'id');
    const name = text(row, 'name');
    if (!local || !name) throw new ImportError(`a cartographer has no id or name: ${JSON.stringify(Object.keys(row))}`);
    const id = idOf('cartographer', local);
    const born = number(row, 'born');
    const died = number(row, 'died');
    const sortName = text(row, 'sortName');
    out.record(
      defined({
        ...base('cartographer', id, local, name),
        kind: 'person',
        names: sortName && sortName !== name ? [sortName] : undefined,
        life_dates: born !== undefined && died !== undefined ? `${yearToEdtf(born).value}/${yearToEdtf(died).value}` : undefined,
      }),
      text(row, 'bio') ? { extension: '.md', text: `${text(row, 'bio')}\n` } : undefined,
    );
    ids.add(local);
    links.add(row, 'cartographers', id);
    out.rest('cartographers', row, MAPPED);
  }
  return ids;
}
