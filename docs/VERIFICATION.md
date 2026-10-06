# Local verification — 2026-10-04

## Persistent hero acceptance gate — 2026-10-06

The standard `Verify local portfolio` workflow now runs both hero specification files, all **19** scenarios, after the existing seven browser scenarios. `playwright.hero.config.ts` starts and stops its own local build preview; no production URL or Cloudflare deployment is used. Install full Chromium with `npx playwright install chromium`, build, then run `npx playwright test --config playwright.hero.config.ts`. `HERO_QA_URL` remains an explicit override for a separately managed preview.

Local Windows validation: build passed and **19/19 hero scenarios passed** in 2.6 minutes at normal raster density. An initial sandbox run lost its preview process; the complete run under the normal user account passed. CI retains JUnit, failure action/source traces and QA screenshots as `portfolio-browser-evidence`. Continuous video/screenshot/DOM tracing is disabled for this WebGL suite to avoid GPU readback overhead on shared CPU runners.

The isolated CI browser explicitly selects [Chromium's SwiftShader WebGL fallback](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md). Default CI contexts use deviceScaleFactor 0.25: CSS viewport, pointer coordinates, application geometry and assertions are unchanged, while fewer pixels are rasterized on the CPU. Explicit mobile/retina contexts retain their specified density, including the 2x canvas assertion. Normal local runs retain deviceScaleFactor 1. This is functional browser verification, not a physical GPU/frame-rate or full-resolution visual benchmark.

The first hosted normal-density run passed 14/19 and exposed timing failures on the software renderer; no assertions were removed. Two affected scenarios subsequently passed locally with the CPU CI configuration. Consult the Actions run for the exact commit for full hosted CI evidence.

## Hero source update — 2026-10-05

After copying the published adaptive-fragment modules into this curated distribution, `npm test` passed **677 tests in 33 files** and `npm run build` passed. The default local browser suite passed **7 Chromium scenarios**. No contact delivery or paid AI provider was enabled.

The isolated production release of the same hero modules passed 39 focused unit tests and 19 full-Chromium interaction cases; three production smoke cases then passed. Coverage includes continuous motion while held, frontal centering, bounded deformation, one settle glint, spare wait/rejoin, repeated grabs/cancel, context recovery, mobile ambient-only behavior and reduced motion. This is scoped release evidence, not a full-site browser-suite or physical-device certification. One earlier development phase-wait timeout is retained as historical evidence; the unchanged full suite passed against the isolated production build.

At that historical release, the hero suite was separate from CI and needed an external preview. The 2026-10-06 gate above supersedes that setup. GitHub Actions results must be checked against the exact commit, rather than inferred from local passes.

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
