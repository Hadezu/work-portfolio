import {createElement} from 'react';
import {renderToStaticMarkup} from './test-render';
import {expect,test} from 'vitest';
import {filterHealthcare,initialHealthcareFilters,type HealthcareScenario,type HealthcareReport,type HealthcareInterface} from './healthcare-model';
import {HealthcareTable,HealthcareSummary,InterfaceMatrix,ReferenceGraph} from './HealthcareViews';
import {EvidenceView} from './WorkflowViews';
const row:HealthcareScenario={scenario_id:'unknown',name:'Nieznana referencja Patient',interface:'IF-Observation',resource_type:'Observation',resource_id:'o001',input:'{}',preconditions:'synthetic',expected:'ACCEPT',actual:'REJECT',expected_http:201,actual_http:422,expected_rules:[],actual_rules:['reference.patient'],severity:'high',rule_type:'reference',result:'FAIL',validation:'FAIL',issues:[{rule:'reference.patient',expected:'Patient reference resolves',actual:'Patient/p999 not found or wrong type',severity:'high',evidence:{reference:'Patient/p999',resolved_target:null}}],evidence:{reference:'Patient/p999',resolved_target:null}};
test('Healthcare combined status, resource, severity, rule and search filters',()=>{
  const rows=[row,{...row,result:'PASS',scenario_id:'negative',expected:'REJECT'}];
  expect(filterHealthcare(rows,{...initialHealthcareFilters,status:'FAIL',resource:'Observation',rule:'reference',severity:'high',search:'p999'})).toEqual([row]);
  expect(filterHealthcare(rows,{...initialHealthcareFilters,status:'PASS'})).toHaveLength(1);
  expect(filterHealthcare(rows,{...initialHealthcareFilters,resource:'Patient'})).toEqual([]);
  expect(filterHealthcare(rows,{...initialHealthcareFilters,severity:'warning'})).toEqual([]);
  expect(filterHealthcare(rows,{...initialHealthcareFilters,rule:'transport'})).toEqual([]);
});
test('integration rejection and test PASS remain separate in rendering',()=>{
  const html=renderToStaticMarkup(createElement(HealthcareTable,{rows:[{...row,expected:'REJECT',result:'PASS'}],onEvidence:()=>{},onRerun:()=>{}}));
  for(const text of ['REJECT','PASS','Walidacja danych: FAIL','Patient/p999','Dowód','Ponów'])expect(html).toContain(text);
});
test('interface matrix exposes contract and response expectations',()=>{
  const iface={id:'IF-Patient',source:'HIS',target:'Integration Layer',resource:'Patient',direction:'POST',required_fields:['identifier'],expected_http:201,reject_http:422,result:'PASS'} as HealthcareInterface;
  const html=renderToStaticMarkup(createElement(InterfaceMatrix,{interfaces:[iface],onSelect:()=>{}}));
  expect(html).toContain('Kontrakt Patient');expect(html).toContain('ACCEPT 201 / REJECT 422');
});
test('broken reference shows unresolved target, not a healthy path',()=>{
  const html=renderToStaticMarkup(createElement(ReferenceGraph,{edges:[{source:'Observation/o001',field:'subject',reference:'Patient/p999',expected_target:'Patient',resolved_target:null,status:'FAIL'}],onSelect:()=>{}}));
  expect(html).toContain('NIE ROZWIĄZANO');expect(html).toContain('wf-denied');expect(html).toContain('Patient/p999');
});
test('structured evidence is escaped',()=>{
  const html=renderToStaticMarkup(createElement(EvidenceView,{value:{...row.evidence,payload:'<script>bad</script>'}}));
  expect(html).toContain('resolved_target');expect(html).not.toContain('<script>');
});
test('report uses actual totals and Polish pluralization',()=>{
  const r={scenario_count:1,passed_scenarios:0,failed_scenarios:1,discrepancy_count:1,overall_status:'FAIL',interfaces_tested:1,resources_processed:7} as HealthcareReport;
  const html=renderToStaticMarkup(createElement(HealthcareSummary,{report:r}));
  expect(html).toContain('1 scenariusz');expect(html).toContain('1 rozbieżność');expect(html).toContain('FAIL: 1');
});
