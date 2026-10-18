import { searchPlaces, type PlaceIndex, type PlaceResult } from '../atlas/place-index.js';

/*
 * The place-search field (spec 005 US7, FR-009): a prefix of a historic or modern name offers the
 * place; choosing it asks the map to centre on it. It touches nothing but the field, its list and
 * its status; it never changes which layers are active, and it is not part of the view address.
 */
export interface PlaceSearchOptions {
  root: HTMLElement;
  /** The place index, fetched once when first needed. */
  load(): Promise<PlaceIndex | null>;
  year(): number;
  /** Centre the map on the place and mark it; resolves when it has. */
  show(place: PlaceResult, onRemoved: () => void): Promise<void>;
  /** Take the marker off the map. */
  clear(): void;
}

export function bindPlaceSearch({ root, load, year, show, clear }: PlaceSearchOptions): void {
  const field = root.querySelector<HTMLInputElement>('input[type="search"]');
  const list = root.querySelector<HTMLElement>('[data-place-results]');
  const status = root.querySelector<HTMLElement>('[data-place-status]');
  const marker = root.querySelector<HTMLElement>('[data-place-marker]');
  if (!field || !list || !status || !marker) return;
  const markerLabel = marker.querySelector<HTMLElement>('span');
  const markerButton = marker.querySelector<HTMLButtonElement>('button');
  root.hidden = false;

  function removed(message: string): void {
    marker!.hidden = true;
    status!.textContent = message;
  }

  async function update(): Promise<void> {
    const index = await load();
    const query = field!.value;
    if (!index || query.trim() === '') {
      list!.replaceChildren();
      if (query.trim() === '') status!.textContent = '';
      return;
    }
    const found = searchPlaces(index, query, year());
    list!.replaceChildren(
      ...found.map((place) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = place.name === place.title ? place.name : `${place.name} (${place.title})`;
        button.addEventListener('click', () => {
          void show(place, () => removed('Marker removed.')).then(() => {
            status!.textContent = `Map centred on ${place.title}.`;
            if (markerLabel) markerLabel.textContent = `Marker: ${place.title}`;
            marker!.hidden = false;
          });
        });
        li.append(button);
        return li;
      }),
    );
    status!.textContent = found.length === 0 ? 'No places match.' : '';
  }

  field.addEventListener('input', () => void update());
  markerButton?.addEventListener('click', () => {
    clear();
    removed('Marker removed.');
  });
}
