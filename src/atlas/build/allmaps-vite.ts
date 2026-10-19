import type { Plugin } from 'vite';
import { MAPLIBRE_URL } from './vendor-url.js';

/*
 * `@allmaps/maplibre` 1.0.0-beta.44 was published importing MapLibre's event class from a path
 * inside its author's pnpm store (`./node_modules/.pnpm/maplibre-gl@6.7.0/.../maplibre-gl-shared.js`),
 * a file that is not in the package. Its other imports are fine. This points that one import at the
 * MapLibre the Atlas already serves (src/atlas/build/vendor.ts), where the class is exported as
 * `Event`, so the page has one copy of MapLibre and the plugin's events are that copy's events.
 * A release that no longer has the broken import is left alone.
 */
const BROKEN_IMPORT = /import \{ Fn \} from "\.\/node_modules\/\.pnpm\/maplibre-gl@[^"]+\/maplibre-gl-shared\.js";/;

export function repairAllmapsImport(code: string): string {
  return code.replace(BROKEN_IMPORT, `import { Event as Fn } from "${MAPLIBRE_URL}";`);
}

export function allmapsMaplibre(): Plugin {
  return {
    name: 'atlas-allmaps-maplibre',
    enforce: 'pre',
    resolveId: (source) => (source === MAPLIBRE_URL ? { id: source, external: true } : null),
    transform: (code, id) => (/[\\/]@allmaps[\\/]maplibre[\\/]dist[\\/]WarpedMapLayer\.js$/.test(id) ? { code: repairAllmapsImport(code), map: null } : null),
  };
}
