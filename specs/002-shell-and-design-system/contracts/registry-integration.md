# Contract: Astro integration with the registry (spec 001 T119b)

`src/integrations/registry.ts` is an Astro integration.

| Hook | Behaviour |
|---|---|
| `astro:build:start` | Runs the registry gate (`checkRegistry`). On any error it throws with the report summary, so the build stops before any page is generated. With no `content/` directory it logs that and continues (the shell builds before real content exists). |
| `astro:build:done` | Calls `buildSiteData(root, outDir)` (spec 001 T119a), writing `_redirects` and `data/relations.json` into the output; a failed gate or a leak fails the build. |

Pages that need records (the home page's essay list) call a helper that loads the registry, applies vocabulary mappings, and returns `projectPublic(records)`. The shell never reads `content/` files directly, and never shows a record that is not public.
