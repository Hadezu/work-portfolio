import reference from "./reference.json";
import {
  AS_OF,
  Checks,
  clone,
  dumps,
  hash,
  pystr,
  report,
  requireInput,
  validateSchema,
  type Data,
} from "./common";
import { csvRows, csvEncode, dateValue } from "./tabular";
const spec = reference["operations-exceptions"] as Data;
const TABLES = [
  "orders",
  "customers",
  "products",
  "shipments",
  "documents",
  "invoices",
  "quality",
  "imports",
];
export function operationsFixture(format = "json"): Data {
  const value = clone(spec.fixture);
  if (format === "csv")
    for (const f of value.files) {
      const rows = JSON.parse(f.content);
      f.content = csvEncode(
        rows.map((r: Data) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [
              k,
              typeof v === "boolean" ? pystr(v) : v,
            ]),
          ),
        ),
        Object.keys(rows[0] ?? { order_id: "" }),
      );
      f.format = "csv";
      f.name = f.table + ".csv";
    }
  return value;
}
export const operationsRegression = () => clone(spec.regression);
export function parseOperations(payload: Data): Data {
  validateSchema(payload, spec.schema);
  const tables: Data = Object.fromEntries(TABLES.map((k) => [k, []]));
  const seen = new Set();
  for (const file of payload.files) {
    requireInput(!seen.has(file.table), "One export per table is required");
    seen.add(file.table);
    const parsed =
      file.format === "csv"
        ? csvRows(file.content)
        : { rows: JSON.parse(file.content), positions: [] };
    const rows = parsed.rows;
    requireInput(
      Array.isArray(rows) &&
        rows.every((r: any) => r && typeof r === "object" && !Array.isArray(r)),
      "JSON must be an array of records",
    );
    requireInput(rows.length <= 1000, "Maximum 1000 rows per table");
    rows.forEach((raw: Data, index: number) => {
      requireInput(
        Object.values(raw).every(
          (v) =>
            v === null ||
            (typeof v !== "object" &&
              (typeof v !== "number" || Number.isFinite(v))),
        ),
        "Export rows must contain finite scalar fields",
      );
      requireInput(
        new Set(Object.keys(raw).map((k) => k.trim())).size ===
          Object.keys(raw).length,
        "Ambiguous normalized field names",
      );
      const normalized: Data = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [
          k.trim(),
          typeof v === "string" ? v.trim() : v,
        ]),
      );
      const issues: string[] = [];
      for (const key of ["quantity", "stock"])
        if (key in normalized) {
          const v = normalized[key],
            n = Number(v);
          if (
            typeof v === "boolean" ||
            !Number.isSafeInteger(n) ||
            String(v).trim() !== String(n)
          )
            issues.push(key);
          else normalized[key] = n;
        }
      for (const key of ["quality_required", "import_required"])
        if (key in normalized) {
          const v = String(normalized[key]).toLowerCase();
          if (!["true", "false", "1", "0"].includes(v)) issues.push(key);
          normalized[key] = ["true", "1"].includes(v);
        }
      normalized._source = {
        file: file.name,
        row: file.format === "csv" ? parsed.positions[index] : index + 1,
        format: file.format,
        raw,
        fields: Object.fromEntries(
          Object.keys(raw).map((k) => [
            k,
            { source_field: k, normalized_field: k.trim() },
          ]),
        ),
      };
      normalized._issues = issues;
      tables[file.table].push(normalized);
    });
  }
  requireInput(
    seen.has("orders") && tables.orders.length,
    "orders export must contain at least one record",
  );
  for (const order of tables.orders)
    order._exports = Object.fromEntries(
      payload.files.map((f: Data) => [f.table, f.name]),
    );
  return tables;
}
function validDate(v: any): number | null {
  try {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return Date.parse(dateValue(v));
  } catch {
    return null;
  }
}
export function evaluateOperations(tables: Data): {
  exceptions: Data[];
  executed: number;
} {
  const exceptions: Data[] = [];
  let executed = 0;
  const today = Date.parse(AS_OF.slice(0, 10));
  for (const order of tables.orders) {
    const get = (k: string) => order[k] ?? null;
    const id = order.order_id ?? "",
      sku = get("sku"),
      customer = get("customer");
    const linked = (table: string) =>
      tables[table].filter((r: Data) => (r.order_id ?? null) === id);
    const products = tables.products.filter(
        (p: Data) => (p.sku ?? null) === sku,
      ),
      shipments = linked("shipments"),
      docs = linked("documents");
    const invalid = [
      ...order._issues,
      ...[
        "order_id",
        "customer",
        "sku",
        "erp_status",
        "b2b_status",
        "required_document",
        "quality_required",
        "import_required",
      ].filter((k) => !(k in order) || order[k] === null || order[k] === ""),
    ];
    if (!Number.isInteger(get("quantity")) || get("quantity") <= 0)
      invalid.push("quantity");
    for (const key of ["planned_date", "status_updated"])
      if (validDate(get(key)) === null) invalid.push(key);
    if (
      !["OPEN", "READY", "SHIPPED", "COMPLETED"].includes(get("erp_status")) ||
      !["OPEN", "READY", "SHIPPED", "COMPLETED"].includes(get("b2b_status"))
    )
      invalid.push("status");
    const count = tables.orders.filter(
      (r: Data) => (r.order_id ?? null) === id,
    ).length;
    const expired = docs.filter(
      (d: Data) =>
        validDate(d.valid_until) === null || validDate(d.valid_until)! < today,
    );
    const conditions: Data = {
      "order.status.mismatch": get("erp_status") !== get("b2b_status"),
      "document.required.missing": !docs.some(
        (d: Data) => (d.type ?? null) === get("required_document"),
      ),
      "document.validity.invalid": expired.length > 0,
      "order.overdue":
        validDate(get("planned_date")) !== null &&
        validDate(get("planned_date"))! < today &&
        !["SHIPPED", "COMPLETED"].includes(get("erp_status")),
      "shipment.not.dispatched":
        ["READY", "SHIPPED"].includes(get("erp_status")) &&
        !shipments.some((s: Data) => s.state === "DISPATCHED"),
      "stock.insufficient":
        products.length > 0 &&
        Number.isInteger(get("quantity")) &&
        (!Number.isInteger(products[0].stock) ||
          products[0].stock < get("quantity")),
      "order.duplicate": count > 1,
      "product.unknown": !products.length,
      "invoice.required.missing":
        ["SHIPPED", "COMPLETED"].includes(get("erp_status")) &&
        !linked("invoices").length,
      "quality.document.missing":
        get("quality_required") === true && !linked("quality").length,
      "customs.document.missing":
        get("import_required") === true &&
        !linked("imports").some((r: Data) => r.document),
      "order.status.stale":
        validDate(get("status_updated")) !== null &&
        (today - validDate(get("status_updated"))!) / 86400000 > 7,
      "data.required.invalid": invalid.length > 0,
      "record.link.inconsistent":
        !tables.customers.some(
          (c: Data) => (c.customer ?? null) === customer,
        ) ||
        shipments.some(
          (s: Data) =>
            (s.sku ?? null) !== sku || (s.customer ?? null) !== customer,
        ) ||
        docs.some(
          (d: Data) =>
            !shipments.some(
              (s: Data) => (s.shipment_id ?? null) === (d.shipment_id ?? null),
            ),
        ),
    };
    for (const rule of spec.rules) {
      executed++;
      if (!conditions[rule.id]) continue;
      const source = order._source,
        exception_id =
          "op-" +
          hash(`${rule.id}:${id}:${source.file}:${source.row}`).slice(0, 12);
      const actuals: Data = {
        "order.status.mismatch": `ERP=${pystr(get("erp_status"))}; B2B=${pystr(get("b2b_status"))}`,
        "document.required.missing": `${pystr(get("required_document"))}: brak`,
        "document.validity.invalid": expired
          .map(
            (d: Data) =>
              `${pystr(d.document_id ?? null)}: ważność ${pystr(d.valid_until ?? null)}`,
          )
          .join("; "),
        "order.overdue": `Termin ${pystr(get("planned_date"))}; status ${pystr(get("erp_status"))}`,
        "shipment.not.dispatched": `Przesyłki: ${shipments.length ? pystr(shipments.map((s: Data) => s.state ?? null)) : "brak"}`,
        "stock.insufficient": `ilość=${pystr(get("quantity"))}; zapas=${pystr(products[0]?.stock ?? null)}`,
        "order.duplicate": `ID ${id}: ${count} wiersze`,
        "product.unknown": `SKU ${pystr(sku)}: brak w katalogu`,
        "invoice.required.missing": `Status ${pystr(get("erp_status"))}; powiązane faktury: 0`,
        "quality.document.missing":
          "quality_required=true; powiązane dokumenty: 0",
        "customs.document.missing":
          "import_required=true; brak identyfikatora dokumentu odprawy",
        "order.status.stale": `Ostatnia aktualizacja ${pystr(get("status_updated"))}; próg 7 dni`,
        "data.required.invalid": [...new Set(invalid)].sort().join(", "),
        "record.link.inconsistent": `Zamówienie: ${pystr(customer)}/${pystr(sku)}; przesyłka: [${shipments.map((s: Data) => "(" + [s.customer ?? null, s.sku ?? null].map((v) => (typeof v === "string" ? "'" + v + "'" : pystr(v))).join(", ") + ")").join(", ")}]; wymagane zgodne referencje`,
      };
      const actual = actuals[rule.id];
      const evidence = {
        exception_id,
        order_id: id,
        shipment_id: shipments.map((s: Data) => s.shipment_id ?? null),
        rule: rule.id,
        source_rows: [
          source,
          ...[
            ...shipments,
            ...docs,
            ...products,
            ...linked("invoices"),
            ...linked("quality"),
            ...linked("imports"),
          ].map((r) => r._source),
        ],
        required_document: get("required_document"),
        documents_found: docs.map((d: Data) => d.type ?? null),
        document_lookup: {
          table: "documents",
          file: order._exports.documents ?? "not supplied",
          order_id: id,
          type: get("required_document"),
        },
        expected: rule.expected_condition,
        actual,
        deadline: get("planned_date"),
        status: get("erp_status"),
        severity: rule.severity,
        normalized_order: order,
        invalid_fields: invalid,
      };
      exceptions.push({
        exception_id,
        entity: "Order",
        entity_id: id,
        rule: rule.id,
        severity: rule.severity,
        reason: actual,
        source,
        expected: rule.expected_condition,
        actual,
        evidence,
        recommended_action: rule.action,
        status: "OPEN",
        deadline: get("planned_date"),
      });
    }
  }
  return { exceptions, executed };
}
export function validateOperations(payload: Data): Data {
  const tables = parseOperations(payload),
    { exceptions, executed } = evaluateOperations(tables),
    checks = new Checks(),
    rows: Data[] = [];
  const rules = (found: Data[]) =>
    [...new Set(found.map((e) => e.rule))].sort();
  const add = (
    id: string,
    name: string,
    expected: string[],
    actual: string[],
    found: Data[],
    input: Data,
  ) => {
    const ev = {
      scenario_id: id,
      expected_rules: expected,
      actual_rules: actual,
      exceptions: found,
      input,
    };
    const record = parseOperations(input)
      .orders.map((o: Data) => pystr(o.order_id ?? "(missing)"))
      .join(", ");
    const ok = dumps(expected) === dumps(actual);
    checks.add(
      id,
      record,
      ok,
      dumps(expected),
      dumps(actual),
      "high",
      dumps(ev),
      "Sprawdzić źródło i uzgodnioną regułę.",
    );
    rows.push({
      id,
      name,
      record,
      expected: expected.length ? "EXCEPTION: " + expected.join(", ") : "CLEAN",
      actual: actual.length ? "EXCEPTION: " + actual.join(", ") : "CLEAN",
      result: ok ? "PASS" : "FAIL",
      evidence: ev,
    });
  };
  add(
    "reference.controls",
    "Kontrola bieżącego eksportu",
    [],
    rules(exceptions),
    exceptions,
    payload,
  );
  for (const rule of spec.rules) {
    const input = spec.scenarios.find((s: Data) => s.id === rule.id).input,
      found = evaluateOperations(parseOperations(input)).exceptions;
    add(
      rule.id,
      "Naruszenie warunku: " + rule.description,
      [rule.id],
      rules(found),
      found,
      input,
    );
  }
  const baseline = operationsFixture(),
    found = evaluateOperations(parseOperations(baseline)).exceptions;
  for (const [id, name] of [
    ["status.consistent", "Zgodność statusów — referencja"],
    ["documents.complete", "Komplet dokumentów — referencja"],
  ])
    add(id, name, [], rules(found), found, baseline);
  const result = report(
    "operations-exceptions",
    payload,
    checks,
    tables.orders,
    {
      input: payload,
      tables,
      rules: spec.rules,
      scenarios: rows,
      exceptions,
      configuration:
        dumps(payload, true) === dumps(baseline, true)
          ? "baseline"
          : dumps(payload, true) === dumps(spec.regression, true)
            ? "controlled"
            : "imported",
    },
  );
  return {
    ...result,
    ruleset: "operations/1.0",
    scenario_count: rows.length,
    passed_scenarios: result.passed,
    failed_scenarios: result.failed,
    discrepancy_count: exceptions.length,
    records_checked: Object.values(tables).reduce(
      (n: number, t: any) => n + t.length,
      0,
    ),
    controls_executed: executed,
    exceptions_detected: exceptions.length,
    high: exceptions.filter((e) => e.severity === "HIGH").length,
    medium: exceptions.filter((e) => e.severity === "MEDIUM").length,
    low: exceptions.filter((e) => e.severity === "LOW").length,
    unresolved: exceptions.length,
    resolved: 0,
  };
}
