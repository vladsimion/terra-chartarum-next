import { applyFilters, parseQuery, serialise, type Filters } from './filter.js';
import type { IndexEntry } from './index-data.js';

/*
 * The collection list's filters in the browser (spec 004 US2). The page ships complete, so a reader
 * without scripts sees every map; with scripts this reads the filter index, hides and reorders the
 * items to match the form, and writes the view to the address so it can be shared. The same pure
 * `filter.ts` the build tests run does the choosing.
 */
const form = document.querySelector<HTMLFormElement>('form.filters');
const list = document.querySelector<HTMLOListElement>('ol.map-list');
const status = document.querySelector<HTMLElement>('[data-result-count]');

if (form && list && status) void start(form, list, status);

async function start(form: HTMLFormElement, list: HTMLOListElement, status: HTMLElement): Promise<void> {
  let entries: IndexEntry[];
  try {
    const response = await fetch('/data/collection-index.json');
    if (!response.ok) return;
    entries = (await response.json()) as IndexEntry[];
  } catch {
    return; // the list stays complete
  }
  const items = new Map([...list.children].map((li) => [(li as HTMLElement).dataset.id!, li as HTMLElement]));

  const read = (): Filters => {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data) if (typeof value === 'string') params.append(key, value);
    return parseQuery(params);
  };

  const write = (filters: Filters): void => {
    for (const box of form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) box.checked = (filters[box.name as 'cartographer' | 'region' | 'room'] ?? []).includes(box.value);
    form.querySelector<HTMLInputElement>('input[name="from"]')!.value = filters.from === null ? '' : String(filters.from);
    form.querySelector<HTMLInputElement>('input[name="to"]')!.value = filters.to === null ? '' : String(filters.to);
    form.querySelector<HTMLSelectElement>('select[name="witness"]')!.value = filters.witness ?? '';
    form.querySelector<HTMLSelectElement>('select[name="sort"]')!.value = filters.sort;
  };

  const show = (filters: Filters): void => {
    const chosen = applyFilters(entries, filters);
    const wanted = new Set(chosen.map((e) => e.id));
    for (const [id, li] of items) li.hidden = !wanted.has(id);
    for (const entry of chosen) list.append(items.get(entry.id)!);
    status.textContent = `${chosen.length} of ${entries.length} maps`;
  };

  const apply = (): void => {
    const filters = read();
    show(filters);
    const query = serialise(filters);
    history.replaceState(null, '', query === '' ? location.pathname : `${location.pathname}?${query}`);
  };

  form.addEventListener('input', apply);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    apply();
  });
  const opened = parseQuery(location.search);
  write(opened);
  show(opened);
}
