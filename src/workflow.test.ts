import { createElement } from 'react';
import { renderToStaticMarkup } from './test-render';
import { expect,test } from 'vitest';
import { filterScenarios,type ScenarioRow,type WorkflowReport } from './workflow-model';
import { EvidenceView,PermissionMatrix,ResultSummary,ScenarioTable } from './WorkflowViews';
const row:ScenarioRow={scenario_id:'missing',name:'Brak roli',user:'u1',roles:['employee'],resource:'configuration',action:'administer',preconditions:'active',expected:'DENY',actual:'ALLOW',expected_rule:'rbac.permission.missing',rule:'rbac.grant',rule_type:'rbac',severity:'high',result:'FAIL',evidence:{actor:'u1',roles:['employee'],inherited_roles:[],resource:'configuration',action:'administer',request_id:null,current_state:null,requested_transition:null,approvals_found:[],approvals_required:[],evaluated_rule:'rbac.grant',policy_source:'workflow-access/1.0.0',preconditions:'active'}};
const rows=[row,{...row,scenario_id:'denied',actual:'DENY',result:'PASS',rule_type:'approval'}];
test('scenario filters combine status, type, priority and evidence search',()=>{
  expect(filterScenarios(rows,{status:'FAIL',type:'rbac',severity:'high',search:'u1'})).toEqual([row]);
  expect(filterScenarios(rows,{status:'PASS',type:'ALL',severity:'ALL',search:''})).toHaveLength(1);
  expect(filterScenarios(rows,{status:'ALL',type:'rbac',severity:'warning',search:''})).toEqual([]);
  expect(filterScenarios(rows,{status:'ALL',type:'ALL',severity:'ALL',search:'unknown'})).toEqual([]);
});
test('rendering keeps business decision separate from scenario result',()=>{
  const html=renderToStaticMarkup(createElement(ScenarioTable,{rows,onEvidence:()=>{},onRerun:()=>{}}));
  for(const text of ['DENY','ALLOW','PASS','FAIL','Oczekiwane','Rzeczywiste','Wynik testu','Dowód','Ponów'])expect(html).toContain(text);
});
test('matrix exposes permission source through selectable cells',()=>{
  const html=renderToStaticMarkup(createElement(PermissionMatrix,{cells:[{role:'employee',resource:'document',action:'view',allowed:true,source:'roles.employee',inherited_by:['readers']}],onSelect:()=>{}}));
  expect(html).toContain('pracownik document/view: ALLOW');expect(html).toContain('button');
});
test('evidence is escaped and includes structured decision context',()=>{
  const html=renderToStaticMarkup(createElement(EvidenceView,{value:{...row.evidence,note:'<script>alert(1)</script>'}}));
  expect(html).toContain('evaluated_rule');expect(html).toContain('approvals_found');expect(html).not.toContain('<script>');
});
test('acceptance summary renders actual report totals',()=>{
  const report={scenario_count:1,passed_scenarios:0,failed_scenarios:1,discrepancy_count:1,overall_status:'FAIL'} as WorkflowReport;
  const html=renderToStaticMarkup(createElement(ResultSummary,{report}));
  expect(html).toContain('1 scenariusz');expect(html).toContain('1 rozbieżność');expect(html).toContain('FAIL');
});
