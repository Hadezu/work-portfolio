import { expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { D1Reports } from "../worker/native/storage";
import { nativeApi } from "../worker/native/api";
import { labGateway } from "../worker/lab-gateway";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL(
        "../backend/cloudflare/migrations/0001_demo_runs.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const binding = {
    prepare(sql: string) {
      let params: any[] = [];
      return {
        bind(...values: any[]) {
          params = values;
          return this;
        },
        async run() {
          sqlite.prepare(sql).run(...params);
          return { success: true };
        },
        async first() {
          return sqlite.prepare(sql).get(...params) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...params), success: true };
        },
      };
    },
  } as D1Database;
  return { sqlite, binding };
}
test("D1 SQL contract isolates sessions, scopes labs and expires/cleans at 24h", async () => {
  const { sqlite, binding } = database();
  let now = 100000;
  const a = new D1Reports(binding, "a", () => now),
    b = new D1Reports(binding, "b", () => now);
  try {
    const report = { run_id: "r", source: "data-quality", checks: [] };
    await a.put(report);
    expect(await a.get("data-quality", "r")).toEqual(report);
    expect(await b.get("data-quality", "r")).toBeNull();
    expect(await a.get("other-lab", "r")).toBeNull();
    expect(await b.list("data-quality")).toEqual([]);
    now += 86400;
    expect(await a.get("data-quality", "r")).toBeNull();
    await a.cleanup();
    expect(sqlite.prepare("SELECT count(*) AS n FROM demo_runs").get()?.n).toBe(
      0,
    );
    await expect(
      a.put({ ...report, large: "x".repeat(1500000) }),
    ).rejects.toThrow();
  } finally {
    sqlite.close();
  }
});
test("native REST baseline, single regression, reports and restoration for all six labs", async () => {
  const { sqlite, binding } = database(),
    repo = new D1Reports(binding, "api");
  const request = (path: string, body?: unknown) =>
    nativeApi(
      new Request("https://work.matiushkin.com/lab-api/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      repo,
    );
  try {
    for (const lab of [
      "transit-validation",
      "workflow-access",
      "healthcare-integration",
      "erp-sync",
      "operations-exceptions",
      "data-quality",
    ]) {
      const fixture = await request(lab + "/fixtures");
      expect(fixture.status).toBe(200);
      expect(fixture.headers.get("content-type")).toContain("application/json");
      const baseline = (await (
        await request(lab + "/validate", { data: await fixture.json() })
      ).json()) as any;
      expect(baseline.overall_status).toBe("PASS");
      const bad = (await (
        await request(lab + "/regression/inject", {})
      ).json()) as any;
      expect(bad.failed).toBe(1);
      expect(bad.discrepancies[0].evidence).toBeTruthy();
      const stored = await (await request(lab + "/runs/" + bad.run_id)).json();
      expect(stored).toEqual(bad);
      expect(
        (
          await request(lab + "/runs/" + bad.run_id + "/report?format=csv")
        ).headers.get("content-type"),
      ).toContain("text/csv");
      const restored = (await (
        await request(lab + "/regression/reset", {})
      ).json()) as any;
      expect(restored.overall_status).toBe("PASS");
      expect(restored.run_id).toBe(baseline.run_id);
    }
    expect((await request("unknown")).status).toBe(404);
    expect((await request("data-quality/runs/unknown")).status).toBe(404);
    expect((await request("data-quality/run", { data: [] })).status).toBe(422);
    expect((await request("data-quality/fixtures?format=xlsx")).status).toBe(
      422,
    );
  } finally {
    sqlite.close();
  }
});
test("native gateway bounds bodies, rejects invalid content and keeps opaque sessions", async () => {
  const { sqlite, binding } = database();
  let calls = 0;
  const env = {
    LAB_API: {
      fetch: async (r: Request) => {
        calls++;
        return nativeApi(
          r,
          new D1Reports(binding, r.headers.get("x-lab-session")!),
        );
      },
    },
    LAB_READS: { limit: async () => ({ success: true }) },
    LAB_MUTATIONS: { limit: async () => ({ success: true }) },
  };
  try {
    const first = await labGateway(
      new Request("https://work.matiushkin.com/lab-api/data-quality/fixtures"),
      env,
    );
    expect(first.status).toBe(200);
    expect(first.headers.get("set-cookie")).toContain(
      "Secure; HttpOnly; SameSite=Strict",
    );
    const invalid = await labGateway(
      new Request("https://work.matiushkin.com/lab-api/data-quality/run", {
        method: "POST",
        body: "{}",
      }),
      env,
    );
    expect(invalid.status).toBe(422);
    const before = calls;
    expect(
      (
        await labGateway(
          new Request("https://work.matiushkin.com/lab-api/data-quality/run", {
            method: "POST",
            body: "x".repeat(1000001),
          }),
          env,
        )
      ).status,
    ).toBe(413);
    expect(calls).toBe(before);
    expect(
      (
        await labGateway(
          new Request("https://work.matiushkin.com/lab-api/data-quality/run", {
            method: "POST",
          }),
          {
            ...env,
            LAB_MUTATIONS: { limit: async () => ({ success: false }) },
          },
        )
      ).status,
    ).toBe(429);
  } finally {
    sqlite.close();
  }
});
