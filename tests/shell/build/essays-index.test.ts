import { beforeAll, describe, expect, it } from 'vitest';
import { builtSite, readPage } from '../support/build.js';

/*
 * The Essays index (spec 003, destination `essays`): the page behind the header's first lens. It
 * replaces the shell's stub with the public essays, each with its question and primary room, read
 * from the registry's public records like the home page, so a held or draft essay never appears.
 * The fixture registry has two public essays, one held and one draft.
 */
let dir = '';
beforeAll(async () => {
  dir = await builtSite();
}, 180_000);

describe('essays index', () => {
  const page = () => readPage(dir, 'essays/index.html');

  it('is a real page in the shell, not a stub and not draft', () => {
    expect(page().querySelector('main h1')?.text.trim()).toBe('Essays');
    expect(page().querySelector('[data-stub]')).toBeNull();
    expect(page().querySelector('main [data-draft]')).toBeNull();
    expect(page().querySelector('header nav')).not.toBeNull();
  });

  it('lists exactly the public essays, in title order, each linking to its page', () => {
    const links = page().querySelectorAll('main li[data-essay] h2 a');
    expect(links.map((a) => [a.text.trim(), a.getAttribute('href')])).toEqual([
      ['Alpha, another public test essay', '/essays/alpha/'],
      ['Terra nova, a public test essay', '/essays/terra-nova/'],
    ]);
  });

  it('gives each essay its question and its primary room as a link', () => {
    const item = page().querySelector('main li[data-essay="alpha"]');
    expect(item?.querySelector('.question')?.text.trim()).toBe('What does this fixture essay ask?');
    const room = item?.querySelector('.room a');
    expect([room?.text.trim(), room?.getAttribute('href')]).toEqual(['Map', '/rooms/map/']);
  });

  it('names no held or draft essay', () => {
    const text = page().querySelector('main')?.text ?? '';
    expect(text).not.toContain('Zulu');
    expect(text).not.toContain('Yankee');
  });
});
