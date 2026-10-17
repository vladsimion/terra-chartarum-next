# Build Log section U: amendment of 17 October 2026 (page 2490370)

Section U ("The successor build: scholarly registry and integrity gate") was written on 16 October 2026 against `main` at `acc8712`. Later merges made four of its statements untrue. They were amended in place on 17 October 2026, each marked *Amended 17 October 2026*, and a sentence was added to the section's opening paragraph saying so. Nothing else in section U, and nothing elsewhere on the page, was changed.

| Was | Now |
|---|---|
| the Cloudflare Pages project, the domain and the cutover are unchanged: nothing from the successor is deployed | the successor is deployed as the Cloudflare Worker `terra-chartarum-next`, serving static assets (PR #27, ADR 0012, Decision Log TC-D029); the archive Pages project is unchanged and the cutover has not happened |
| that branch is retired once the remaining ports are done, and it is not yet tagged or deleted | every port is now done (PR #13 and #25); the branch is not yet tagged or deleted |
| there is no site, no Astro and no import adapter: those are specs 002 and 008 | the site shell and its Astro build exist (spec 002, section V); there is no import adapter yet (spec 008) |
| not started: the Astro build gate that would abort a site build, and applying vocabulary mappings before the public projection (both with spec 002) | both are done: `registry build` (PR #13, T119a) and the Astro hook (PR #25, T119b); see section V |

Checked: the Worker exists in the Cloudflare account and was last deployed on 17 October 2026 (16:46 UTC); `content/` still holds no real records; the five spec 001 stories are still In Review.
