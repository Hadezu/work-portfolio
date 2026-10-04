# Automation Playground

One shared experience is embedded on the homepage and rendered at `/automation`
and `/en/automation`. Existing proof applications remain separate, deeper evidence.

## Source contract

- `config.ts`: industry presets, five business-flow nodes, required rule IDs/kinds,
  related proof route, default pattern, and the eleven canonical patterns.
- `copy.ts`: required PL/EN interface, builder, handover and contact copy.
- `business.ts` and `BusinessInput.tsx`: localized business summaries and domain tables
  for the existing finance, services and logistics examples, reading engine records.
- `engine.ts`: pure deterministic input generation, rule evaluation, simulated
  actions, exception queue, metrics, and audit events. No fetch, storage, wall clock,
  random values or external system writes.
- `Flow.tsx`: shared semantic diagram.
- `AutomationExperience.tsx`: controls and rendering, shared by both entry points.
- `AutomationPage.tsx`: route wrapper. `PortfolioHome.tsx`: business positioning
  and compact links to existing proofs.
- `automation.css`: scoped responsive presentation; reduced motion is honored.

Add an industry by adding **one entry** to `source` in `config.ts`. Supply a unique
ID, a canonical `defaultPattern`, a valid existing proof slug, five localized flow
nodes, specific manual actions, comparison-source names, and localized rules using the supported kinds. No industry-specific page or
component is needed. Tests enumerate the configuration automatically.

`defineCopy` checks and freezes paired PL/EN shapes at import. Missing or empty
translations throw; there is no cross-language fallback. All new sources also
participate in the existing recursive language audit.

Only each industry default and the explicit reconciliation example are executable.
Other industry/pattern pairs remain shareable outlines with a visible requirements
notice and a contact CTA instead of a run button, not fabricated successful integrations. All 77 pairs
are classified; 13 have fixtures and 64 require configuration.

Reconciliation uses two separate synthetic datasets, joins on `reference`, and
compares `value` exactly with tolerance zero. It is one-way A → B; B-only records
are outside the example. Duplicate keys on either side block matching. It records
report rows for both matches and discrepancies and never produces target actions.
The finance fixture uses invoice numbers and PLN amounts; its input table shows
invoice/payment amounts, synthetic counterparties, payment dates and match status.
It preserves the same six matches, one missing payment, one amount discrepancy
and two ambiguous invoice rows.
Builder comparison asks for a separate reference source and an optional matching
field in plain language. Unknown details never block the brief; the destination
receives only the proposed read-only report. Technical rules are agreed before
implementation, not required from a prospect.

For configured non-comparison scenarios, patterns select the simulated handoff destinations through their `destinations`
configuration (indices 1–4 in the industry flow). They are illustrative operations,
not implementations of vendor APIs. Six valid records and one controlled record
per industry rule form the input. Metrics are calculated from the actual rule
results. A record with multiple findings counts once in the review total and
cannot produce a target action. Audit action events identify their destination.

UI results are keyed by both industry and pattern. A configuration change cannot
render a previous result using a different rule dictionary. The short six-stage
progress display is presentation only; results come from the pure engine.

## Stable links

`/automation?pattern=order-flow&industry=ecommerce`

Prefix with `/en` for English. Canonical patterns are `data-entry`, `data-sync`,
`reconciliation`, `document-flow`, `order-flow`, `approval-flow`, `status-sync`,
`exception-handling`, `reporting`, `end-to-end`, `other`. Uppercase underscore
codes are accepted too; `exceptions` is an alias for `exception-handling`.
Unknown values show a localized notice and a safe default. Language links retain
the query. SEO canonical URLs omit configuration parameters.

## Contact and fallback

The builder creates a proposed scope and can populate the three brief fields.
The email link percent-encodes UTF-8 and line breaks and checks required fields.
It opens the visitor's mail application; the site does not send or store a brief.
Clipboard failure leaves the visible address available for manual copying.

The existing Worker supplies localized static introductory content and email
contact when JavaScript is unavailable. Interactive simulation requires JavaScript.
No Cloudflare configuration, binding, secret or deployment workflow was changed.

Diagrams branch after checks: valid records take the normal path; rejected records
enter human review without a target action. The shared audit spans both branches.
Manual steps belong to the selected industry; the comparison has its own manual
matching steps. Every builder task lists its unresolved implementation decisions.

## Customer result presentation

Run controls and computed business totals precede the diagram. Exceptions,
per-record outcomes and the audit remain accessible in native disclosures.
Services models a structured enquiry becoming a CRM task with an owner; it does
not claim invoice parsing. Logistics models a carrier event changing an ERP order
from dispatched to delivered; it does not claim CRM updates or email delivery.
All actions remain synthetic and only accepted rows can produce them.
