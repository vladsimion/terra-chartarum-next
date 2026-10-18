/*
 * The deep-zoom viewer of a map record (spec 004 FR-004, FR-017, contracts/collection-pages.md).
 * This file is the only script a record page loads at first: it reveals the "Open viewer" button
 * and waits. The library is imported on the first click and not before, so a page that is only read
 * costs the reader no viewer bytes. If the library or the image source fails, the still image stays
 * and a message says why.
 *
 * Keys are the library's own: the arrows pan, + and - zoom, 0 resets. Wheel, drag and pinch are its
 * defaults too. Under prefers-reduced-motion no animation runs.
 */
const UNAVAILABLE = 'The viewer is unavailable. The still image is shown instead.';

for (const root of document.querySelectorAll<HTMLElement>('figure[data-viewer-root][data-info-url]')) {
  const button = root.querySelector<HTMLButtonElement>('button[data-viewer]');
  if (!button) continue;
  button.hidden = false;
  button.addEventListener('click', () => void open(root, button), { once: true });
}

function say(root: HTMLElement, text: string): void {
  const message = document.createElement('p');
  message.className = 'viewer-message';
  message.setAttribute('role', 'status');
  message.textContent = text;
  root.append(message);
}

async function open(root: HTMLElement, button: HTMLButtonElement): Promise<void> {
  const surface = root.querySelector<HTMLElement>('.viewer-surface');
  const still = root.querySelector<HTMLElement>('.still');
  const controls = root.querySelector<HTMLElement>('.viewer-controls');
  if (!surface || !still || !controls) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const { default: OpenSeadragon } = await import('openseadragon');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationTime = reduced ? 0 : 1.2;
    surface.hidden = false;
    const viewer = OpenSeadragon({
      element: surface,
      tileSources: root.dataset.infoUrl,
      showNavigationControl: false,
      animationTime,
      blendTime: reduced ? 0 : 0.5,
      springStiffness: reduced ? 100 : 6.5,
    });
    root.dataset.animationTime = String(animationTime);

    const publish = (): void => {
      root.dataset.zoom = viewer.viewport.getZoom().toFixed(4);
      root.dataset.centerX = viewer.viewport.getCenter().x.toFixed(4);
    };
    viewer.addHandler('open', () => {
      still.hidden = true;
      controls.hidden = false;
      publish();
      viewer.canvas?.focus();
    });
    viewer.addHandler('animation', publish);
    viewer.addHandler('animation-finish', publish);
    viewer.addHandler('open-failed', () => {
      viewer.destroy();
      surface.hidden = true;
      still.hidden = false;
      say(root, UNAVAILABLE);
    });

    const zoom = (factor: number) => () => {
      viewer.viewport.zoomBy(factor);
      viewer.viewport.applyConstraints();
    };
    controls.querySelector('[data-zoom-in]')?.addEventListener('click', zoom(1.6));
    controls.querySelector('[data-zoom-out]')?.addEventListener('click', zoom(1 / 1.6));
    controls.querySelector('[data-reset]')?.addEventListener('click', () => viewer.viewport.goHome());
  } catch {
    surface.hidden = true;
    still.hidden = false;
    say(root, UNAVAILABLE);
  } finally {
    button.removeAttribute('aria-busy');
  }
}
