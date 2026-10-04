import {escapeHtml,reportTable,reportDocument} from './report-html';
import {reconcileRecords} from '../../src/reconciliation';
import type {MigrationAction, MigrationRun, MigrationRow, MigrationComparison} from '../../src/migration-model';
import {clone, dumps, hash, requireInput, type Data} from './common';
import {SyncState} from './erp';
import {executeQuality, qualityFixture} from './quality';
import {csvRows, csvEncode, decimal, money} from './tabular';
import type {ReportRepository} from './storage';

const mappings = [
  {kind:'customer', source:'C-001', target:'SYN-C1'},
  {kind:'customer', source:'C-002', target:'SYN-C2'},
  {kind:'product', source:'SKU-001', target:'B-P1'},
  {kind:'product', source:'SKU-X99', target:'B-P99'},
];
const qualityFields = ['transaction_id','customer_code','transaction_date','gross_amount_raw','net_amount_raw','tax_amount_raw','status','country','note'];
export function migrationFixture(): string {
  const {rows} = csvRows(qualityFixture().content);
  rows.push({...rows[0], transaction_id:'TX-105'}, {...rows[1], transaction_id:'TX-106'});
  return csvEncode(rows.map((r,i)=>({...r, sku:i===3||i===5?'SKU-X99':'SKU-001', quantity:String(i%3+1)})));
}
export function startMigration(content: unknown, filename: unknown): MigrationRun {
  requireInput(typeof content==='string' && new TextEncoder().encode(content).length<=40_000, 'Use a synthetic CSV up to 40 KB');
  requireInput(typeof filename==='string' && filename.length>0 && filename.length<=100, 'Invalid filename');
  const {rows} = csvRows(content);
  requireInput(rows.length>=1 && rows.length<=30, 'Use 1–30 synthetic order lines');
  const fields = [...qualityFields,'sku','quantity'];
  for (const row of rows) {
    requireInput(Object.keys(row).length===fields.length && fields.every(k=>k in row), 'Use the columns in the sample CSV');
    requireInput(Object.values(row).every(v=>v.length<=150), 'Each field must be at most 150 characters');
    requireInput(/^TX-\d{3,6}$/.test(row.transaction_id), 'Use synthetic IDs TX-101, TX-102, etc.');
    requireInput(['SKU-001','SKU-X99'].includes(row.sku), 'Synthetic catalogue: SKU-001 or SKU-X99');
  }
  const store = new SyncState();
  for (const m of mappings) store.createEntity(m.kind,m.target,{name:'Synthetic '+m.source});
  const run: MigrationRun = {
    run_id:'MIG-'+crypto.randomUUID(), source:'migration', parent_run:null, timestamp:new Date().toISOString(),
    ruleset:'migration/1.0', synthetic:true, stage:'loaded', overall_status:'NOT CHECKED',
    filename, content, input_sha256:hash(content), rows, validation:null, mappings:[], exceptions:[],
    target:[], comparisons:[], totals:null, attempts:[], audit:[], checks:[], state:store.dump(), financials:{},
  };
  run.audit.push({action:'load',run_id:run.run_id,timestamp:run.timestamp,detail:`${rows.length} synthetic order lines; target is empty`});
  return run;
}
function event(row: MigrationRow, canonical: Record<string,string|null>) {
  return {event_id:'migration-'+row.transaction_id, external_id:row.transaction_id, version:1,
    customer:row.customer_code.trim(), sku:row.sku, quantity:Number(row.quantity),
    status:canonical.normalized_status==='cancelled'?'cancelled':'ready'};
}
function quality(run: MigrationRun) {
  const result = executeQuality({filename:run.filename,format:'json',configuration:'baseline',
    content:JSON.stringify(run.rows.map(row=>Object.fromEntries(qualityFields.map(k=>[k,row[k]]))))});
  const failures = result.failures.map((f:Data)=>({record:f.record_id,rule:f.rule,expected:f.expected,actual:f.actual}));
  // The ERP order contract adds a positive integer quantity to the existing financial contract.
  for (const row of run.rows) if (!/^[1-9]\d{0,5}$/.test(row.quantity))
    failures.push({record:row.transaction_id,rule:'order.quantity',expected:'1..999999',actual:row.quantity});
  const rejected = new Set(failures.map((f:{record:string})=>f.record));
  run.validation = {accepted:run.rows.filter(r=>!rejected.has(r.transaction_id)).length,
    rejected:run.rows.filter(r=>rejected.has(r.transaction_id)).length,failures,
    lineage:result.lineage,normalized:result.target};
}
function transfer(run: MigrationRun, store: SyncState, replay: boolean) {
  const failed = new Set(run.exceptions.map(e=>e.record));
  const selected = replay ? run.rows.filter(r=>failed.has(r.transaction_id)) : run.rows;
  const skipped = run.rows.filter(r=>!selected.includes(r)).map(r=>r.transaction_id);
  const results = [];
  for (const row of selected) {
    const canonical = run.validation!.normalized.find(r=>r.transaction_id===row.transaction_id)!;
    const result = store.sync(event(row,canonical));
    if (result.evidence.target_write) run.financials[row.transaction_id]=clone(canonical);
    results.push({record:row.transaction_id,result:result.result,target_write:result.evidence.target_write===true});
  }
  const snapshot = store.snapshot();
  run.exceptions = snapshot.exceptions.map((e:Data)=>{
    const last = [...store.history].reverse().find(h=>h.event_id===e.event_id)!;
    return {record:e.input.external_id,rule:last.result,expected:last.evidence.expected??'mapped target',actual:last.evidence.source_value??last.result};
  });
  run.attempts.push({phase:replay?'replay':'migration',selected:selected.map(r=>r.transaction_id),skipped,
    writes:results.filter(r=>r.target_write).length,results});
  run.target = snapshot.target_orders.map((r:Data)=>({...run.financials[r.external_id],...r}));
}
function reconcileMigration(run: MigrationRun) {
  const expectedRows = run.rows.map(row=>{
    const canonical = run.validation!.normalized.find(r=>r.transaction_id===row.transaction_id)!;
    return {...canonical, external_id:row.transaction_id, version:1,
      customer_id:mappings.find(m=>m.kind==='customer'&&m.source===row.customer_code.trim())!.target,
      product_id:mappings.find(m=>m.kind==='product'&&m.source===row.sku)!.target,
      quantity:Number(row.quantity),status:canonical.normalized_status==='cancelled'?'cancelled':'ready'};
  });
  const comparisons: MigrationComparison[] = reconcileRecords(expectedRows,run.target).map(row=>({
    record:row.source_id??String(row.target!.external_id),status:row.status,expected:row.source??{},actual:row.target,differences:row.differences,
  }));
  const sourceGross = money(run.validation!.normalized.reduce((n,r)=>n+decimal(r.gross_amount),0n));
  const targetGross = money(run.target.reduce((n,r)=>n+decimal(r.gross_amount),0n));
  run.comparisons = comparisons;
  run.totals = {source_count:run.rows.length,target_count:run.target.length,source_gross:sourceGross,target_gross:targetGross,currency:'PLN'};
  const check = (rule:string,expected:unknown,actual:unknown)=>({rule,expected,actual,status:expected===actual?'PASS':'FAIL'});
  const writes = run.attempts.reduce((n,a)=>n+a.writes,0);
  const successful = new Set<string>();
  let failedOnly = true;
  for(const attempt of run.attempts){
    if(attempt.phase==='replay' && attempt.selected.some(id=>successful.has(id))) failedOnly=false;
    for(const result of attempt.results) if(['created','updated','idempotent_replay','no_op'].includes(result.result)) successful.add(result.record);
  }
  run.checks = [check('record_count',run.rows.length,run.target.length),check('gross_total_PLN',sourceGross,targetGross),
    check('field_differences',0,comparisons.filter(r=>r.status!=='MATCH').length),check('open_exceptions',0,run.exceptions.length),
    check('one_write_per_target',run.target.length,writes),
    check('failed_only_replay',true,failedOnly)];
  run.overall_status = run.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
}
export function advanceMigration(previous: MigrationRun, action: MigrationAction, omitProduct=false): MigrationRun {
  const run = clone(previous), store = SyncState.restore(run.state);
  run.parent_run=previous.run_id;
  run.run_id='MIG-'+hash(dumps({parent:previous.run_id,action,omitProduct},true)).slice(0,32);
  run.timestamp=new Date().toISOString();
  const allowed = (stages:string[])=>requireInput(stages.includes(previous.stage),'Action is not available at this stage');
  let detail: string = action;
  switch(action) {
    case 'validate':
      allowed(['loaded','validated']); quality(run); run.stage='validated';
      detail=`${run.validation!.accepted} valid; ${run.validation!.rejected} rejected`; break;
    case 'mapping':
      allowed(['validated','mapped']); requireInput(run.validation?.rejected===0,'Correct source validation errors before mapping');
      store.mappings=[];
      for(const m of mappings) if(!(omitProduct&&m.source==='SKU-X99')) store.map(m.kind,m.source,m.target);
      run.stage='mapped'; detail=omitProduct?'Removed SKU-X99 → B-P99 before migration':'Approved customer and product mappings'; break;
    case 'migrate':
      allowed(['mapped']); transfer(run,store,false); run.stage='migrated';
      detail=`${run.target.length} written; ${run.exceptions.length} exceptions`; break;
    case 'correct':
      allowed(['migrated','replayed','reconciled']); requireInput(run.exceptions.length>0,'No failed records to correct');
      store.map('product','SKU-X99','B-P99'); run.stage='corrected';
      detail='Restored approved SKU-X99 → B-P99 mapping. No target writes.'; break;
    case 'replay':
      allowed(['migrated','corrected','replayed','reconciled']); transfer(run,store,true); run.stage='replayed';
      detail=`Only failed records selected: ${run.attempts.at(-1)!.selected.join(', ')||'none'}; ${run.attempts.at(-1)!.skipped.length} skipped`; break;
    case 'reconcile':
      allowed(['migrated','corrected','replayed','reconciled']); reconcileMigration(run); run.stage='reconciled';
      detail=`${run.overall_status}: ${run.comparisons.filter(r=>r.status!=='MATCH').length} differences`; break;
    default: requireInput(false,'Unknown migration action');
  }
  if(action!=='reconcile') {run.comparisons=[];run.totals=null;run.checks=[];run.overall_status='NOT CHECKED';}
  run.mappings=clone(store.mappings) as MigrationRun['mappings']; run.state=store.dump();
  run.audit.push({action,run_id:run.run_id,timestamp:run.timestamp,detail});
  requireInput(run.audit.length<=40,'Start a new dataset after 40 actions');
  return run;
}

