import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const oracle = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("../tests/native/python-oracle.json.gz", import.meta.url),
    ),
  ).toString(),
) as Record<string, { input: any; report: any }[]>;
import { validateTransit, transitRealtime } from "../worker/native/transit";
import Gtfs from "gtfs-realtime-bindings";
test("native Transit matches every Python validation check and scenario", () => {
  for (const row of oracle["transit-validation"]) {
    const actual = validateTransit(row.input),
      expected: any = structuredClone(row.report);
    expected.input_sha256 = actual.input_sha256;
    expected.run_id = actual.run_id;
    expect(actual).toEqual(expected);
  }
});
test("native Transit decodes real protobuf and rejects XML entities", () => {
  const msg = Gtfs.transit_realtime.FeedMessage.create({
    header: { gtfsRealtimeVersion: "2.0", timestamp: 1789560000 },
  });
  const bytes = Gtfs.transit_realtime.FeedMessage.encode(msg).finish();
  expect(
    transitRealtime(Buffer.from(bytes).toString("base64")).header
      .gtfs_realtime_version,
  ).toBe("2.0");
  expect(() => transitRealtime("not protobuf")).toThrow();
  const input = structuredClone(oracle["transit-validation"][0].input);
  input.netex =
    '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><x>&x;</x>';
  expect(
    validateTransit(input).discrepancies.some(
      (c: any) => c.rule === "xml_parse",
    ),
  ).toBe(true);
});
import { validateErp, recoverErp } from "../worker/native/erp";
test("native ERP matches Python decisions, history and reconciliation (storage adapter differs)", () => {
  for (const row of oracle["erp-sync"]) {
    const actual = validateErp(row.input),
      expected: any = structuredClone(row.report);
    delete actual.artifacts.sync_state;
    delete expected.artifacts.sql_state;
    expected.reproduction = expected.reproduction.replace(
      "SQLite snapshot",
      "transaction snapshot",
    );
    expect(actual).toEqual(expected);
  }
});
test("native ERP restores transaction state and repairs the selected mapping", () => {
  const run = validateErp({ configuration: "controlled" });
  expect(run.failed).toBe(1);
  const unchanged = recoverErp(run, "evt-104");
  expect(unchanged.failed).toBe(1);
  const fixed = recoverErp(run, "evt-104", true);
  expect(fixed.failed).toBe(0);
  expect(fixed.reconciliation_differences).toBe(0);
  expect(fixed.retried).toBe(1);
  expect(run.failed).toBe(1);
});
import { validateOperations } from "../worker/native/operations";
test("native Operations matches Python source trace, rules and reports", () => {
  for (const row of oracle["operations-exceptions"])
    expect(validateOperations(row.input)).toEqual(row.report);
});
import { validateWorkflow } from "../worker/native/workflow";
import { validateQuality, qualityComparison } from "../worker/native/quality";
import { validateHealthcare, strictJson } from "../worker/native/healthcare";
test("native Healthcare exactly matches Python contracts, evidence and graph", () => {
  for (const row of oracle["healthcare-integration"])
    expect(validateHealthcare(row.input)).toEqual(row.report);
});
test("strict JSON rejects duplicate keys and malformed payloads", () => {
  expect(() => strictJson('{"id":1,"id":2}')).toThrow();
  expect(() => strictJson("{")).toThrow();
  expect(strictJson('{"x":[true,null,2]}')).toEqual({ x: [true, null, 2] });
});
test("native Data Quality matches Python outputs for every supplied case", () => {
  for (const row of oracle["data-quality"])
    expect(validateQuality(row.input)).toEqual(row.report);
});
test("native Data Quality comparison detects exactly one field and root", () => {
  const rows = oracle["data-quality"];
  const a = validateQuality(rows.at(-2)!.input),
    b = validateQuality(rows.at(-1)!.input);
  const diff = qualityComparison(a, b);
  expect(diff.changed_fields).toBe(1);
  expect(diff.new_failures).toHaveLength(1);
  expect(b.failed).toBe(1);
});
test("native lookup tables reject JavaScript prototype names as unknown references", () => {
  const input = structuredClone(oracle["data-quality"].at(-2)!.input);
  input.content = input.content.replaceAll("C-001", "constructor");
  const result = validateQuality(input);
  expect(result.artifacts.failures.some((failure:any) => failure.rule === "quality.reference.customer")).toBe(true);
});
test("native Workflow exactly matches Python reports for reference and regression", () => {
  for (const row of oracle["workflow-access"])
    expect(validateWorkflow(row.input)).toEqual(row.report);
});
test("native Workflow evaluates changed inputs, not canned reports", () => {
  const input = structuredClone(oracle["workflow-access"][0].input);
  input.users[0].status = "inactive";
  const result = validateWorkflow(input);
  expect(result.artifacts.scenarios[0].actual).toBe("DENY");
  expect(result.artifacts.scenarios[0].rule).toBe("rbac.user.inactive");
  expect(result.overall_status).toBe("FAIL");
});
