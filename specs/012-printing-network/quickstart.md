# Quickstart: validating spec 012

```bash
npm ci
npm run registry -- check --dir .           # the gate, with the PLACE-ROLE-*, PERSON-* and EDITION-SURVIVAL rules
npm test                                     # unit and integration, including the scenarios below
npm run build && npm run registry -- scan dist
npm run test:e2e:atlas                       # the Atlas itself, unchanged by the network
npm run test:e2e:network                     # the network layer: the Atlas fixture with the network overlay
npm run test:e2e:bibliography                # the edition section, the person pages, axe
```

| Scenario (spec) | Test |
|---|---|
| US1.1 one production place and holdings pass | `tests/registry/unit/place-roles.test.ts` |
| US1.2 a second production place fails | same, `PLACE-ROLE-PRODUCED` |
| US1.3 a holding without holder or start date fails | same, `PLACE-ROLE-HOLDING` |
| US1.4 place roles on a map fail | same, `PLACE-ROLE-FAMILY` |
| US1.5 a moved copy reads "formerly at" | `tests/atlas/unit/network-features.test.ts` (`formerly`) |
| US1.6 earlier attributions are never drawn | same: `attribution_history` yields no feature |
| US2.1–2.3 default production places only, copies toggle, attributed styling | `tests/atlas/e2e-network/network.spec.ts`; symbols and labels in `tests/atlas/unit/roles.test.ts` |
| US2.4 corridors editorial and labelled | the same e2e on the collection's default layers |
| US2.5 keyboard and accessible names | the same e2e with axe |
| US3.1–3.3 printer page, editions in order, no path | `tests/registry/unit/person.test.ts` and `tests/bibliography/build/people-page.test.ts` |
| US4.1 non-survival stated | `tests/registry/unit/edition-survival.test.ts` and `tests/bibliography/build/entry-page.test.ts` |
| US4.2 pending locator not secure, and shown pending | `PLACE-ROLE-SECURE` in `place-roles.test.ts` and `person.test.ts`; "locator pending" in the entry and people page tests |
| US5 paper only through Evidence | `network-features.test.ts`: no paper feature; "What else is known" in `entry-page.test.ts` |
| ADR 0014 amendment | `tests/bibliography/unit/entry-public.test.ts`: an edition with place roles is public uncited |

Expected with the real registry, once the records are added: the 1508 edition shows one pin at Dealu ("attributed"). Turning on copies adds a pin per located copy, each naming its institution.
