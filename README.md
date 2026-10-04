# Ivan Matiushkin — engineering portfolio

Inspectable source for [work.matiushkin.com](https://work.matiushkin.com/en): a bilingual React/TypeScript interface, a Three.js scene, and interactive integration/data demonstrations running on Cloudflare Workers and D1.

**Independent work with synthetic/test data.** These examples demonstrate implemented mechanisms, not paid client history or certified vendor integrations. Built with Codex-assisted development; code, tests and limitations are available for review.

## Start with the buyer's problem

| Need | Smallest relevant example | Source to inspect | Boundary |
| --- | --- | --- | --- |
| React/TypeScript interface or component | [Homepage](https://work.matiushkin.com/en) | `src/PortfolioHome.tsx`, `src/TaskFit.tsx` | Independent interface, no commercial frontend history claim |
| Interactive 3D component | Homepage hero | `src/hero3d-scene.ts`, other `hero3d-*` modules | Three.js/WebGL browser scene, not a game engine or CAD product |
| CSV import and reconciliation | [Migration](https://work.matiushkin.com/en/proof/migration) | `src/migration-*`, `worker/native/` | Controlled target, not a live ERP migration |
| API contract and failure tests | [API tests](https://work.matiushkin.com/en/api-tests) | `src/api-contract.ts`, `src/api-test-pack.ts`, `worker/index.ts` | Explicit synthetic endpoint faults; replay response alone is not durable production idempotency |
| Reporting discrepancies | [Revenue BI](https://work.matiushkin.com/en/proof/revenue-bi) | `src/revenue-*`, `worker/native/` | Synthetic EUR data, not accounting certification or Power BI delivery |
| Operational review queue | [Operations exceptions](https://work.matiushkin.com/en/operations-exceptions) | `src/OperationsPage.tsx`, native rules | Independent sample process, no real company data |
| LLM extraction and evaluation | [AI lab](https://work.matiushkin.com/en/proof/ai-automation) | `src/ai-lab-model.ts`, `worker/ai-lab.ts`, `src/ai-lab.test.ts` | Lexical retrieval, preset inputs, simulated actions; local tests use a provider double |

Use one relevant example in an application; this repository is second-step code evidence. A suitable first engagement is a scoped component, import rule, endpoint or test slice with agreed acceptance criteria.

## Run locally

Node **24**, npm and no Cloudflare account are required for the local demonstration. From this directory:

```sh
npm ci
npm run cf-types
npm run setup:local
npm run dev
```

Open the localhost URL printed by Vite. D1 runs locally. The runner selects the native TypeScript backend, so Python is unnecessary.

**Local contact delivery and live AI inference are disabled.** The contact endpoint returns 503, metrics return 204 without collection, and AI requests return 503. No sending or paid inference binding is attached to the default runtime. The reference implementations remain available for code inspection and tests; `wrangler.reference.jsonc` is used only to generate their types. The local UI retains the site's explanatory copy, so the live AI button is not a working local feature.

## Verify

```sh
npm test
npm run build
npx playwright install chromium --only-shell
npm run setup:local
npm run test:e2e
```

The default browser check covers the local entry point, bilingual routes, measured API results, migration recovery and disabled external actions. Other inherited browser specifications are retained for inspection but are not all part of this local distribution's CI: some target production services or historical copy. See [verification](docs/VERIFICATION.md) for actual executed scope.

## Evidence and limitations

- Unit tests cover validation, mapping, reconciliation, state transitions, permission rules and provider failure scenarios. Mocks and synthetic faults are explicitly identified.
- API scenario duration is measured around execution and parsing. The UI displays the sum of scenario durations; parallel execution means it is not total wall-clock time or a reliability benchmark.
- The production site has 48 sitemap routes (24 PL/EN pairs) and 13 interactive demonstrations at the source snapshot date. See [source provenance](SOURCE.md); this distribution is not byte-identical to the deployed release.
- No secrets, CVs, prospect records or private repository history belong in this repository.
- No deployment workflow is included. Production contact handling, provider access, migrations and operational requirements need separate review before any deployment.

## Contact

[work.matiushkin.com](https://work.matiushkin.com/en) · ivan@matiushkin.com

Independent contractor · Poland / remote collaboration  
Integrations, automation and internal systems for businesses

## Rights

Source is published for inspection. No general reuse licence for original portfolio code or branding is granted by this snapshot. Third-party assets and dependencies retain their own licences; see [NOTICE](NOTICE.md). This avoids implying a licence decision that the owner has not made.
