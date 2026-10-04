import {describe,test,expect} from 'vitest';
import {businessCopy,businessSummary,financeStatus,businessAction} from './business';
import {assertLocalized} from '../localization-contract';
import {createComparison,simulate} from './engine';
import {presets} from './config';
import {builderScope} from './semantics';
describe('business examples remain backed by simulation',()=>{
 test('finance compares invoice amounts with payments without writing to systems',()=>{
  const preset=presets.find(p=>p.id==='finance')!,fixture=createComparison(true),run=simulate(preset,'reconciliation');
  expect(run.input).toEqual(fixture.input);expect(run.input).toHaveLength(10);expect(run.accepted).toHaveLength(6);expect(run.reviewCount).toBe(4);expect(run.actions).toEqual([]);expect(run.audit.some(e=>e.event===3)).toBe(false);
  expect(run.input.every(r=>r.reference.startsWith('FV/2026/'))).toBe(true);
  for(const locale of ['pl','en'] as const){const c=businessCopy[locale];expect(financeStatus(locale,run.input[6],run)).toBe(c.financeStatuses[1]);expect(financeStatus(locale,run.input[7],run)).toBe(c.financeStatuses[2]);expect(financeStatus(locale,run.input[8],run)).toBe(c.financeStatuses[3]);expect(businessSummary(locale,'finance',true,run)).toContain('6');}
 });
 test('logistics only presents accepted carrier events as ERP updates',()=>{
  const run=simulate(presets.find(p=>p.id==='logistics')!,'status-sync');
  expect(run.actions).toHaveLength(6);for(const action of run.actions){const row=run.input.find(r=>r.id===action.record)!;expect(row.status).toBe('delivered');expect(row.reference).toMatch(/^EVT-/);expect(businessAction('en','logistics',row,4,'')).toContain('Dispatched → Delivered');}
  expect(run.findings.every(f=>!run.actions.some(a=>a.record===f.record))).toBe(true);
 });
 test('unknown comparison details remain an honest proposal, not a blocked brief',()=>{
  assertLocalized('business',businessCopy);for(const locale of ['pl','en'] as const){const scope=builderScope(locale,1,2,3,'','');expect(scope).toContain(businessCopy[locale].unknown);expect(scope).not.toContain('{');}
 });
});
