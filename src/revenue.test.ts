import {test,expect} from 'vitest';
import {startRevenue,advanceRevenue,revenueFixtures,computeRevenue} from '../worker/native/revenue';
import {metricTrace,revenueGroups,emptyRevenueFilters,filterRevenue,sumCents} from './revenue-model';
import {csvRows,decimal} from '../worker/native/tabular';
import {revenueHtml,revenueEvidence} from '../worker/native/revenue-api';
import {nativeApi} from '../worker/native/api';
import type {ReportRepository} from '../worker/native/storage';
import type {Data} from '../worker/native/common';
const finished=()=>advanceRevenue(advanceRevenue(startRevenue(),'map_customer'),'reconcile');
test('fixture contract: €64,200 excludes additional Northstar; all accepted history is before July',()=>{
  const d=revenueFixtures(),h=csvRows(d.historical_csv).rows;
  expect(h).toHaveLength(52);expect(d.erp).toHaveLength(19);expect(d.crm).toHaveLength(19);
  expect(h.slice(0,48).reduce((n,r)=>n+decimal(r.revenue),0n)).toBe(6420000n);
  expect(h.slice(0,49).every(r=>r.period<='2026-06')).toBe(true);
  expect(h[48]).toMatchObject({legacy_customer:'Northstar Retail Ltd',revenue:'18400.00',period:'2026-06'});
  expect(h.slice(49,51).every(r=>r.period==='2026-07')).toBe(true);
  expect(h.slice(49,51).reduce((n,r)=>n+decimal(r.revenue),0n)).toBe(405000n);
});
test('canonical mapping applies values and retains original lineage',()=>{
  const r=startRevenue(),f=r.facts[0];expect(f).toMatchObject({customer:'CUST-1001',product:'SUBSCRIPTION',region:'North',period:'2026-01',cents:'100000',included:true});
  expect(f.lineage.find(e=>e.target_field==='customer_id')).toMatchObject({source_field:'legacy_customer',raw:'Atlas Components',value:'CUST-1001'});
  expect(f.input_hash).toHaveLength(64);
});
test('stable issue categories distinguish data defects, policy, blocking mapping and business variance',()=>{
  const r=startRevenue();
  for(const code of ['CUSTOMER_MAPPING_MISSING','CUTOVER_OVERLAP','INVALID_PERIOD','EXACT_DUPLICATE','UNSUPPORTED_PRODUCT_CODE','UNKNOWN_CURRENCY','WON_WITHOUT_INVOICE'])expect(r.findings.some(f=>f.code===code)).toBe(true);
  expect(r.findings.filter(f=>f.blocking).map(f=>f.code)).toEqual(['CUSTOMER_MAPPING_MISSING']);
  expect(r.findings.find(f=>f.code==='WON_WITHOUT_INVOICE')?.category).toBe('variance');
  expect(r.findings.filter(f=>f.code==='OPEN_DEAL').every(f=>f.category==='policy'&&!f.blocking)).toBe(true);
});
test('duplicate and currency exclusions have separate balances',()=>{
  const r=finished();expect(r.facts.filter(f=>f.exclusion==='EXACT_DUPLICATE')).toHaveLength(1);
  expect(sumCents(r.facts.filter(f=>f.source==='erp'&&f.included))).toBe(3680000n);
  const unknown=r.facts.find(f=>f.exclusion==='UNKNOWN_CURRENCY')!;expect(unknown).toMatchObject({currency:'XXX',cents:'75000',included:false});
  expect(r.checks.find(c=>c.id==='erp_control_XXX')).toMatchObject({expected:'75000',actual:'75000',status:'PASS'});
});
test('cutover subtracts overlap once and all EUR control amounts balance',()=>{
  const r=finished();expect(sumCents(r.facts.filter(f=>f.source==='historical'))).toBe(8700000n);
  const historyBeforeOverlap=r.facts.filter(f=>f.source==='historical'&&(f.included||f.exclusion==='CUTOVER_OVERLAP'));
  const erp=r.facts.filter(f=>f.source==='erp'&&f.included),overlap=r.facts.filter(f=>f.exclusion==='CUTOVER_OVERLAP');
  expect(sumCents(historyBeforeOverlap)+sumCents(erp)-sumCents(overlap)).toBe(11940000n);
  expect(r.checks.every(c=>c.status==='PASS')).toBe(true);
  expect(r.checks.find(c=>c.id==='overlap_removed')).toMatchObject({expected:'405000',actual:'405000',status:'PASS'});
});
test('metric definitions never silently add bookings to reported revenue',()=>{
  const r=finished();expect(metricTrace(r.facts,'reported').cents).toBe('11940000');expect(metricTrace(r.facts,'historical').cents).toBe('8260000');
  expect(metricTrace(r.facts,'booked').cents).toBe('4580000');expect(metricTrace(r.facts,'invoiced').cents).toBe('3680000');expect(metricTrace(r.facts,'variance').cents).toBe('900000');
  expect(metricTrace(r.facts,'reported').included.every(f=>f.source!=='crm')).toBe(true);
});
test('Northstar correction is stale until explicit reconciliation and changes only dependent facts',()=>{
  const before=advanceRevenue(startRevenue(),'reconcile');expect(before.reconciliation_status).toBe('WARNING');expect(metricTrace(before.facts,'reported').cents).toBe('10100000');
  const mapped=advanceRevenue(before,'map_customer');expect(mapped.stage).toBe('stale');expect(mapped.facts).toEqual(before.facts);
  const after=advanceRevenue(mapped,'reconcile');expect(after.reconciliation_status).toBe('PASS');expect(after.source_quality_status).toBe('WARNING');
  expect(BigInt(metricTrace(after.facts,'reported').cents)-BigInt(metricTrace(before.facts,'reported').cents)).toBe(1840000n);
  expect(after.facts.filter((f,i)=>JSON.stringify(f)!==JSON.stringify(before.facts[i])).map(f=>f.id)).toEqual(['historical:49']);
  expect(after.datasets).toEqual(before.datasets);expect(before.customer_mapped).toBe(false);
});
test('filters and all chart groups agree with trace contributions including negative variance contributions',()=>{
  const r=finished(),filters={...emptyRevenueFilters,period:'2026-07'};
  const trace=metricTrace(r.facts,'reported',filters);expect(trace.cents).toBe('1740000');expect(trace.included).toHaveLength(8);expect(sumCents(trace.excluded.filter(f=>f.currency==='EUR'))).toBe(725000n);expect(sumCents(trace.excluded.filter(f=>f.currency==='XXX'))).toBe(75000n);
  expect(trace.excluded.filter(f=>f.exclusion==='CUTOVER_OVERLAP')).toHaveLength(2);
  for(const dimension of ['period','region','customer','product'] as const)expect(revenueGroups(r.facts,'reported',dimension,{...emptyRevenueFilters}).reduce((n,g)=>n+BigInt(g.cents),0n)).toBe(11940000n);
  expect(filterRevenue(r.facts,{...filters,region:'West'}).every(f=>f.region==='West'&&f.period==='2026-07')).toBe(true);
  const variance=metricTrace(r.facts,'variance');expect(variance.contributions.some(c=>BigInt(c.cents)<0n)).toBe(true);
  expect(variance.contributions.reduce((n,c)=>n+BigInt(c.cents),0n).toString()).toBe(variance.cents);
  expect(metricTrace(r.facts,'reported',{...emptyRevenueFilters,customer:'NONE'}).cents).toBe('0');
});
test('cutover boundary and conflicting duplicates are enforced rather than hidden',()=>{
  const d=revenueFixtures();d.erp[0].invoice_date='2026-06-30';d.erp[16].invoice_date='2026-06-30';let r=computeRevenue(d,true);expect(r.facts.find(f=>f.id==='erp:1')?.exclusion).toBe('OUTSIDE_AUTHORITY');
  d.erp[16].net_amount='999.00';r=computeRevenue(d,true);expect(r.findings.filter(f=>f.code==='CONFLICTING_DUPLICATE')).toHaveLength(2);expect(r.status).toBe('WARNING');
});
test('invalid amount produces FAIL rather than a false all-money-accounted PASS',()=>{
  const d=revenueFixtures();d.erp[1].net_amount='NaN';const r=computeRevenue(d,true);expect(r.status).toBe('FAIL');
});
test('reset restores deterministic datasets, facts and mapping, with fresh identity only',()=>{
  const first=startRevenue();finished();const reset=startRevenue();expect(reset.run_id).not.toBe(first.run_id);expect(reset.result_hash).toBe(first.result_hash);expect(reset.facts).toEqual(first.facts);expect(reset.mapping_version).toBe('revenue-map/1');expect(reset.customer_mapped).toBe(false);
});
test.each(['en','pl'] as const)('reports contain source evidence, definitions and both statuses (%s)',locale=>{
  const r=finished(),e=revenueEvidence(r,locale);expect(e.metrics.reported.cents).toBe('11940000');expect(e.source_quality_status).toBe('WARNING');expect(e.excluded_duplicates).toHaveLength(1);expect(e.overlap_handling).toHaveLength(2);
  r.datasets.crm[0].customer_name='<script>alert(1)</script>';const html=revenueHtml(r,locale);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('11940000');expect(html).toContain('WARNING');expect(html).toContain(`lang="${locale}"`);
});
function repo():ReportRepository{const map=new Map<string,Data>();return {async put(r){map.set(r.source+'/'+r.run_id,structuredClone(r));},async get(source,id){return structuredClone(map.get(source+'/'+id)??null);},async list(){return [];},async cleanup(){}};}
test('API protects reports, uses only server state, isolates sessions and deduplicates commands',async()=>{
  const storage=repo(),r=startRevenue();await storage.put(r);
  const request=(path:string,body?:unknown)=>new Request('https://example.test/lab-api/revenue-bi/'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
  expect((await nativeApi(request('runs/'+r.run_id+'/report.json'),storage)).status).toBe(409);
  expect((await nativeApi(request('runs/'+r.run_id),repo())).status).toBe(404);
  const body={parent:r.run_id,action:'map_customer',facts:[],reconciliation_status:'PASS'};
  const a=await (await nativeApi(request('advance',body),storage)).json();expect(a).toMatchObject({stage:'stale',reconciliation_status:'STALE'});
  expect(await (await nativeApi(request('advance',body),storage)).json()).toEqual(a);
  const good=finished();await storage.put(good);expect((await nativeApi(request('runs/'+good.run_id+'/report.html?lang=pl'),storage)).status).toBe(200);
});
