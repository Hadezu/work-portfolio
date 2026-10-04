import {compareFields} from '../../src/reconciliation';
import {metricDefinitions,metricTrace,sumCents,revenueSources,type RevenueRun,type RevenueFact,type RevenueFinding,type RevenueDatasets,type RevenueCheck,type FindingCode,type FindingCategory,type RevenueSource} from '../../src/revenue-model';
import {csvEncode,csvRows,decimal,money,dateValue} from './tabular';
import {sourceEvidence,identifierCounts} from './quality-primitives';
import {clone,dumps,hash,requireInput} from './common';

export const customers=[
  {id:'CUST-1001',name:'Atlas Components',region:'North',account:'ACC-01'},
  {id:'CUST-1002',name:'Cedar Services',region:'South',account:'ACC-02'},
  {id:'CUST-1003',name:'Harbor Supply',region:'Central',account:'ACC-03'},
  {id:'CUST-1042',name:'Northstar Retail',region:'West',account:'ACC-04'},
];
const products=[{id:'SUBSCRIPTION',legacy:'Subscription',erp:'P-SUB'},{id:'SERVICES',legacy:'Services',erp:'P-SVC'}];
export function revenueFixtures():RevenueDatasets {
  const history:Record<string,string>[]=[],erp:Record<string,string>[]=[],crm:Record<string,string>[]=[];
  // €64,200 is ONLY these 48 January–June records. Northstar's €18,400 is additional.
  for(let m=0;m<6;m++)for(let c=0;c<4;c++)for(let p=0;p<2;p++)history.push({period:`2026-0${m+1}`,legacy_customer:customers[c].name,legacy_product:products[p].legacy,region:customers[c].region,revenue:money(BigInt(100000+m*10000+c*5000+p*2500)),currency:'EUR'});
  history.push({period:'2026-06',legacy_customer:'Northstar Retail Ltd',legacy_product:'Services',region:'West',revenue:'18400.00',currency:'EUR'});
  for(let p=0;p<2;p++)history.push({period:'2026-07',legacy_customer:customers[0].name,legacy_product:products[p].legacy,region:'North',revenue:p?'2050.00':'2000.00',currency:'EUR'});
  history.push({period:'2026-13',legacy_customer:customers[0].name,legacy_product:'Services',region:'North',revenue:'350.00',currency:'EUR'});
  for(let m=0;m<2;m++)for(let c=0;c<4;c++)for(let p=0;p<2;p++){
    const id=`${m+7}${c}${p}`,amount=money(BigInt(200000+m*25000+c*10000+p*5000));
    crm.push({deal_id:'D-'+id,account_id:customers[c].account,customer_name:customers[c].name,product:products[p].legacy,stage:'closed_won',close_date:`2026-0${m+7}-05`,booked_amount:amount,currency:'EUR'});
    erp.push({invoice_id:'INV-'+id,deal_id:'D-'+id,account_id:customers[c].account,invoice_date:`2026-0${m+7}-15`,product_code:products[p].erp,net_amount:amount,currency:'EUR',status:'posted'});
  }
  erp.push({...erp[0]});
  erp.push({...erp[0],invoice_id:'INV-UNSUPPORTED',product_code:'P-UNSUPPORTED',net_amount:'1200.00'});
  erp.push({...erp[0],invoice_id:'INV-CURRENCY',net_amount:'750.00',currency:'XXX'});
  crm.push({...crm[0],deal_id:'D-PENDING-INVOICE',booked_amount:'9000.00',close_date:'2026-08-20'});
  for(let i=0;i<2;i++)crm.push({...crm[i],deal_id:'D-OPEN-'+i,stage:'open',booked_amount:'5000.00'});
  return {historical_csv:csvEncode(history),crm,erp};
}
export function computeRevenue(datasets:RevenueDatasets,mapped:boolean){
  const facts:RevenueFact[]=[],findings:RevenueFinding[]=[];
  const h=csvRows(datasets.historical_csv);
  const sources={historical:h.rows,crm:datasets.crm,erp:datasets.erp};
  for(const source of revenueSources){
    const rows=sources[source],idField=source==='erp'?'invoice_id':source==='crm'?'deal_id':'';
    const counts=identifierCounts(rows,r=>idField?r[idField]:dumps(r,true));
    const seen=new Set<string>();
    for(const [index,raw] of rows.entries()){
      const sourceId=idField?raw[idField]:'H-'+String(index+1).padStart(3,'0');
      const evidence=sourceEvidence(raw,source==='historical'?'historical.csv':source+'.json',source==='historical'?h.positions[index]:index+1,sourceId,source==='historical'?'physical line':'record index');
      const customerRaw=source==='historical'?raw.legacy_customer:raw.account_id;
      const customer=customers.find(c=>source==='historical'?c.name===customerRaw:c.account===customerRaw)??(source==='historical'&&mapped&&customerRaw==='Northstar Retail Ltd'?customers[3]:undefined);
      const productRaw=source==='historical'?raw.legacy_product:source==='erp'?raw.product_code:raw.product;
      const product=products.find(p=>source==='erp'?p.erp===productRaw:p.legacy===productRaw);
      const amountField=source==='historical'?'revenue':source==='erp'?'net_amount':'booked_amount';
      const dateField=source==='historical'?'period':source==='erp'?'invoice_date':'close_date';
      let cents:string|null=null,period='UNKNOWN';
      try{const n=decimal(raw[amountField]);requireInput(n>=0n&&n<=100000000000n,'Revenue amount range');cents=n.toString();}catch{/* Quarantine below. */}
      try{period=dateValue(source==='historical'?raw.period+'-01':raw[dateField]).slice(0,7);}catch{/* Keep invalid records in source evidence. */}
      const f:RevenueFact={id:source+':'+(index+1),source,source_id:sourceId,source_row:evidence.row,raw:clone(raw),input_hash:evidence.input_hash,customer:customer?.id??'UNKNOWN',customer_name:customer?.name??customerRaw,product:product?.id??'UNKNOWN',region:customer?.region??raw.region??'UNKNOWN',period,currency:raw.currency,cents,included:true,exclusion:null,deal_id:raw.deal_id??'',lineage:[]};
      const id=idField?raw[idField]:dumps(raw,true);
      const sameKey=rows.filter(r=>(idField?r[idField]:dumps(r,true))===id);
      const conflicting=(counts.get(id)??0)>1&&sameKey.some(r=>dumps(r,true)!==dumps(raw,true));
      let code:FindingCode|null=null,category:FindingCategory='quality',blocking=false;
      if(cents===null)code='INVALID_AMOUNT';
      else if(raw.currency!=='EUR')code='UNKNOWN_CURRENCY';
      else if(period==='UNKNOWN')code='INVALID_PERIOD';
      else if(conflicting){code='CONFLICTING_DUPLICATE';blocking=true;}
      else if(seen.has(id))code='EXACT_DUPLICATE';
      else if(!product)code='UNSUPPORTED_PRODUCT_CODE';
      else if(!customer){code='CUSTOMER_MAPPING_MISSING';category='configuration';blocking=true;}
      else if(source==='historical'&&period>='2026-07'){code='CUTOVER_OVERLAP';category='policy';}
      else if(source==='erp'&&period<'2026-07'){code='OUTSIDE_AUTHORITY';category='policy';}
      else if((source==='crm'&&raw.stage!=='closed_won')||(source==='erp'&&raw.status!=='posted')){code='OPEN_DEAL';category='policy';}
      seen.add(id);
      if(code){f.included=false;f.exclusion=code;findings.push({code,category,record:f.id,blocking,cents,currency:f.currency});}
      f.lineage=[
        {source_field:source==='historical'?'legacy_customer':'account_id',target_field:'customer_id',raw:customerRaw,value:f.customer,rule:'approved customer alias/account dictionary'},
        {source_field:source==='historical'?'legacy_product':source==='erp'?'product_code':'product',target_field:'product',raw:productRaw,value:f.product,rule:'approved product dictionary'},
        {source_field:amountField,target_field:source==='crm'?'booked_revenue':source==='erp'?'invoiced_revenue':'recognised_revenue',raw:raw[amountField],value:cents??'INVALID',rule:'EUR integer cents; no FX'},
        {source_field:dateField,target_field:'reporting_period',raw:raw[dateField],value:period,rule:'calendar month; history <= June, ERP >= July'},
      ];
      facts.push(f);
    }
  }
  for(const f of facts.filter(f=>f.source==='crm'&&f.included))if(!facts.some(i=>i.source==='erp'&&i.included&&i.deal_id===f.deal_id))findings.push({code:'WON_WITHOUT_INVOICE',category:'variance',record:f.id,blocking:false,cents:f.cents,currency:f.currency});
  const checks:RevenueCheck[]=[];
  function check(id:string,expected:string,actual:string,records:string[],warning=false){checks.push({id,expected,actual,records,status:Object.keys(compareFields({value:expected},{value:actual})).length?'FAIL':warning?'WARNING':'PASS'});}
  for(const source of revenueSources){
    const rows=facts.filter(f=>f.source===source);
    for(const currency of [...new Set(rows.map(f=>f.currency))]){
      const bucket=rows.filter(f=>f.currency===currency),included=bucket.filter(f=>f.included),excluded=bucket.filter(f=>!f.included);
      check(source+'_control_'+currency,sumCents(bucket).toString(),(sumCents(included)+sumCents(excluded)).toString(),bucket.map(f=>f.id));
    }
    check(source+'_rows',String(rows.length),String(rows.filter(f=>f.included).length+rows.filter(f=>!f.included).length),rows.map(f=>f.id));
  }
  const overlaps=facts.filter(f=>f.exclusion==='CUTOVER_OVERLAP');
  check('overlap_removed',sumCents(overlaps).toString(),sumCents(overlaps.filter(f=>!f.included)).toString(),overlaps.map(f=>f.id));
  check('cutover_respected','0',String(facts.filter(f=>f.included&&((f.source==='historical'&&f.period>='2026-07')||(f.source==='erp'&&f.period<'2026-07'))).length),facts.filter(f=>f.source!=='crm').map(f=>f.id));
  check('unmapped_amount',sumCents(facts.filter(f=>f.exclusion==='CUSTOMER_MAPPING_MISSING')).toString(),sumCents(facts.filter(f=>f.exclusion==='CUSTOMER_MAPPING_MISSING')).toString(),facts.filter(f=>f.exclusion==='CUSTOMER_MAPPING_MISSING').map(f=>f.id),findings.some(f=>f.blocking));
  const duplicate=facts.filter(f=>f.exclusion==='EXACT_DUPLICATE');check('duplicate_excluded',sumCents(duplicate).toString(),sumCents(duplicate.filter(f=>!f.included)).toString(),duplicate.map(f=>f.id));
  const rawEur=facts.filter(f=>f.source!=='crm'&&f.currency==='EUR');
  check('final_reporting_total',(sumCents(rawEur)-sumCents(rawEur.filter(f=>!f.included))).toString(),metricTrace(facts,'reported').cents,rawEur.map(f=>f.id));
  check('crm_booked_total',sumCents(facts.filter(f=>f.source==='crm'&&f.included)).toString(),metricTrace(facts,'booked').cents,facts.filter(f=>f.source==='crm').map(f=>f.id));
  check('all_monetary_records_accounted','0',String(facts.filter(f=>f.cents===null||(!f.included&&!f.exclusion)).length),facts.map(f=>f.id));
  const status=checks.some(c=>c.status==='FAIL')?'FAIL':findings.some(f=>f.blocking)?'WARNING':'PASS';
  return {facts,findings,checks,status,quality:findings.some(f=>f.category==='quality')?'WARNING' as const:'PASS' as const};
}
export function startRevenue():RevenueRun{
  const datasets=revenueFixtures(),result=computeRevenue(datasets,false),at=new Date().toISOString(),id='REV-'+crypto.randomUUID();
  return {source:'revenue-bi',run_id:id,parent_run:null,generated_at:at,synthetic:true,stage:'sources',mapping_version:'revenue-map/1',customer_mapped:false,reconciliation_status:'NOT_RUN',source_quality_status:result.quality,datasets,facts:result.facts,findings:result.findings,checks:result.checks,source_hash:hash(dumps(datasets,true)),result_hash:hash(dumps(result,true)),cutover:{historical_until:'2026-06-30',erp_from:'2026-07-01'},definitions:metricDefinitions,audit:[{action:'start',run_id:id,at,mapping_version:'revenue-map/1'}]};
}
export function advanceRevenue(parent:RevenueRun,action:string):RevenueRun{
  requireInput(['map_customer','reconcile'].includes(action),'Unknown revenue action');
  const run=clone(parent);run.parent_run=parent.run_id;run.run_id='REV-'+hash(parent.run_id+':'+action).slice(0,32);run.generated_at=new Date().toISOString();
  requireInput(parent.audit.length<30,'Reset the demo to start a new run');
  if(action==='map_customer'){
    requireInput(!parent.customer_mapped,'Customer mapping is already applied');
    run.customer_mapped=true;run.mapping_version='revenue-map/2';run.stage='stale';run.reconciliation_status='STALE';
  }else{
    const result=computeRevenue(run.datasets,run.customer_mapped);
    Object.assign(run,{facts:result.facts,findings:result.findings,checks:result.checks,source_quality_status:result.quality,reconciliation_status:result.status,stage:'reconciled',result_hash:hash(dumps(result,true))});
  }
  run.audit.push({action,run_id:run.run_id,at:run.generated_at,mapping_version:run.mapping_version});return run;
}
