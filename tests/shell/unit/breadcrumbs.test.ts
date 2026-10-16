import { describe, expect, it } from 'vitest';
import { breadcrumbs } from '../../../src/shell/breadcrumbs.js';
import { headerDestinations } from '../../../src/shell/destinations.js';

describe('breadcrumbs (FR-016)', () => {
  it('are empty on the home page and on each of the seven lens landings', () => {
    expect(breadcrumbs('/', 'Terra Chartarum')).toEqual([]);
    for (const lens of headerDestinations()) {
      expect(breadcrumbs(lens.href, lens.label), lens.id).toEqual([]);
    }
  });

  it('run from the lens to the page for a page under a lens, the last item without a link', () => {
    expect(breadcrumbs('/essays/terra-sigillata/', 'Terra Sigillata')).toEqual([
      { label: 'Essays', href: '/essays/' },
      { label: 'Terra Sigillata', href: null },
    ]);
  });

  it('start from Home for a page under no lens, such as the Colophon', () => {
    expect(breadcrumbs('/colophon/', 'Colophon')).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Colophon', href: null },
    ]);
  });

  it('return a very long scholarly title whole: truncating it is a CSS matter', () => {
    const title = 'Daciarum Moesiarumque Vetus Descriptio: how an early modern atlas fixed the frontier lines of a lost province '.repeat(3).trim();
    expect(breadcrumbs('/essays/long/', title).at(-1)).toEqual({ label: title, href: null });
  });
});
