import {matchesDimensions} from './fact-filters';
export type RevenueSource='historical'|'crm'|'erp';
export type Metric='reported'|'historical'|'booked'|'invoiced'|'variance';
export type FindingCode='CUSTOMER_MAPPING_MISSING'|'CUTOVER_OVERLAP'|'INVALID_PERIOD'|'EXACT_DUPLICATE'|'UNSUPPORTED_PRODUCT_CODE'|'UNKNOWN_CURRENCY'|'WON_WITHOUT_INVOICE'|'OPEN_DEAL'|'INVALID_AMOUNT'|'CONFLICTING_DUPLICATE'|'OUTSIDE_AUTHORITY';
export type FindingCategory='configuration'|'quality'|'policy'|'variance';
export type RevenueFact={
  id:string;source:RevenueSource;source_id:string;source_row:number;raw:Record<string,string>;input_hash:string;
  customer:string;customer_name:string;product:string;region:string;period:string;currency:string;cents:string|null;
  included:boolean;exclusion:FindingCode|null;deal_id:string;
  lineage:{source_field:string;target_field:string;raw:string;value:string;rule:string}[];
};
export type RevenueFinding={code:FindingCode;category:FindingCategory;record:string;blocking:boolean;cents:string|null;currency:string};
export type RevenueCheck={id:string;status:'PASS'|'WARNING'|'FAIL';expected:string;actual:string;records:string[]};
export type RevenueDatasets={historical_csv:string;crm:Record<string,string>[];erp:Record<string,string>[]};
export type RevenueRun={
  source:'revenue-bi';run_id:string;parent_run:string|null;generated_at:string;synthetic:true;
  stage:'sources'|'stale'|'reconciled';mapping_version:string;customer_mapped:boolean;
  reconciliation_status:'NOT_RUN'|'STALE'|'PASS'|'WARNING'|'FAIL';source_quality_status:'PASS'|'WARNING';
  datasets:RevenueDatasets;facts:RevenueFact[];findings:RevenueFinding[];checks:RevenueCheck[];
  source_hash:string;result_hash:string;cutover:{historical_until:string;erp_from:string};
  definitions:Record<Metric,string>;audit:{action:string;run_id:string;at:string;mapping_version:string}[];
};
export const revenueSources:RevenueSource[]=['historical','crm','erp'];
export const metrics:Metric[]=['reported','historical','booked','invoiced','variance'];
export const metricDefinitions:Record<Metric,string>={
  reported:'Accepted historical revenue through 2026-06 plus posted ERP invoices from 2026-07. CRM is never added.',
  historical:'Accepted historical records dated on or before 2026-06-30; cutover overlap and other exclusions do not contribute.',
  booked:'Accepted unique closed_won CRM deals, grouped by close month. Open deals do not contribute.',
  invoiced:'Accepted unique posted ERP invoices in the ERP authoritative period, grouped by invoice month.',
  variance:'Booked minus Invoiced in the same selected calendar periods and dimensions. Timing differences are not automatically data errors.',
};
export const emptyRevenueFilters={period:'ALL',region:'ALL',customer:'ALL',product:'ALL'};
export type RevenueFilters=typeof emptyRevenueFilters;
export function filterRevenue(facts:RevenueFact[],filters:RevenueFilters){return facts.filter(f=>matchesDimensions(f,filters,(row,key)=>row[key as keyof RevenueFilters]));}
export function sumCents(facts:RevenueFact[]){return facts.reduce((n,f)=>n+BigInt(f.cents??'0'),0n);}
export function metricTrace(facts:RevenueFact[],metric:Metric,filters:RevenueFilters={...emptyRevenueFilters}){
  const scoped=filterRevenue(facts,filters);
  const sourceFits=(f:RevenueFact)=>metric==='reported'?f.source!=='crm':metric==='historical'?f.source==='historical':metric==='booked'?f.source==='crm':metric==='invoiced'?f.source==='erp':f.source!=='historical';
  const relevant=scoped.filter(sourceFits),included=relevant.filter(f=>f.included&&f.currency==='EUR'),excluded=relevant.filter(f=>!f.included||f.currency!=='EUR');
  const contributions=included.map(f=>({record:f.id,cents:(BigInt(f.cents??'0')*(metric==='variance'&&f.source==='erp'?-1n:1n)).toString()}));
  const cents=contributions.reduce((n,c)=>n+BigInt(c.cents),0n).toString();
  return {metric,filters:{...filters},definition:metricDefinitions[metric],calculation:metric==='variance'?'Σ booked EUR − Σ invoiced EUR':'Σ included EUR records',cents,included,excluded,contributions};
}
export function revenueGroups(facts:RevenueFact[],metric:Metric,dimension:keyof RevenueFilters,filters:RevenueFilters){
  const scoped=metricTrace(facts,metric,filters);
  const values=[...new Set([...scoped.included,...scoped.excluded].map(f=>f[dimension]).filter(v=>v&&v!=='UNKNOWN'))].sort();
  return values.map(value=>({value,...metricTrace(facts,metric,{...filters,[dimension]:value})}));
}
export function moneyText(cents:string|bigint,locale:'en'|'pl'='en',currency='EUR'){
  // Values stay integer cents throughout calculations; Number is used only for formatting.
  const value=Number(cents)/100;
  if(currency==='EUR')return new Intl.NumberFormat(locale==='pl'?'pl-PL':'en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(value);
  return `${value.toFixed(2)} ${currency}`;
}
