import reference from "./reference.json";
import {migrationEndpoint} from './migration';
import {revenueEndpoint} from './revenue-api';
import openapi from "./openapi.json";
import { type Data, requireInput, InputError } from "./common";
import { csvEncode } from "./tabular";
import { validateWorkflow, workflowFixture } from "./workflow";
import {
  validateHealthcare,
  healthcareFixture,
  healthcareRegression,
} from "./healthcare";
import { validateErp, erpFixture, erpRegression, recoverErp } from "./erp";
import {
  validateOperations,
  operationsFixture,
  operationsRegression,
} from "./operations";
import {
  validateQuality,
  qualityFixture,
  qualityRegression,
  qualityComparison,
} from "./quality";
import { validateTransit, transitFixture, transitRegression } from "./transit";
import type { ReportRepository } from "./storage";
const specs = reference as Data;
const modules: Record<
  string,
  {
    fixture: (format?: string) => Data;
    regression: () => Data;
    validate: (data: Data) => Data;
  }
> = {
  "workflow-access": {
    fixture: workflowFixture,
    regression: () => structuredClone(specs["workflow-access"].regression),
    validate: validateWorkflow,
  },
  "healthcare-integration": {
    fixture: healthcareFixture,
    regression: healthcareRegression,
    validate: validateHealthcare,
  },
  "erp-sync": {
    fixture: erpFixture,
    regression: erpRegression,
    validate: validateErp,
  },
  "operations-exceptions": {
    fixture: operationsFixture,
    regression: operationsRegression,
    validate: validateOperations,
  },
  "data-quality": {
    fixture: qualityFixture,
    regression: qualityRegression,
    validate: validateQuality,
  },
  "transit-validation": {
    fixture: transitFixture,
    regression: transitRegression,
    validate: validateTransit,
  },
};
export function apiJson(value: unknown, status = 200): Response {
  const text = JSON.stringify(value);
  if (new TextEncoder().encode(text).length > 2_000_000)
    throw new RangeError("Response limit");
  return new Response(text, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function reportCsv(result: Data): Response {
  const keys =
    result.source === "transit-validation"
      ? []
      : [
          "run_id",
          "timestamp",
          "ruleset",
          "scenario_count",
          "passed_scenarios",
          "failed_scenarios",
          "discrepancy_count",
          "overall_status",
        ];
  const extra: Record<string, string[]> = {
    "data-quality": [
      "records_received",
      "records_processed",
      "accepted",
      "rejected",
      "quality_checks",
      "quality_failures",
      "transformation_failures",
      "controlled_regressions",
    ],
    "operations-exceptions": [
      "records_checked",
      "controls_executed",
      "exceptions_detected",
      "high",
      "medium",
      "low",
      "resolved",
      "unresolved",
    ],
    "erp-sync": [
      "source_records",
      "target_records",
      "created",
      "updated",
      "no_op",
      "rejected",
      "retried",
      "exceptions",
      "reconciliation_differences",
    ],
    "healthcare-integration": ["interfaces_tested", "resources_processed"],
  };
  keys.push(...(extra[result.source] ?? []));
  const meta = Object.fromEntries(keys.map((k) => [k, result[k]])),
    fields = [
      ...keys,
      "rule",
      "record",
      "expected",
      "actual",
      "status",
      "severity",
      "evidence",
      "action",
    ];
  const rows = result.checks.map((row: Data) =>
    Object.fromEntries(
      Object.entries({ ...meta, ...row }).map(([k, v]) => [
        k,
        /^[=+\-@]/.test(String(v)) ? "'" + v : v,
      ]),
    ),
  );
  return new Response(csvEncode(rows, fields), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="acceptance.csv"',
      "cache-control": "no-store",
    },
  });
}
export async function nativeApi(
  request: Request,
  repo: ReportRepository,
): Promise<Response> {
  try {
    if(new URL(request.url).pathname.startsWith('/lab-api/migration/')) return await migrationEndpoint(request,repo);
    if(new URL(request.url).pathname.startsWith('/lab-api/revenue-bi/')) return await revenueEndpoint(request,repo,apiJson);
    const url = new URL(request.url),
      path = url.pathname
        .slice("/lab-api/".length)
        .split("/")
        .map(decodeURIComponent),
      [lab, action, id, detail, other] = path;
    const method = request.method;
    if (method === "GET" && lab === "openapi.json") return apiJson(openapi);
    if (method === "GET" && lab === "docs")
      return new Response(
        '<!doctype html><html lang="pl"><meta charset="utf-8"><title>Kontrakty API — Ivan Matiushkin</title><h1>Kontrakty API demonstracji</h1><p>TypeScript Workers + D1 · referencja Python/FastAPI · dane syntetyczne.</p><p><a href="/lab-api/openapi.json">Pobierz OpenAPI JSON</a></p><pre id="schema"></pre><script>fetch("/lab-api/openapi.json").then(r=>r.json()).then(v=>document.getElementById("schema").textContent=JSON.stringify(v,null,2))</script></html>',
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    if (method === "GET" && lab === "health")
      return apiJson({
        status: "ok",
        labs: Object.keys(modules),
        mode: "synthetic/test only",
        runtime: "worker-native",
      });
    const module = modules[lab];
    if (!module) throw new HttpError(404, "Unknown lab");
    const save = async (result: Data) => {
      await repo.put(result);
      return result;
    };
    const get = async (runId: string) => {
      const result = await repo.get(lab, runId);
      if (!result) throw new HttpError(404, "Unknown run");
      return result;
    };
    if (
      method === "GET" &&
      ["fixture", "fixtures"].includes(action) &&
      path.length === 2
    ) {
      const format = url.searchParams.get("format") ?? undefined;
      requireInput(
        !format || ["csv", "json"].includes(format),
        "Use csv or json",
      );
      return apiJson(module.fixture(format));
    }
    if (method === "GET" && action === "scenarios" && path.length === 2)
      return apiJson(
        specs[lab].scenarios.map((s: Data) => ({
          id: s.id,
          expected_rule: s.expected_rule,
        })),
      );
    if (
      method === "GET" &&
      action === "resources" &&
      lab === "healthcare-integration" &&
      path.length === 4
    ) {
      const resource = healthcareFixture().resources.find(
        (r: Data) => r.resourceType === id && r.id === detail,
      );
      if (!resource) throw new HttpError(404, "Unknown synthetic resource");
      return apiJson(resource);
    }
    if (method === "GET" && action === "runs") {
      if (path.length === 2) return apiJson(await repo.list(lab));
      const result = await get(id);
      if (path.length === 3) return apiJson(result);
      if (detail === "report" && path.length === 4) {
        const format = url.searchParams.get("format") ?? "json";
        requireInput(["json", "csv"].includes(format), "Use json or csv");
        return format === "json" ? apiJson(result) : reportCsv(result);
      }
      if (detail === "discrepancies" && path.length === 4)
        return apiJson(result.discrepancies);
      if (
        ["exceptions", "reconciliation", "failures"].includes(detail) &&
        path.length === 4 &&
        Array.isArray(result.artifacts[detail])
      )
        return apiJson(result.artifacts[detail]);
      if (lab === "data-quality" && detail === "lineage" && path.length === 5) {
        const rows = result.artifacts.lineage.filter(
          (r: Data) => r.record_id === other,
        );
        if (!rows.length)
          throw new HttpError(404, "No field lineage for this record");
        return apiJson(rows);
      }
      if (
        lab === "data-quality" &&
        detail === "comparison" &&
        path.length === 5
      )
        return apiJson(qualityComparison(result, await get(other)));
      throw new HttpError(404, "Unknown result endpoint");
    }
    if (method !== "POST") throw new HttpError(404, "Unknown endpoint");
    const text = await request.text();
    requireInput(
      !text ||
        request.headers.get("content-type")?.split(";")[0] ===
          "application/json",
      "JSON required",
    );
    const body = text ? JSON.parse(text) : {};
    requireInput(
      body && typeof body === "object" && !Array.isArray(body),
      "Object required",
    );
    if (
      action === "regression" &&
      ["inject", "reset"].includes(id) &&
      path.length === 3
    )
      return apiJson(
        await save(
          module.validate(
            id === "inject" ? module.regression() : module.fixture(),
          ),
        ),
      );
    if (lab === "erp-sync" && action === "retry" && path.length === 3) {
      requireInput(
        typeof body.run_id === "string" &&
          Object.keys(body).every((k) =>
            ["run_id", "repair_mapping"].includes(k),
          ) &&
          (body.repair_mapping === undefined ||
            typeof body.repair_mapping === "boolean"),
        "Retry contract",
      );
      const previous = await get(body.run_id);
      let recovered: Data;
      try {
        recovered = recoverErp(previous, id, body.repair_mapping ?? false);
      } catch (error) {
        if (error instanceof InputError)
          throw new HttpError(409, error.message);
        throw error;
      }
      return apiJson(await save(recovered));
    }
    if (
      action === "scenarios" &&
      id === "run" &&
      ["workflow-access", "healthcare-integration"].includes(lab)
    )
      return apiJson(
        await save(
          module.validate(
            lab === "workflow-access" ? module.regression() : module.fixture(),
          ),
        ),
      );
    if (action === "scenarios" && path.length === 3) {
      const selected = specs[lab].scenarios.filter(
        (s: Data) => id === "all" || s.id === id,
      );
      if (!selected.length) throw new HttpError(404, "Unknown scenario");
      const results = [];
      for (const s of selected) {
        const run = await save(module.validate(s.input)),
          rules = [
            ...new Set<string>(run.discrepancies.map((c: Data) => c.rule)),
          ].sort(),
          ok =
            s.expected_rule === null
              ? !rules.length
              : rules.includes(s.expected_rule);
        results.push({
          scenario: s.id,
          expected: s.expected_rule ?? "no discrepancies",
          actual: rules.length ? rules : ["no discrepancies"],
          status: ok ? "PASS" : "FAIL",
          severity: ok ? "info" : "high",
          run,
          input: s.input,
        });
      }
      return apiJson(results);
    }
    if (["run", "validate", "evaluate"].includes(action) && path.length === 2) {
      requireInput(
        Object.keys(body).length === 1 &&
          body.data &&
          typeof body.data === "object" &&
          !Array.isArray(body.data),
        "Expected data object",
      );
      return apiJson(await save(module.validate(body.data)));
    }
    throw new HttpError(404, "Unknown endpoint");
  } catch (error) {
    if (error instanceof HttpError)
      return apiJson({ detail: error.message }, error.status);
    if (error instanceof RangeError)
      return apiJson({ error: "payload_or_report_too_large" }, 413);
    if (
      error instanceof InputError ||
      error instanceof SyntaxError ||
      error instanceof TypeError
    )
      return apiJson(
        {
          error: "invalid_request",
          detail:
            error instanceof InputError
              ? error.message.slice(0, 250)
              : "Input does not match the documented contract",
        },
        422,
      );
    console.error(
      "native_api_failure",
      error instanceof Error ? error.name : "unknown",
    );
    return apiJson({ error: "execution_failed" }, 500);
  }
}
