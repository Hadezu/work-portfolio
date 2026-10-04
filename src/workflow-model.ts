import {matchesDimensions} from './fact-filters';
export type Evidence = { actor: string; roles: string[]; inherited_roles: string[]; resource: string; action: string; request_id: string | null; current_state: string | null; requested_transition: string | null; approvals_found: { actor: string; role: string; order: number }[]; approvals_required: string[]; evaluated_rule: string; policy_source: string; preconditions: string };
export type ScenarioRow = { scenario_id: string; name: string; user: string; roles: string[]; resource: string; action: string; preconditions: string; expected: string; actual: string; expected_rule: string; rule: string; rule_type: string; severity: string; result: string; evidence: Evidence };
export type MatrixCell = { role: string; resource: string; action: string; allowed: boolean; expected_allowed?: boolean; deviation?: boolean; change_source?: string; source: string; inherited_by: string[] };
export type WorkflowReport = { run_id: string; timestamp: string; ruleset: string; scenario_count: number; passed_scenarios: number; failed_scenarios: number; discrepancy_count: number; overall_status: string; input_sha256: string; artifacts: { configuration?: 'baseline'|'controlled'|'custom'; scenarios: ScenarioRow[]; matrix: MatrixCell[]; workflow: { states: string[]; edges: [string,string][] } } };
export type Filters = { status: string; severity: string; type: string; search: string };
export function filterScenarios(rows: ScenarioRow[], filters: Filters) {
  return rows.filter(r => matchesDimensions(r,{status:filters.status,severity:filters.severity,type:filters.type},(row,key)=>key==='status'?row.result:key==='type'?row.rule_type:row.severity) && JSON.stringify(r).toLocaleLowerCase('pl').includes(filters.search.toLocaleLowerCase('pl')));
}
