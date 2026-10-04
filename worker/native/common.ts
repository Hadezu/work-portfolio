import { createHash } from "node:crypto";
// Dynamic JSON is checked by the exported Pydantic contract before domain execution.
export type Data = Record<string, any>;
export const AS_OF = "2026-09-16T12:00:00Z";
export const clone = <T>(v: T): T => structuredClone(v);
export function dumps(v: any, sort = false, ascii = true): string {
  if (v === null) return "null";
  if (Array.isArray(v))
    return "[" + v.map((x) => dumps(x, sort, ascii)).join(", ") + "]";
  if (typeof v === "object")
    return (
      "{" +
      (sort ? Object.keys(v).sort() : Object.keys(v))
        .map((k) => dumps(k, sort, ascii) + ": " + dumps(v[k], sort, ascii))
        .join(", ") +
      "}"
    );
  let out = JSON.stringify(v);
  if (out === undefined) throw Error("Undefined JSON value");
  if (ascii)
    out = out.replace(
      /[\u007f-\uffff]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
  return out;
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function pystr(v: any): string {
  if (v === null) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Array.isArray(v))
    return (
      "[" +
      v
        .map((x) => (typeof x === "string" ? "'" + x + "'" : pystr(x)))
        .join(", ") +
      "]"
    );
  if (typeof v === "object")
    return (
      "{" +
      Object.entries(v)
        .map(
          ([k, x]) =>
            "'" +
            k +
            "': " +
            (typeof x === "string" ? "'" + x + "'" : pystr(x)),
        )
        .join(", ") +
      "}"
    );
  return String(v);
}
export class InputError extends Error {
  status = 422;
}
export function requireInput(
  condition: unknown,
  message = "Input does not match contract",
): asserts condition {
  if (!condition) throw new InputError(message);
}
export function validateSchema(
  value: any,
  schema: Data,
  root = schema,
  path = "$",
): void {
  if (schema.$ref) {
    const key = schema.$ref.split("/").at(-1);
    return validateSchema(value, root.$defs[key], root, path);
  }
  if (schema.anyOf || schema.oneOf) {
    requireInput(
      (schema.anyOf ?? schema.oneOf).some((s: Data) => {
        try {
          validateSchema(value, s, root, path);
          return true;
        } catch {
          return false;
        }
      }),
      path + ": invalid union",
    );
    return;
  }
  if (schema.const !== undefined)
    requireInput(value === schema.const, path + ": invalid constant");
  if (schema.enum)
    requireInput(schema.enum.includes(value), path + ": invalid enum");
  const type = schema.type;
  if (type === "object") {
    requireInput(
      value !== null && typeof value === "object" && !Array.isArray(value),
      path + ": object required",
    );
    for (const k of schema.required ?? [])
      requireInput(k in value, path + ": missing " + k);
    if (schema.additionalProperties === false)
      for (const k of Object.keys(value))
        requireInput(k in (schema.properties ?? {}), path + ": unknown " + k);
    for (const [k, v] of Object.entries(value))
      if (schema.properties?.[k])
        validateSchema(v, schema.properties[k], root, path + "." + k);
  }
  if (type === "array") {
    requireInput(Array.isArray(value), path + ": array required");
    requireInput(
      value.length >= (schema.minItems ?? 0) &&
        value.length <= (schema.maxItems ?? 10000),
      path + ": record limit",
    );
    value.forEach((v: any, i: number) =>
      validateSchema(v, schema.items ?? {}, root, path + "[" + i + "]"),
    );
  }
  if (type === "string") {
    requireInput(typeof value === "string", path + ": string required");
    requireInput(
      value.length >= (schema.minLength ?? 0) &&
        value.length <= (schema.maxLength ?? 1000000),
      path + ": length limit",
    );
    if (schema.pattern)
      requireInput(new RegExp(schema.pattern).test(value), path + ": pattern");
  }
  if (type === "boolean")
    requireInput(typeof value === "boolean", path + ": boolean required");
  if (type === "integer" || type === "number") {
    requireInput(
      typeof value === "number" &&
        Number.isFinite(value) &&
        (type !== "integer" || Number.isInteger(value)),
      path + ": number required",
    );
    requireInput(
      value >= (schema.minimum ?? -Infinity) &&
        value <= (schema.maximum ?? Infinity),
      path + ": number range",
    );
  }
  if (type === "null") requireInput(value === null, path + ": null required");
}
export type Check = {
  rule: string;
  record: string;
  expected: string;
  actual: string;
  status: string;
  severity: string;
  evidence: string;
  action: string;
};
export class Checks {
  items: Check[] = [];
  add(
    rule: string,
    record: any,
    condition: boolean,
    expected: any,
    actual: any,
    severity = "high",
    evidence = "",
    action = "Zweryfikować dane źródłowe i ponowić uzgodniony test.",
  ) {
    this.items.push({
      rule,
      record: pystr(record),
      expected: pystr(expected),
      actual: pystr(actual),
      status: condition ? "PASS" : "FAIL",
      severity,
      evidence: evidence || pystr(record),
      action,
    });
  }
}
export function report(
  lab: string,
  payload: Data,
  checks: Checks,
  normalized: any[] = [],
  artifacts: Data = {},
): Data {
  const digest = hash(dumps(payload, true));
  const failed = checks.items.filter((x) => x.status === "FAIL");
  return {
    run_id: lab + "-" + digest.slice(0, 12),
    source: lab,
    timestamp: AS_OF,
    input_sha256: digest,
    checks_executed: checks.items.length,
    passed: checks.items.length - failed.length,
    failed: failed.length,
    warnings: failed.filter((x) => x.severity === "warning").length,
    overall_status: failed.length ? "FAIL" : "PASS",
    checks: checks.items,
    discrepancies: failed,
    normalized,
    artifacts,
    reproduction:
      "POST /lab-api/" +
      lab +
      "/validate with the same JSON input; evaluation clock: " +
      AS_OF,
  };
}
