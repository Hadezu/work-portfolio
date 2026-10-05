# Local verification — 2026-10-04

## Hero source update — 2026-10-05

After copying the published adaptive-fragment modules into this curated distribution, `npm test` passed **677 tests in 33 files** and `npm run build` passed. The default local browser suite passed **7 Chromium scenarios**. No contact delivery or paid AI provider was enabled.

The isolated production release of the same hero modules passed 39 focused unit tests and 19 full-Chromium interaction cases; three production smoke cases then passed. Coverage includes continuous motion while held, frontal centering, bounded deformation, one settle glint, spare wait/rejoin, repeated grabs/cancel, context recovery, mobile ambient-only behavior and reduced motion. This is scoped release evidence, not a full-site browser-suite or physical-device certification. One earlier development phase-wait timeout is retained as historical evidence; the unchanged full suite passed against the isolated production build.

`playwright.hero.config.ts` exposes the 19-case suite separately. It needs full Chromium and a running preview; it is not part of the default seven-case CI browser job. GitHub Actions results must be checked against the exact commit, rather than inferred from these local passes.

## Original curated baseline

Environment: Windows, Node 24.15.0, npm 11.12.1. Dependencies installed independently with `npm ci` from the curated lockfile.

| Check | Observed result |
| --- | --- |
| Type generation and `npm run build` | PASS; Worker and browser bundles built |
| `npm test` | PASS — 30 files, 652 tests |
| Local D1 migrations | PASS — both migrations applied to local storage |
| `npm run test:e2e` | PASS — 7 Chromium scenarios |

Browser scope: EN/PL route rendering, disabled contact and AI endpoints, API scenario matrix with measured time, EN/PL migration with a broken mapping and selective replay, uploaded synthetic CSV changing real totals, failed request recovery, SSR and language metadata. Migration assertions include a repeated replay producing zero additional writes.

The browser run exposed early DOM decoration before route hydration and a possible early click on an unhydrated control. Presentation effects now run within the route's Suspense boundary; the route content remains inert until mounted. The final seven-scenario run passed without the previous hydration warnings.

The initial local config used a compatibility date newer than the installed workerd binary. It now retains the source site's supported 2026-09-16 date. Windows sandbox execution needed permission for Wrangler's local registry directory; normal local development does not need a Cloudflare login.

Not verified by this run: production deployment, live AI provider behavior, email delivery, the complete inherited e2e suite, all browsers, load/scale or security certification. Unit tests of AI and contact handling use explicit doubles. CI is configured but a local pass is not evidence of a GitHub-hosted CI pass.
