export type MigrationStage = 'loaded' | 'validated' | 'mapped' | 'migrated' | 'corrected' | 'replayed' | 'reconciled';
export type MigrationAction = 'validate' | 'mapping' | 'migrate' | 'correct' | 'replay' | 'reconcile';
export type MigrationRow = Record<string, string>;
export type MigrationException = {record: string; rule: string; expected: unknown; actual: unknown};
export type MigrationComparison = {record: string; status: string; expected: Record<string, unknown>; actual: Record<string, unknown> | null; differences: Record<string, {expected: unknown; actual: unknown}>};
export type MigrationRun = {
  run_id: string; source: 'migration'; parent_run: string | null; timestamp: string;
  ruleset: string; synthetic: true; stage: MigrationStage; overall_status: string;
  filename: string; input_sha256: string; content: string; rows: MigrationRow[];
  validation: {accepted: number; rejected: number; failures: MigrationException[]; lineage: unknown[]; normalized: Record<string, string | null>[]} | null;
  mappings: {kind: string; source: string; target: string}[];
  exceptions: MigrationException[];
  target: Record<string, unknown>[];
  comparisons: MigrationComparison[];
  totals: {source_count: number; target_count: number; source_gross: string; target_gross: string; currency: 'PLN'} | null;
  attempts: {phase: string; selected: string[]; skipped: string[]; writes: number; results: {record: string; result: string; target_write: boolean}[]}[];
  audit: {action: string; run_id: string; timestamp: string; detail: string}[];
  checks: {rule: string; expected: unknown; actual: unknown; status: string}[];
  // Persisted only by the server; transitions accept a parent ID, never client state.
  state: Record<string, unknown>;
  financials: Record<string, Record<string, string | null>>;
};
