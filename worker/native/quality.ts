import {sourceEvidence,identifierCounts} from './quality-primitives';
import reference from "./reference.json";
import {
  type Data,
  AS_OF,
  Checks,
  clone,
  dumps,
  hash,
  pystr,
  report,
  requireInput,
  validateSchema,
} from "./common";
import { csvRows, csvEncode, decimal, money, dateValue } from "./tabular";
const spec = reference["data-quality"];
const CONTRACT = spec.contract;
const RULES = spec.rules;
const CUSTOMERS: Record<string, string> = {
    "C-001": "SYN-C1",
    "C-002": "SYN-C2",
  },
  STATUS: Record<string, string> = { SALE: "posted", CANCEL: "cancelled" };
export function qualityFixture(format = "csv"): Data {
  const p = clone(spec.fixture);
  if (format === "json") {
    p.format = "json";
    p.filename = "transactions.json";
    p.content = dumps(csvRows(p.content).rows, false, false);
  }
  return p;
}
export const qualityRegression = () => clone(spec.regression);
export function executeQuality(payload: Data): Data {
  validateSchema(payload, spec.schema);
  let rows: Data[], positions: number[];
  if (payload.format === "csv")
    ({ rows, positions } = csvRows(payload.content));
  else {
    rows = JSON.parse(payload.content);
    requireInput(
      Array.isArray(rows) &&
        rows.every(
          (r) => r !== null && typeof r === "object" && !Array.isArray(r),
        ),
      "JSON must be array of records",
    );
    positions = rows.map((_, i) => i + 1);
  }
  requireInput(
    rows.length >= 1 && rows.length <= 1000,
    "Expected 1..1000 records",
  );
  const staging = rows.map((raw, i) => ({
    raw,
    source: sourceEvidence(raw,payload.filename,positions[i],String(raw.transaction_id??''),payload.format==='csv'?'physical line':'record index'),
  }));
  const lineage: Data[] = [],
    normalized: Data[] = [],
    candidate: Data[] = [],
    target: Data[] = [],
    rejected: Data[] = [],
    failures: Data[] = [];
  let sourceTotal = 0n,
    checks = 0;
  const ids=identifierCounts(rows,r=>String(r.transaction_id??'').trim());
  const reject = (
    item: Data,
    rule: string,
    expected: unknown,
    actual: unknown,
    evidence: Data,
  ) => {
    const failure = {
      root_id:
        "dq-" +
        hash(`${item.source.record_id}:${item.source.row}:${rule}`).slice(
          0,
          12,
        ),
      record_id: item.source.record_id.trim(),
      field:
        rule === "quality.transform.gross_amount" ? "gross_amount" : "record",
      rule,
      category: RULES.find((r) => r[0] === rule)![1],
      entity: "Transaction",
      severity: "HIGH",
      expected: pystr(expected),
      actual: pystr(actual),
      source: item.source,
      evidence,
    };
    failures.push(failure);
    rejected.push({ ...failure, raw: item.raw, decision: "REJECT" });
  };
  const required = CONTRACT.filter((f) => f.required).map((f) => f.source),
    allowed = CONTRACT.map((f) => f.source);
  for (const item of staging) {
    const { raw, source } = item;
    checks++;
    const missingKeys = required.filter((k) => !(k in raw));
    if (
      missingKeys.length ||
      Object.keys(raw).some((k) => !allowed.includes(k)) ||
      Object.values(raw).some((v) => v !== null && typeof v === "object")
    ) {
      reject(
        item,
        "quality.schema.contract",
        [...required].sort(),
        Object.keys(raw).sort(),
        {
          missing: missingKeys.sort(),
          unexpected: Object.keys(raw)
            .filter((k) => !allowed.includes(k))
            .sort(),
          input: raw,
        },
      );
      continue;
    }
    checks++;
    const missing = required.filter(
      (k) => raw[k] === null || (typeof raw[k] === "string" && !raw[k].trim()),
    );
    if (missing.length) {
      reject(
        item,
        "quality.required.fields",
        "nonempty required values",
        missing.sort(),
        { input: raw },
      );
      continue;
    }
    checks++;
    if (
      required.some((k) => typeof raw[k] !== "string") ||
      (raw.note != null && typeof raw.note !== "string")
    ) {
      reject(
        item,
        "quality.schema.contract",
        "string source fields / nullable note",
        "wrong scalar type",
        { input: raw },
      );
      continue;
    }
    checks++;
    const id = raw.transaction_id.trim();
    if (ids.get(id)! > 1) {
      reject(item, "quality.unique.transaction_id", 1, ids.get(id), {
        related_rules: ["quality.duplicate.record"],
        duplicates: staging
          .filter((s) => String(s.raw.transaction_id ?? "").trim() === id)
          .map((s) => s.source),
      });
      continue;
    }
    checks++;
    let gross: bigint, net: bigint, tax: bigint;
    try {
      gross = decimal(raw.gross_amount_raw);
      net = decimal(raw.net_amount_raw);
      tax = decimal(raw.tax_amount_raw);
    } catch {
      reject(
        item,
        "quality.type.gross_amount",
        "Decimal, scale <= 2",
        raw.gross_amount_raw,
        {
          amounts: {
            gross_amount_raw: raw.gross_amount_raw,
            net_amount_raw: raw.net_amount_raw,
            tax_amount_raw: raw.tax_amount_raw,
          },
        },
      );
      continue;
    }
    checks++;
    let day: string;
    try {
      day = dateValue(raw.transaction_date);
    } catch {
      reject(
        item,
        "quality.date.transaction_date",
        "ISO or DD.MM.YYYY",
        raw.transaction_date,
        { source },
      );
      continue;
    }
    if (day < "2000-01-01" || day > AS_OF.slice(0, 10)) {
      reject(
        item,
        "quality.date.transaction_date",
        "2000-01-01.." + AS_OF.slice(0, 10),
        day,
        { source },
      );
      continue;
    }
    checks++;
    const customer = raw.customer_code.trim();
    if (!Object.hasOwn(CUSTOMERS, customer)) {
      reject(item, "quality.reference.customer", "known customer", customer, {
        dimension: CUSTOMERS,
      });
      continue;
    }
    checks++;
    const status = raw.status.trim().toUpperCase(),
      country = raw.country.trim().toUpperCase();
    if (!Object.hasOwn(STATUS, status) || !["PL", "DE"].includes(country)) {
      reject(
        item,
        "quality.allowed.values",
        "SALE/CANCEL; PL/DE",
        status + ";" + country,
        { source },
      );
      continue;
    }
    checks++;
    if ([gross, net, tax].some((v) => v < 0n || v > 100000000n)) {
      reject(
        item,
        "quality.range.amount",
        "0..1000000",
        "[" +
          [gross, net, tax].map((v) => `Decimal('${money(v)}')`).join(", ") +
          "]",
        { source },
      );
      continue;
    }
    checks++;
    if (gross !== net + tax || (status === "CANCEL" && gross !== 0n)) {
      reject(
        item,
        "quality.cross_field.gross",
        "gross=net+tax; CANCEL gross=0",
        [money(gross), money(net), money(tax), status].join(";"),
        { source },
      );
      continue;
    }
    const canonical: Data = {
      transaction_id: id,
      customer_id: CUSTOMERS[customer],
      transaction_date: day,
      gross_amount: money(gross),
      net_amount: money(net),
      tax_amount: money(tax),
      normalized_status: STATUS[status],
      country_code: country,
      note: raw.note?.trim() || null,
    };
    normalized.push(canonical);
    const produced = clone(canonical);
    if (payload.configuration === "controlled" && id === "TX-104")
      produced.gross_amount = money(gross * 100n);
    candidate.push(produced);
    sourceTotal += gross;
    const edges = CONTRACT.map((f) => ({
      record_id: id,
      target_field: f.target,
      target_value: produced[f.target],
      expected_value: canonical[f.target],
      transformation: f.transformation,
      normalized_value:
        f.source === "customer_code"
          ? customer
          : f.source === "status"
            ? status
            : canonical[f.target],
      typed_value: canonical[f.target],
      typed_type: f.type,
      source_field: f.source,
      raw_value: raw[f.source] ?? null,
      source,
      controlled_change:
        payload.configuration === "controlled" &&
        id === "TX-104" &&
        f.target === "gross_amount",
    }));
    lineage.push(...edges);
    checks += 2;
    if (produced.gross_amount !== canonical.gross_amount) {
      reject(
        item,
        "quality.transform.gross_amount",
        canonical.gross_amount,
        produced.gross_amount,
        {
          ...edges.find((e) => e.target_field === "gross_amount"),
          difference: money(decimal(produced.gross_amount) - gross),
          root_cause: "controlled scale ×100 after normalization",
          downstream_rules: ["quality.aggregate.gross_amount"],
        },
      );
      continue;
    }
    target.push(produced);
  }
  const total = (r: Data[]) =>
    r.reduce((s, v) => s + decimal(v.gross_amount), 0n);
  const candidateTotal = total(candidate),
    acceptedTotal = total(target);
  checks += 2;
  const aggregates = [
    {
      rule: "quality.rows.balance",
      expected: staging.length,
      actual: target.length + rejected.length,
      status:
        staging.length === target.length + rejected.length ? "PASS" : "FAIL",
      grouped_under: [],
    },
    {
      rule: "quality.aggregate.gross_amount",
      expected: money(sourceTotal),
      actual: money(candidateTotal),
      accepted_total: money(acceptedTotal),
      status: sourceTotal === candidateTotal ? "PASS" : "FAIL",
      grouped_under: failures
        .filter((f) => f.rule === "quality.transform.gross_amount")
        .map((f) => f.root_id),
    },
  ];
  return {
    staging,
    normalized,
    candidate_target: candidate,
    target,
    lineage,
    rejected,
    failures,
    aggregate_controls: aggregates,
    quality_checks: checks,
  };
}
export function validateQuality(payload: Data): Data {
  payload = { configuration: "baseline", ...payload };
  const pipeline = executeQuality(payload),
    checks = new Checks(),
    scenarios: Data[] = [],
    negative: Data[] = [];
  const add = (
    id: string,
    record: string,
    field: string,
    expected: any,
    actual: any,
    evidence: Data,
    category: string,
  ) => {
    checks.add(
      id,
      record,
      expected === actual,
      expected,
      actual,
      "high",
      dumps(evidence),
      "Zweryfikować kontrakt lub wskazaną transformację.",
    );
    scenarios.push({
      id,
      record_id: record,
      field,
      expected: pystr(expected),
      actual: pystr(actual),
      result: expected === actual ? "PASS" : "FAIL",
      entity: "Transaction",
      category,
      severity: "HIGH",
      evidence,
    });
  };
  for (const item of pipeline.staging) {
    const failure = pipeline.failures.find(
      (f: Data) => dumps(f.source) === dumps(item.source),
    );
    add(
      failure?.rule ?? "quality.record.accept",
      item.source.record_id,
      failure?.rule === "quality.transform.gross_amount"
        ? "gross_amount"
        : "record",
      failure?.expected ?? "ACCEPT",
      failure?.actual ?? "ACCEPT",
      failure ?? item.source,
      failure?.category ?? "acceptance",
    );
  }
  for (const c of spec.scenarios) {
    const r = executeQuality(c.input);
    const found = [
      ...new Set<string>(r.failures.map((f: Data) => f.rule)),
    ].sort();
    const expected = c.expected_rule ? [c.expected_rule] : [];
    const wanted: Data = {
        rules: expected,
        rejected: c.id === "duplicate" ? 2 : expected.length ? 1 : 0,
      },
      decision: Data = { rules: found, rejected: r.rejected.length };
    if (c.id === "null-normalization") {
      wanted.note = null;
      decision.note = r.target.at(-1)?.note ?? null;
    }
    add(
      "scenario." + c.id,
      "TX-104",
      "record",
      dumps(wanted),
      dumps(decision),
      {
        input: c.input,
        decision: r.rejected.length ? "REJECT" : "ACCEPT",
        rejected: r.rejected,
        lineage: expected.length ? [] : r.lineage,
      },
      expected.length ? "negative" : "normalization",
    );
    negative.push(
      ...r.rejected.map((f: Data) => ({
        ...f,
        scenario_id: c.id,
        expected_rejection: true,
        scenario_result: dumps(decision) === dumps(wanted) ? "PASS" : "FAIL",
      })),
    );
  }
  for (const a of pipeline.aggregate_controls) {
    const accepted = a.status === "PASS" || a.grouped_under.length;
    add(
      a.rule,
      "ALL",
      a.rule.includes("aggregate") ? "gross_amount" : "count",
      "PASS or attributed to existing root",
      accepted ? "PASS or attributed to existing root" : "UNATTRIBUTED FAILURE",
      a,
      "aggregate",
    );
  }
  const artifacts = {
    ...pipeline,
    input: payload,
    contract: CONTRACT,
    rules: RULES.map((r) => ({ id: r[0], category: r[1], condition: r[2] })),
    scenarios,
    negative_rejected: negative,
    customers: CUSTOMERS,
    configuration: payload.configuration,
  };
  const r = report(
    "data-quality",
    { ruleset: "data-quality/1.0", ...payload },
    checks,
    pipeline.normalized,
    artifacts,
  );
  const transformed = pipeline.failures.filter(
    (f: Data) => f.rule === "quality.transform.gross_amount",
  ).length;
  return {
    ...r,
    ruleset: "data-quality/1.0",
    scenario_count: scenarios.length,
    passed_scenarios: r.passed,
    failed_scenarios: r.failed,
    discrepancy_count: pipeline.failures.length,
    records_received: pipeline.staging.length,
    records_processed: pipeline.staging.length,
    accepted: pipeline.target.length,
    rejected: pipeline.rejected.length,
    quality_checks: pipeline.quality_checks,
    quality_failures: pipeline.failures.length,
    transformation_failures: transformed,
    controlled_regressions: transformed,
    reproduction:
      "POST /lab-api/data-quality/run with {data: artifacts.input}; fixed evaluation clock " +
      AS_OF,
  };
}
export function qualityComparison(a: Data, b: Data): Data {
  const keys = (r: Data) =>
    new Set<string>(
      r.artifacts.failures.map((f: Data) => f.record_id + "\0" + f.rule),
    );
  const ak = keys(a),
    bk = keys(b);
  const left = Object.fromEntries(
      a.artifacts.candidate_target.map((r: Data) => [r.transaction_id, r]),
    ),
    right = Object.fromEntries(
      b.artifacts.candidate_target.map((r: Data) => [r.transaction_id, r]),
    );
  const changes: Data[] = [];
  for (const id of [
    ...new Set([...Object.keys(left), ...Object.keys(right)]),
  ].sort())
    for (const field of [
      ...new Set([
        ...Object.keys(left[id] ?? {}),
        ...Object.keys(right[id] ?? {}),
      ]),
    ].sort()) {
      const before = left[id]?.[field] ?? null,
        after = right[id]?.[field] ?? null;
      if (before !== after)
        changes.push({ record_id: id, field, before, after });
    }
  const difference = (l: Set<string>, r: Set<string>) =>
    [...l]
      .filter((k) => !r.has(k))
      .sort()
      .map((k) => ({ record_id: k.split("\0")[0], rule: k.split("\0")[1] }));
  return {
    run_a: a.run_id,
    run_b: b.run_id,
    new_failures: difference(bk, ak),
    resolved_failures: difference(ak, bk),
    changed_records: new Set(changes.map((c) => c.record_id)).size,
    changed_fields: changes.length,
    changes,
    metric_differences: Object.fromEntries(
      [
        "records_received",
        "accepted",
        "rejected",
        "quality_failures",
        "transformation_failures",
      ].map((k) => [k, b[k] - a[k]]),
    ),
    comparison_scope: "candidate target before acceptance gate",
  };
}
