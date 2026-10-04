import type { Data } from "./common";
export const RETENTION_SECONDS = 86400;
export interface ReportRepository {
  put(report: Data): Promise<void>;
  get(lab: string, id: string): Promise<Data | null>;
  list(lab: string): Promise<Data[]>;
  cleanup(): Promise<void>;
}
export class D1Reports implements ReportRepository {
  constructor(
    private db: D1Database,
    private session: string,
    private clock = () => Math.floor(Date.now() / 1000),
  ) {}
  async put(report: Data) {
    const encoded = JSON.stringify(report);
    if (new TextEncoder().encode(encoded).length > 1_500_000)
      throw new RangeError("Report exceeds demo size limit");
    await this.db
      .prepare("INSERT OR REPLACE INTO demo_runs VALUES(?,?,?,?,?)")
      .bind(this.session, report.run_id, report.source, encoded, this.clock())
      .run();
  }
  async get(lab: string, id: string): Promise<Data | null> {
    const row = await this.db
      .prepare(
        "SELECT report FROM demo_runs WHERE session_id=? AND run_id=? AND lab=? AND created_at>?",
      )
      .bind(this.session, id, lab, this.clock() - RETENTION_SECONDS)
      .first<{ report: string }>();
    return row ? JSON.parse(row.report) : null;
  }
  async list(lab: string): Promise<Data[]> {
    const rows = await this.db
      .prepare(
        "SELECT report FROM demo_runs WHERE session_id=? AND lab=? AND created_at>? ORDER BY created_at DESC,run_id LIMIT 30",
      )
      .bind(this.session, lab, this.clock() - RETENTION_SECONDS)
      .all<{ report: string }>();
    return rows.results.map((row) => JSON.parse(row.report));
  }
  async cleanup() {
    await this.db
      .prepare("DELETE FROM demo_runs WHERE created_at<=?")
      .bind(this.clock() - RETENTION_SECONDS)
      .run();
  }
}
