import {expect,test} from 'vitest';
import {startMigration,migrationFixture,advanceMigration,migrationEndpoint} from '../worker/native/migration';
import {nativeApi} from '../worker/native/api';
import {csvRows,csvEncode} from '../worker/native/tabular';
import type {MigrationRun} from './migration-model';
import type {ReportRepository} from '../worker/native/storage';
import type {Data} from '../worker/native/common';
const load=()=>startMigration(migrationFixture(),'synthetic-orders.csv');
const mapped=(broken=true)=>advanceMigration(advanceMigration(load(),'validate'),'mapping',broken);
test('end-to-end: partial migration, correction without writes, failed-only replay and verified totals',()=>{
  const migration=advanceMigration(mapped(),'migrate');
  expect(migration.target.map(r=>r.external_id)).toEqual(['TX-101','TX-102','TX-103','TX-105']);
  expect(migration.exceptions.map(e=>e.record)).toEqual(['TX-104','TX-106']);
  const before=advanceMigration(migration,'reconcile');
  expect(before.overall_status).toBe('FAIL');
  expect(before.totals).toMatchObject({source_count:6,target_count:4,source_gross:'1534.50',target_gross:'250.00'});
  const correction=advanceMigration(before,'correct');
  expect(correction.target).toEqual(migration.target);
  expect(correction.exceptions).toHaveLength(2);
  expect(correction.overall_status).toBe('NOT CHECKED');
  const replay=advanceMigration(correction,'replay');
  expect(replay.attempts.at(-1)).toMatchObject({selected:['TX-104','TX-106'],skipped:['TX-101','TX-102','TX-103','TX-105'],writes:2});
  for(const record of migration.target) expect(replay.target.find(r=>r.external_id===record.external_id)).toEqual(record);
  const end=advanceMigration(replay,'reconcile');
  expect(end.overall_status).toBe('PASS');
  expect(end.totals).toMatchObject({source_count:6,target_count:6,source_gross:'1534.50',target_gross:'1534.50'});
  expect(end.comparisons.every(c=>c.status==='MATCH')).toBe(true);
  expect(migration.exceptions).toHaveLength(2); // Earlier evidence is immutable.
  expect(before.overall_status).toBe('FAIL');
});
test('replaying without repair retains errors; replay after success writes nothing',()=>{
  const first=advanceMigration(mapped(),'migrate');
  const again=advanceMigration(first,'replay');
  expect(again.exceptions).toHaveLength(2);expect(again.attempts.at(-1)?.writes).toBe(0);
  const fixed=advanceMigration(advanceMigration(again,'correct'),'replay');
  const empty=advanceMigration(fixed,'replay');
  expect(empty.attempts.at(-1)).toMatchObject({selected:[],skipped:['TX-101','TX-102','TX-103','TX-104','TX-105','TX-106'],writes:0});
  expect(advanceMigration(empty,'reconcile').overall_status).toBe('PASS');
});
test('clean path and changed uploaded data produce calculated results',()=>{
  const {rows}=csvRows(migrationFixture());rows[0].gross_amount_raw='12.30';rows[0].net_amount_raw='10';rows[0].tax_amount_raw='2.30';
  let r=startMigration(csvEncode(rows),'edited.csv');r=advanceMigration(r,'validate');r=advanceMigration(r,'mapping');r=advanceMigration(r,'migrate');r=advanceMigration(r,'reconcile');
  expect(r.overall_status).toBe('PASS');expect(r.totals?.source_gross).toBe('1446.80');expect(r.totals?.target_gross).toBe('1446.80');
  expect(r.target[0].gross_amount).toBe('12.30');
});
test('field reconciliation catches equal-total swaps and extra target records',()=>{
  const r=advanceMigration(mapped(false),'migrate');
  r.target[0].gross_amount='50.00';r.target[1].gross_amount='100.00';
  let checked=advanceMigration(r,'reconcile');
  expect(checked.totals?.source_gross).toBe(checked.totals?.target_gross);
  expect(checked.overall_status).toBe('FAIL');expect(checked.comparisons.filter(c=>c.status==='DIFFERENCE')).toHaveLength(2);
  r.target.push({...r.target[2],external_id:'TX-999'});checked=advanceMigration(r,'reconcile');
  expect(checked.comparisons.at(-1)?.status).toBe('MISSING SOURCE');
});
test.each(['amount','duplicate','quantity','date','customer'])('source %s error blocks mapping and all target writes',kind=>{
  const {rows}=csvRows(migrationFixture());
  if(kind==='amount')rows[0].gross_amount_raw='99';
  if(kind==='duplicate')rows[1].transaction_id=rows[0].transaction_id;
  if(kind==='quantity')rows[0].quantity='0';
  if(kind==='date')rows[0].transaction_date='31.02.2026';
  if(kind==='customer')rows[0].customer_code='UNKNOWN';
  const r=advanceMigration(startMigration(csvEncode(rows),'invalid.csv'),'validate');
  expect(r.validation!.rejected).toBeGreaterThan(0);expect(r.target).toEqual([]);
  expect(()=>advanceMigration(r,'mapping')).toThrow();
});
test('unsafe IDs, malformed files, oversized input and skipped workflow steps are rejected',()=>{
  const {rows}=csvRows(migrationFixture());rows[0].transaction_id='__proto__';
  expect(()=>startMigration(csvEncode(rows),'bad.csv')).toThrow();
  expect(()=>startMigration('a,a\nx,y','bad.csv')).toThrow();
  expect(()=>startMigration('x'.repeat(40001),'bad.csv')).toThrow();
  expect(()=>advanceMigration(load(),'migrate')).toThrow();
  expect(()=>advanceMigration(load(),'reconcile')).toThrow();
});
function repository():ReportRepository{
  const runs=new Map<string,Data>();return {async put(r){runs.set(r.source+'/'+r.run_id,structuredClone(r));},async get(lab,id){return structuredClone(runs.get(lab+'/'+id)??null);},async list(){return [];},async cleanup(){}};
}
test('API uses retained server snapshots, deduplicates repeated commands, and isolates repositories',async()=>{
  const repo=repository();
  const req=(path:string,body?:unknown)=>new Request('https://example.test/lab-api/migration/'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
  const r=load();await repo.put(r);
  const command={parent:r.run_id,action:'validate'};
  const first=await (await nativeApi(req('advance',command),repo)).json();
  const retry=await (await nativeApi(req('advance',command),repo)).json();expect(retry).toEqual(first);
  expect((await nativeApi(req('advance',command),repository())).status).toBe(404);
  expect((await nativeApi(req('start',{content:migrationFixture(),filename:'x.csv'}),repo)).status).toBe(422);
  expect((await nativeApi(req('advance',{parent:r.run_id,action:'migrate',state:{}}),repo)).status).toBe(422);
  const result=first as MigrationRun;expect(result.target).toHaveLength(0);
});
test('download contains actual evidence, escapes uploaded text and never claims a client deployment',async()=>{
  const {rows}=csvRows(migrationFixture());rows[0].note='<img src=x onerror=alert(1)>';
  let r=startMigration(csvEncode(rows),'synthetic.csv');for(const a of ['validate','mapping','migrate','reconcile'] as const)r=advanceMigration(r,a);
  const repo=repository();await repo.put(r);
  const response=await migrationEndpoint(new Request('https://example.test/lab-api/migration/runs/'+r.run_id+'/report.html'),repo);
  const html=await response.text();expect(html).toContain('Migration evidence — PASS');expect(html).toContain('Not a client deployment');expect(html).not.toContain('<img');expect(html).toContain('&lt;img');expect(html).toContain('1534.50');
  const json=await migrationEndpoint(new Request('https://example.test/lab-api/migration/runs/'+r.run_id+'/report.json'),repo);
  expect(await json.json()).toEqual(r);
});
