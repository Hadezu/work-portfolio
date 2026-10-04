import {executionKind,builderScope} from './semantics';
import {describe,test,expect} from 'vitest';
import {presets,patterns} from './config';
import {automationCopy} from './copy';
import {assertLocalized} from '../localization-contract';
import {createInput,createComparison,compareRecords,simulate,resolveSelection,automationHref,briefHref} from './engine';

describe('automation configuration and deterministic engine',()=>{
 test('canonical pattern inventory and unique preset IDs',()=>{
  expect(patterns.map(p=>p.code)).toEqual(['DATA_ENTRY','DATA_SYNC','RECONCILIATION','DOCUMENT_FLOW','ORDER_FLOW','APPROVAL_FLOW','STATUS_SYNC','EXCEPTION_HANDLING','REPORTING','END_TO_END','OTHER']);
  expect(presets.length).toBeGreaterThanOrEqual(7);
  expect(new Set(presets.map(p=>p.id)).size).toBe(presets.length);
  expect(()=>assertLocalized('ui',automationCopy)).not.toThrow();
 });
 for(const preset of presets){
  test(`${preset.id}: valid localized config and every exception is exercised`,()=>{
   expect(()=>assertLocalized(preset.id,preset.copy)).not.toThrow();
   expect(patterns.some(p=>p.id===preset.defaultPattern)).toBe(true);
   expect(new Set(preset.rules.map(r=>r.id)).size).toBe(preset.rules.length);
   for(const rule of preset.rules)expect(()=>assertLocalized(rule.id,rule.copy)).not.toThrow();
   if(preset.defaultPattern==='reconciliation')return;
   const input=createInput(preset), snapshot=JSON.stringify(input);
   const run=simulate(preset,preset.defaultPattern,input);
   expect(run.accepted).toHaveLength(6);
   expect(run.reviewCount).toBe(preset.rules.length);
   expect(run.input).toHaveLength(6+preset.rules.length);
   expect(new Set(run.findings.map(f=>f.rule))).toEqual(new Set(preset.rules.map(r=>r.id)));
   expect(run.actions.every(a=>!run.findings.some(f=>f.record===a.record))).toBe(true);
   expect(JSON.stringify(input)).toBe(snapshot);
   expect(simulate(preset,preset.defaultPattern,input)).toEqual(run);
  });
  for(const pattern of patterns)test(`${preset.id}/${pattern.id}: targets exist and direct URL round trips`,()=>{
   for(const locale of ['pl','en'] as const){const href=automationHref(locale,preset.id,pattern.id);const chosen=resolveSelection(new URL(href,'https://example.test').search);expect(chosen.preset.id).toBe(preset.id);expect(chosen.pattern.id).toBe(pattern.id);expect(chosen.invalid).toBe(false);}
   if(executionKind(preset,pattern.id)==='outline'){expect(()=>simulate(preset,pattern.id)).toThrow('agreed configuration');return;}
   const run=simulate(preset,pattern.id);
   expect(run.actions).toHaveLength(6*pattern.destinations.length);
   for(const action of run.actions)expect(preset.copy.pl.flow[Number(action.destination)]).toBeTruthy();
  });
 }
 test('invalid URL is explicit and aliases are stable',()=>{
  expect(resolveSelection('?pattern=unknown&industry=bad').invalid).toBe(true);
  expect(resolveSelection('?pattern=STATUS_SYNC&industry=logistics').pattern.code).toBe('STATUS_SYNC');
  expect(resolveSelection('?pattern=exceptions').pattern.id).toBe('exception-handling');
  expect(resolveSelection('?pattern=reconciliation').preset.id).toBe('finance');
 });
 test('multiple violations count one review record, and empty data has no actions',()=>{
  const p=presets[1],row={...createInput(p)[0],reference:'',valid:false,stock:0};
  const run=simulate(p,'order-flow',[row]);expect(run.reviewCount).toBe(1);expect(run.findings.length).toBeGreaterThan(1);expect(run.actions).toEqual([]);
  expect(simulate(p,'order-flow',[]).accepted).toEqual([]);
 });
 test('brief preserves Unicode, punctuation and line breaks without new mail headers',()=>{
  const href=briefHref('Proces\r\nBcc: test',['Źródło','Czynność','Wynik'],['CSV + XML & żółć','Sprawdź\nilość','ERP?x=1']);
  const params=new URL(href).searchParams;
  expect(params.get('subject')).not.toMatch(/[\r\n]/);expect(params.has('bcc')).toBe(false);
  expect(params.get('body')).toContain('CSV + XML & żółć');expect(params.get('body')).toContain('Sprawdź\nilość');expect(href).toContain('%20');
 });
});

 test('comparison uses two sources by reference, rejects duplicates on either side, never writes',()=>{
  const {input,reference}=createComparison(),snapshot=JSON.stringify({input,reference});
  const run=compareRecords(input,reference);
  expect(run.accepted).toHaveLength(6);expect(run.reviewCount).toBe(4);expect(run.actions).toEqual([]);
  expect(run.findings.map(f=>f.rule)).toEqual(['comparison-missing','comparison-mismatch','comparison-duplicate','comparison-duplicate']);
  expect(run.audit.filter(e=>e.event===8)).toHaveLength(input.length);
  expect(run.audit.some(e=>e.event===3)).toBe(false);
  expect(compareRecords([{...input[0],expected:999}],reference).accepted).toHaveLength(1);
  expect(compareRecords([input[0]],[{reference:input[0].reference,value:15}]).findings[0].rule).toBe('comparison-mismatch');
  expect(compareRecords([input[0]],[reference[0],reference[0]]).findings[0].rule).toBe('comparison-duplicate');
  expect(JSON.stringify({input,reference})).toBe(snapshot);
 });
 test('every configured run separates rejected records before actions and audits both branches',()=>{
  for(const preset of presets)for(const pattern of patterns){
   for(const locale of ['pl','en'] as const){const href=automationHref(locale,preset.id,pattern.id);const chosen=resolveSelection(new URL(href,'https://example.test').search);expect(chosen.preset.id).toBe(preset.id);expect(chosen.pattern.id).toBe(pattern.id);expect(chosen.invalid).toBe(false);}
   if(executionKind(preset,pattern.id)==='outline')continue;
   const run=simulate(preset,pattern.id);
   for(const finding of run.findings){expect(run.actions.some(a=>a.record===finding.record)).toBe(false);expect(run.audit.some(e=>e.record===finding.record&&e.event===5)).toBe(true);}
   for(const action of run.actions){const events=run.audit.filter(e=>e.record===action.record);expect(events.findIndex(e=>e.event===2)).toBeLessThan(events.findIndex(e=>e.event===3));}
  }
 });
 test('all 512 builder combinations remain scoped proposals; comparison keeps source B separate',()=>{
  for(const locale of ['pl','en'] as const)for(let source=0;source<8;source++)for(let task=0;task<8;task++)for(let target=0;target<8;target++){
   const scope=builderScope(locale,source,task,target,'REFERENCE-B','KEY-42');
   expect(scope).not.toContain('{');expect(scope).toContain(automationCopy[locale].sources[source]);expect(scope).toContain(automationCopy[locale].destinations[target]);
   if(task===2){expect(scope).toContain('REFERENCE-B');expect(scope).toContain('KEY-42');}
  }
 });