export async function migrationEndpoint(request:Request, repo:ReportRepository):Promise<Response> {
  const url=new URL(request.url), path=url.pathname.slice('/lab-api/migration/'.length);
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  if(request.method==='GET'&&path==='fixture')return json({content:migrationFixture(),filename:'synthetic-orders.csv'});
  if(request.method==='POST'&&path==='start'){
    const body=await request.json() as Data;
    requireInput(body.synthetic===true,'Confirm synthetic data only');
    const run=startMigration(body.content,body.filename);await repo.put(run);return json(run);
  }
  if(request.method==='POST'&&path==='advance'){
    const body=await request.json() as Data;
    requireInput(typeof body.parent==='string'&&typeof body.action==='string','Parent and action are required');
    requireInput(body.omitProduct===undefined||typeof body.omitProduct==='boolean','Invalid mapping choice');
    const previous=await repo.get('migration',body.parent) as MigrationRun|null;
    if(!previous)return json({error:'run_expired'},404);
    const run=advanceMigration(previous,body.action as MigrationAction,body.omitProduct??false);
    // Identical retried commands return the same saved snapshot; they never append writes.
    const saved=await repo.get('migration',run.run_id);
    if(saved)return json(saved);
    await repo.put(run);return json(run);
  }
  const match=/^runs\/(MIG-[a-f0-9-]+)(?:\/(report\.json|report\.html))?$/.exec(path);
  if(request.method==='GET'&&match){
    const run=await repo.get('migration',match[1]) as MigrationRun|null;
    if(!run)return json({error:'run_expired'},404);
    if(match[2]){
      const html=match[2].endsWith('html');
      return new Response(html?migrationHtml(run):JSON.stringify(run,null,2),{headers:{'content-type':html?'text/html; charset=utf-8':'application/json; charset=utf-8',
        'content-disposition':`attachment; filename="${run.run_id}.${html?'html':'json'}"`,'cache-control':'no-store','x-content-type-options':'nosniff',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"}});
    }
    return json(run);
  }
  return json({error:'not_found'},404);
}
function migrationHtml(run:MigrationRun):string {
  const escape=escapeHtml,table=reportTable;
  return reportDocument('Migration evidence '+run.run_id,`<h1>Migration evidence — ${escape(run.overall_status)}</h1><p>Independent demonstration with synthetic data. Not a client deployment. Controlled target, no external ERP connection. Currency: PLN. Financial dates are validated against the Data Quality reference clock (2026-09-16).</p><p>Run: ${escape(run.run_id)}<br>Generated: ${escape(run.timestamp)}<br>Source: ${escape(run.filename)}<br>Source SHA-256: ${escape(run.input_sha256)}<br>Rules: ${escape(run.ruleset)}</p><h2>Acceptance checks</h2>${table(['Rule','Expected','Actual','Result'],run.checks.map(c=>[c.rule,c.expected,c.actual,c.status]))}<h2>Execution and recovery</h2>${table(['Phase','Selected records','Untouched records','Writes'],run.attempts.map(a=>[a.phase,a.selected.join(', '),a.skipped.join(', '),a.writes]))}<h2>Source / target reconciliation</h2>${table(['Record','Result','Differences'],run.comparisons.map(c=>[c.record,c.status,JSON.stringify(c.differences)]))}<h2>Audit trail</h2>${table(['Action','Time','Detail'],run.audit.map(a=>[a.action,a.timestamp,a.detail]))}<h2>Complete reproducible evidence</h2><pre>${escape(JSON.stringify(run,null,2))}</pre>`);
}
