# Project context and verification scope

This page records the context behind the product presentation. Detailed test records and reproduction instructions remain in the project documentation.

## Project context

**Review format:** Reproducible source distribution. The public website can include newer changes than this snapshot; local contact delivery and live inference are disabled.

**Independent work with synthetic/test data.** These examples demonstrate implemented mechanisms, not paid client history or certified vendor integrations. Built with Codex-assisted development; code, tests and limitations are available for review.

| Need | Smallest relevant example | Source to inspect | Boundary |
| --- | --- | --- | --- |
| React/TypeScript interface or component | [Homepage](https://work.matiushkin.com/en) | `src/PortfolioHome.tsx`, `src/TaskFit.tsx` | Independent interface, no commercial frontend history claim |
| Interactive 3D component | Homepage hero: grab a fragment while the assembly continues | `src/hero3d-scene.ts`, `src/hero-assembly-*` | Three.js/WebGL, pointer/keyboard interaction and bounded spring response; decorative behavior, not autonomous AI or a CAD product |
| CSV import and reconciliation | [Migration](https://work.matiushkin.com/en/proof/migration) | `src/migration-*`, `worker/native/` | Controlled target, not a live ERP migration |
| API contract and failure tests | [API tests](https://work.matiushkin.com/en/api-tests) | `src/api-contract.ts`, `src/api-test-pack.ts`, `worker/index.ts` | Explicit synthetic endpoint faults; replay response alone is not durable production idempotency |
| Reporting discrepancies | [Revenue BI](https://work.matiushkin.com/en/proof/revenue-bi) | `src/revenue-*`, `worker/native/` | Synthetic EUR data, not accounting certification or Power BI delivery |
| Operational review queue | [Operations exceptions](https://work.matiushkin.com/en/operations-exceptions) | `src/OperationsPage.tsx`, native rules | Independent sample process, no real company data |
| LLM extraction and evaluation | [AI lab](https://work.matiushkin.com/en/proof/ai-automation) | `src/ai-lab-model.ts`, `worker/ai-lab.ts`, `src/ai-lab.test.ts` | Lexical retrieval, preset inputs, simulated actions; local tests use a provider double |
