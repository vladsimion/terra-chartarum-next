import { applyFilters, parseQuery, serialise, type Filters, type IndexEntry } from '../bibliography/filter.js';

/*
 * The bibliography's filters in the browser (spec 006 US1). The page ships complete, so a reader
 * without scripts sees every entry; with scripts this reads the search index, hides the entries that
 * do not match the form, hides a section with none left, and writes the view to the address so it
 * can be shared. The same pure `applyFilters` the build tests run does the choosing.
 */
const form = document.querySelector<HTMLFormElement>('form.filters');
const status = document.querySelector<HTMLElement>('[data-result-count]');

if (form && status) void start(form, status);

async function start(form: HTMLFormElement, status: HTMLElement): Promise<void> {
  let entries: IndexEntry[];
  try {
    const response = await fetch('/data/bibliography-index.json');
    if (!response.ok) return;
    entries = (await response.json()) as IndexEntry[];
  } catch {
    return; // the list stays complete
  }
  const items = new Map([...document.querySelectorAll<HTMLElement>('li[data-slug]')].map((li) => [li.dataset.slug!, li]));
  const groups = [...document.querySelectorAll<HTMLElement>('section.bibliography-section')];

  const read = (): Filters => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (typeof value === 'string') params.append(key, value);
    return parseQuery(params, entries);
  };

  const write = (filters: Filters): void => {
    for (const box of form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      box.checked = (box.name === 'section' ? filters.sections : filters.essays).includes(box.value);
    }
    form.querySelector<HTMLInputElement>('input[name="q"]')!.value = filters.q;
  };

  const show = (filters: Filters): void => {
    const wanted = new Set(applyFilters(entries, filters).map((e) => e.slug));
    for (const [slug, li] of items) li.hidden = !wanted.has(slug);
    for (const group of groups) group.hidden = ![...group.querySelectorAll('li')].some((li) => !li.hidden);
    status.textContent = `${wanted.size} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
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
  const opened = parseQuery(new URLSearchParams(location.search), entries);
  write(opened);
  show(opened);
}
