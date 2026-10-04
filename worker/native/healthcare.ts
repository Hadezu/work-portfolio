import reference from "./reference.json";
import {
  type Data,
  Checks,
  clone,
  dumps,
  pystr,
  report,
  requireInput,
  validateSchema,
} from "./common";
import { dateValue } from "./tabular";
const spec = reference["healthcare-integration"] as Data;
const RULESET = "healthcare-contract/1.0.0";
export const healthcareFixture = () => clone(spec.fixture);
export const healthcareRegression = () => clone(spec.regression);
export function strictJson(text: string): any {
  let i = 0;
  const ws = () => {
    while (/\s/.test(text[i] ?? "") && i < text.length) i++;
  };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i));
    }
    throw Error("Unclosed JSON string");
  };
  const value = (depth = 0): any => {
    requireInput(depth <= 50, "JSON depth");
    ws();
    if (text[i] === '"') return string();
    if (text[i] === "{") {
      i++;
      const result: Data = Object.create(null);
      ws();
      if (text[i] === "}") {
        i++;
        return result;
      }
      while (true) {
        ws();
        requireInput(text[i] === '"', "Object key");
        const key = string();
        requireInput(!(key in result), "Duplicate JSON key");
        ws();
        requireInput(text[i++] === ":", "Colon");
        result[key] = value(depth + 1);
        ws();
        const c = text[i++];
        if (c === "}") return result;
        requireInput(c === ",", "Comma");
      }
    }
    if (text[i] === "[") {
      i++;
      const rows: any[] = [];
      ws();
      if (text[i] === "]") {
        i++;
        return rows;
      }
      while (true) {
        rows.push(value(depth + 1));
        ws();
        const c = text[i++];
        if (c === "]") return rows;
        requireInput(c === ",", "Comma");
      }
    }
    const m =
      /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
        text.slice(i),
      );
    requireInput(m, "JSON token");
    i += m[0].length;
    const result = JSON.parse(m[0]);
    requireInput(
      typeof result !== "number" || Number.isFinite(result),
      "Finite number",
    );
    return result;
  };
  const result = value();
  ws();
  requireInput(i === text.length, "JSON trailing content");
  return result;
}
function refs(resource: Data): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const [field, kind] of spec.references[resource.resourceType] ?? []) {
    const raw = resource[field];
    const vals = Array.isArray(raw) ? raw : [raw];
    vals.forEach((v: Data, i: number) => {
      const ref = (field === "participant" ? v?.actor : v)?.reference ?? "";
      out.push([field + (Array.isArray(raw) ? "[" + i + "]" : ""), kind, ref]);
    });
  }
  return out;
}
function iso(value: string): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    return null;
  try {
    dateValue(value.slice(0, 10));
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}
function schemaIssues(
  value: any,
  schema: Data,
  root: Data,
  path: string[] = [],
): { field: string; type: string }[] {
  if (schema.$ref)
    return schemaIssues(
      value,
      root.$defs[schema.$ref.split("/").at(-1)],
      root,
      path,
    );
  const errors: { field: string; type: string }[] = [];
  const add = (type: string) => errors.push({ field: path[0], type });
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      add("model_type");
      return errors;
    }
    for (const key of schema.required ?? [])
      if (!(key in value))
        errors.push({ field: path[0] ?? key, type: "missing" });
    for (const [key, v] of Object.entries(value)) {
      if (schema.properties?.[key])
        errors.push(
          ...schemaIssues(v, schema.properties[key], root, [...path, key]),
        );
      else if (schema.additionalProperties === false)
        errors.push({ field: path[0] ?? key, type: "extra_forbidden" });
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) add("list_type");
    else {
      if (value.length < (schema.minItems ?? 0)) add("too_short");
      if (value.length > (schema.maxItems ?? Infinity)) add("too_long");
      for (const v of value)
        errors.push(...schemaIssues(v, schema.items, root, path));
    }
  } else if (schema.type === "string") {
    if (typeof value !== "string") add("string_type");
    else if (value.length < (schema.minLength ?? 0)) add("string_too_short");
    else if (schema.pattern && !new RegExp(schema.pattern).test(value))
      add("string_pattern_mismatch");
  } else if (schema.type === "boolean" && typeof value !== "boolean")
    add("bool_type");
  if (schema.const !== undefined && value !== schema.const)
    add("literal_error");
  return errors;
}
export function validateHealthcareMessage(c: Data, resources: Data[]): Data {
  const issues: Data[] = [];
  let parsed: any = null;
  const kind = c.interface.replace("IF-", "");
  const issue = (
    rule: string,
    expected: any,
    actual: any,
    evidence: Data = {},
  ) =>
    issues.push({
      rule,
      expected,
      actual,
      severity: "high",
      evidence: {
        scenario_id: c.scenario_id,
        resource_id:
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed.id ?? null)
            : null,
        resource_type: kind,
        rule,
        ...evidence,
      },
    });
  let ok = false;
  try {
    parsed = strictJson(c.input_json);
    ok = true;
  } catch {
    issue("payload.json", "JSON object", "malformed JSON", {
      input_fragment: c.input_json.slice(0, 300),
    });
  }
  if (ok) {
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      issue(
        "payload.shape",
        "JSON object",
        parsed === null
          ? "NoneType"
          : Array.isArray(parsed)
            ? "list"
            : typeof parsed === "string"
              ? "str"
              : typeof parsed === "boolean"
                ? "bool"
                : Number.isInteger(parsed)
                  ? "int"
                  : "float",
      );
    else if (parsed.resourceType !== kind)
      issue(
        "contract.resource_type",
        kind,
        pystr(parsed.resourceType ?? null),
        { input_fragment: parsed },
      );
    else {
      const errors = schemaIssues(parsed, spec.schema.$defs[kind], spec.schema);
      if (errors.length) {
        for (const e of errors)
          issue(
            ["missing", "too_short"].includes(e.type)
              ? "contract.required." + e.field
              : "contract.schema",
            "required typed field",
            e.field + ": " + e.type,
            { input_fragment: parsed, field: e.field },
          );
      } else {
        const r = parsed,
          index = Object.fromEntries(
            resources.map((r) => [r.resourceType + "/" + r.id, r]),
          );
        for (const other of resources)
          if (
            other.resourceType === kind &&
            other.id !== r.id &&
            other.identifier.some((id: Data) =>
              r.identifier.some(
                (v: Data) => v.system === id.system && v.value === id.value,
              ),
            )
          )
            issue(
              "identifier.unique",
              "unique (type, system, value)",
              other.id,
              { input_fragment: r.identifier },
            );
        if (spec.statuses[kind] && !spec.statuses[kind].includes(r.status))
          issue("contract.status", spec.statuses[kind].join(" | "), r.status, {
            input_fragment: { status: r.status },
          });
        for (const [field, target, ref] of refs(r)) {
          const resolved = index[ref];
          if (!resolved || resolved.resourceType !== target)
            issue(
              "reference." + target.toLowerCase(),
              target + " reference resolves",
              ref + " not found or wrong type",
              {
                reference: ref,
                expected_target: target,
                resolved_target: null,
                field,
                input_fragment: ref,
              },
            );
          else if (target === "Patient" && !resolved.active)
            issue(
              "reference.patient.active",
              "active Patient",
              ref + " inactive",
              {
                reference: ref,
                resolved_target: ref,
                input_fragment: { active: false },
              },
            );
        }
        const times: Record<string, number | null> = {};
        for (const field of spec.times[kind] ?? []) {
          times[field] = iso(r[field]);
          if (times[field] === null)
            issue(
              "contract.timestamp",
              "ISO 8601 full timestamp with timezone",
              r[field],
              { field, input_fragment: { [field]: r[field] } },
            );
        }
        if (kind === "Appointment") {
          if (
            r.participant.some(
              (p: Data) =>
                !["accepted", "declined", "tentative", "needs-action"].includes(
                  p.status,
                ),
            )
          )
            issue(
              "contract.participant_status",
              "allowed participant status",
              pystr(r.participant),
            );
          if (
            times.start !== null &&
            times.end !== null &&
            times.start >= times.end
          )
            issue(
              "contract.time_order",
              "start < end",
              r.start + " / " + r.end,
            );
        }
        if (["Observation", "ServiceRequest"].includes(kind)) {
          const encounter = index[r.encounter.reference],
            patient = index[r.subject.reference];
          if (
            encounter &&
            patient &&
            encounter.subject?.reference !== r.subject.reference
          )
            issue(
              "reference.subject_match",
              encounter.subject?.reference ?? null,
              r.subject.reference,
              {
                reference: r.encounter.reference,
                expected_target: encounter.subject ?? null,
                resolved_target: r.subject,
                input_fragment: r.subject,
              },
            );
          if (encounter?.status === "cancelled")
            issue(
              "contract.encounter_state",
              "non-cancelled Encounter",
              "cancelled",
              { reference: r.encounter.reference },
            );
        }
      }
    }
  }
  const natural = issues.length ? 422 : 201,
    observed = c.simulated_http ?? natural;
  if (observed !== natural)
    issue("transport.status", String(natural), String(observed), {
      adapter: "synthetic response status override",
    });
  const decision = issues.length ? "REJECT" : "ACCEPT";
  for (const x of issues) x.evidence.decision = decision;
  const rules = [...new Set<string>(issues.map((x) => x.rule))].sort();
  const passed =
    decision === c.expected_decision &&
    observed === c.expected_http &&
    dumps(rules) === dumps([...c.expected_rules].sort());
  const id =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed.id ?? null)
      : null;
  return {
    scenario_id: c.scenario_id,
    name: c.name,
    interface: c.interface,
    resource_type: kind,
    resource_id: id,
    input: c.input_json,
    preconditions: c.preconditions,
    expected: c.expected_decision,
    actual: decision,
    expected_http: c.expected_http,
    actual_http: observed,
    expected_rules: c.expected_rules,
    actual_rules: rules,
    severity: c.severity ?? "high",
    rule_type: rules[0]?.split(".")[0] ?? "contract",
    result: passed ? "PASS" : "FAIL",
    validation: issues.length ? "FAIL" : "PASS",
    issues,
    evidence: {
      scenario_id: c.scenario_id,
      resource_type: kind,
      resource_id: id,
      interface: c.interface,
      decision,
      expected_decision: c.expected_decision,
      rules,
      input_fragment: parsed ?? c.input_json.slice(0, 300),
      issues,
    },
  };
}
export function validateHealthcare(payload: Data): Data {
  validateSchema(payload, spec.schema);
  const data = clone(payload);
  for (const c of data.scenarios) {
    c.simulated_http ??= null;
    c.severity ??= "high";
  }
  requireInput(
    new Set(data.resources.map((r: Data) => r.resourceType + "/" + r.id))
      .size === data.resources.length,
    "Duplicate resource key",
  );
  requireInput(
    new Set(data.scenarios.map((s: Data) => s.scenario_id)).size ===
      data.scenarios.length,
    "Duplicate scenario ID",
  );
  const rows = data.scenarios.map((c: Data) =>
      validateHealthcareMessage(c, data.resources),
    ),
    checks = new Checks();
  for (const r of rows)
    checks.add(
      r.actual_rules.join(",") || "contract.accept",
      r.scenario_id,
      r.result === "PASS",
      `${r.expected} / HTTP ${r.expected_http} / ${pystr(r.expected_rules)}`,
      `${r.actual} / HTTP ${r.actual_http} / ${pystr(r.actual_rules)}`,
      r.severity,
      dumps(r.evidence, false, false),
    );
  const mode =
    dumps(data, true) === dumps(spec.fixture, true)
      ? "baseline"
      : dumps(data, true) === dumps(spec.regression, true)
        ? "controlled"
        : "custom";
  const interfaces = clone(spec.contracts).map((i: Data) => {
    const matching = rows.filter((r: Data) => r.interface === i.id);
    return {
      ...i,
      result: matching.some((r: Data) => r.result === "FAIL")
        ? "FAIL"
        : matching.length
          ? "PASS"
          : "NOT TESTED",
      scenario_count: matching.length,
      example_payload:
        data.resources.find((r: Data) => r.resourceType === i.resource) ?? null,
    };
  });
  const index = Object.fromEntries(
    data.resources.map((r: Data) => [r.resourceType + "/" + r.id, r]),
  );
  const graph = Object.entries(index).flatMap(([key, r]) =>
    refs(r as Data).map(([field, kind, ref]) => ({
      source: key,
      field,
      reference: ref,
      expected_target: kind,
      resolved_target: index[ref]?.resourceType === kind ? ref : null,
      status: index[ref]?.resourceType === kind ? "PASS" : "FAIL",
    })),
  );
  const result = report("healthcare-integration", data, checks, [], {
    scenarios: rows,
    interfaces,
    references: graph,
    configuration: mode,
    input: data,
    change:
      mode === "controlled"
        ? {
            source: "controlled-regression",
            resource: "Observation/o001",
            field: "subject.reference",
            expected: "Patient/p001",
            actual: "Patient/p999",
          }
        : null,
  });
  return {
    ...result,
    ruleset: RULESET,
    scenario_count: rows.length,
    passed_scenarios: result.passed,
    failed_scenarios: result.failed,
    discrepancy_count: result.discrepancies.length,
    interfaces_tested: new Set(rows.map((r: Data) => r.interface)).size,
    resources_processed: data.resources.length,
  };
}
