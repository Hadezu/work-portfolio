import {ProofBusinessContext,ProofNextStep} from './ProofOutreach';
import {DemoPreview,GuideStep} from './BuyerJourney';
import {buyerCopy} from './buyer-copy';
import {DemoTable as Table} from './DemoTable';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useLocale, localizedPath} from './locale';
import {migrationCopy} from './migration-copy';
import type {MigrationRun,MigrationAction} from './migration-model';
import ProofFlow from './ProofFlow';
import './migration.css';

const api='/lab-api/migration/';
async function request<T>(path:string,body?:unknown):Promise<T>{
  const response=await fetch(api+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
  if(!response.ok) {const data=await response.json().catch(()=>({})) as {detail?:string;error?:string};throw Error(data.detail??data.error??String(response.status));}
  return response.json();
}

export function MigrationFeature(){const locale=useLocale(),c=migrationCopy[locale];return <section className="shell migration-feature"><div><p className="eyebrow">{c.eyebrow}</p><h2>{c.featureTitle}</h2><p>{c.featureBody}</p><Link className="button primary" to={localizedPath('/proof/migration',locale)}>{c.featureCta} →</Link></div><ol>{c.steps.map((s,i)=><li key={s}><span>{String(i+1).padStart(2,'0')}</span>{s}</li>)}</ol></section>;}
export default function MigrationPage(){
  const locale=useLocale(),c=migrationCopy[locale],b=buyerCopy[locale];
  const [guided,setGuided]=useState(false);
  const [run,setRun]=useState<MigrationRun|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [content,setContent]=useState(''),[confirmed,setConfirmed]=useState(false);
  const locked=useRef(false),heading=useRef<HTMLHeadingElement>(null);
  function save(value:MigrationRun){setRun(value);setContent(value.content);try{sessionStorage.setItem('migration-run',value.run_id);}catch{/* Storage is optional. */}}
  async function perform(task:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'');}finally{locked.current=false;setBusy(false);}}
  useEffect(()=>{let active=true;let id:string|null=null;try{id=sessionStorage.getItem('migration-run');}catch{/* Optional. */}
    if(id){locked.current=true;setBusy(true);request<MigrationRun>('runs/'+encodeURIComponent(id)).then(value=>{if(active)save(value);}).catch(()=>{if(active)setError('run_expired');}).finally(()=>{if(active){locked.current=false;setBusy(false);}});}
    return()=>{active=false;};},[]);
  const phase=!run?0:run.stage==='loaded'||run.stage==='validated'?1:run.stage==='mapped'?2:run.stage==='reconciled'?5:4;
  useEffect(()=>{if(run)heading.current?.focus({preventScroll:true});},[run?.stage]);
  function advance(action:MigrationAction,omitProduct?:boolean){void perform(async()=>save(await request<MigrationRun>('advance',{parent:run!.run_id,action,...(omitProduct===undefined?{}:{omitProduct})})));}
  function load(text:string,filename='synthetic-orders.csv'){return request<MigrationRun>('start',{content:text,filename,synthetic:true}).then(save);}
  const missing=!!run&&!run.mappings.some(m=>m.source==='SKU-X99');
  const tableRows=run?.rows.map(r=>[r.transaction_id,r.customer_code,r.sku,r.quantity,r.gross_amount_raw,r.status])??[];
  const exceptionRows=run?.exceptions.map(e=>[e.record,e.rule==='missing_mapping'?c.missing:e.rule,String(e.actual),e.rule==='missing_mapping'?c.requiredMapping:String(e.expected)])??[];
  const actions=(children:ReactNode)=><div className="migration-actions">{children}</div>;
  const button=(label:string,click:()=>void,primary=false)=><button type="button" className={'button '+(primary?'primary':'secondary')} onClick={click} disabled={busy}>{label}</button>;
  const recovery=run&&<>
    <p>{c.recoveryBody}</p>
    {run.exceptions.length>0?<Table heads={[c.record,c.reason,c.actual,c.expected]} rows={exceptionRows}/>:<p className="migration-success">{c.none}</p>}
    {run.stage==='corrected'&&<p role="status">{c.corrected}</p>}
    {!run.exceptions.length&&<p>{c.noReplay}</p>}
    {actions(<>{run.exceptions.length>0&&missing&&button(c.correct,()=>advance('correct'),true)}{button(c.replay,()=>advance('replay'),run.stage==='corrected')}{button(c.check,()=>advance('reconcile'),!run.exceptions.length)}</>)}
  </>;
  const guideStep=!run?0:run.stage==='loaded'?1:run.stage==='validated'?2:run.stage==='mapped'?(missing?4:3):run.stage==='corrected'||run.stage==='replayed'?7:run.stage==='reconciled'?(run.overall_status==='PASS'?8:6):5;
  const startGuide=()=>{setGuided(true);void perform(async()=>{const fixture=await request<{content:string}>('fixture');await load(fixture.content);});};
  const guideActions=[startGuide,()=>advance('validate'),()=>advance('mapping',false),()=>advance('mapping',true),()=>advance('migrate'),()=>advance('reconcile'),()=>advance('correct'),()=>advance(run?.stage==='replayed'?'reconcile':'replay')];
  const guideLabels=[c.sample,c.validate,c.continueMapping,c.breakMapping,c.migrate,c.check,c.correct,run?.stage==='replayed'?c.check:c.replay,c.html];
  return <main className="migration-page">
    <section className="shell migration-intro premium-intro"><Link to={localizedPath('/',locale)}>← {c.back}</Link><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><ProofBusinessContext example="proof/migration"/><p className="intro">{c.intro}</p><p className="migration-disclosure">{c.disclaimer}</p>{!run&&<><button className="button primary buyer-preview-start" disabled={busy} onClick={startGuide}>{b.start}</button><DemoPreview kind="migration"/></>}</section>
    <div className="shell"><ol className="migration-steps" aria-label={c.title}>{c.steps.map((step,i)=><li key={step} className={i===phase?'current':i<phase?'done':''} aria-current={i===phase?'step':undefined}><span>{i<phase?'✓':i+1}</span>{step}</li>)}</ol>
    {run&&<div className="migration-counts" aria-live="polite">{[[c.input,run.rows.length],[c.target,run.target.length],[c.exceptions,run.exceptions.length],[c.writes,run.attempts.reduce((n,a)=>n+a.writes,0)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    {error&&<div className="migration-error" role="alert"><p>{c.error}</p><code>{error}</code></div>}
    {guided&&<GuideStep step={guideStep} steps={b.migrationSteps} label={guideLabels[guideStep]} onAction={guideActions[guideStep]} href={guideStep===8?api+"runs/"+run!.run_id+"/report.html":undefined} onStop={()=>setGuided(false)} busy={busy}/>}<section className="migration-workspace" aria-busy={busy}>
      <h2 ref={heading} tabIndex={-1}>{!run?c.sourceTitle:phase===1?c.validationTitle:phase===2?c.mappingTitle:phase===5?c.evidenceTitle:c.recoveryTitle}</h2>
      {!run?<><p>{c.sourceBody}</p>{actions(<>{button(c.sample,()=>void perform(async()=>{const fixture=await request<{content:string}>('fixture');await load(fixture.content);}),true)}{button(c.sampleDownload,()=>void perform(async()=>{const fixture=await request<{content:string}>('fixture');const url=URL.createObjectURL(new Blob([fixture.content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='synthetic-orders.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}))}</>)}<div className="migration-upload"><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{c.confirm}</label><label>{c.upload}<input type="file" accept=".csv,text/csv" disabled={!confirmed||busy} onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>40_000||!confirmed){setError(c.fileError);return;}void perform(async()=>load(await file.text(),file.name));}}/></label></div></>:
      <>
        {phase===1&&<><p>{c.validationBody}</p><Table heads={[c.record,c.customer,'SKU',c.quantity,c.gross,c.sourceStatus]} rows={tableRows}/>
          {run.validation&&<div role="status" data-testid="migration-validation"><strong>{run.validation.accepted} {c.valid} · {run.validation.rejected} {c.rejected}</strong>{run.validation.failures.length>0&&<><Table heads={[c.record,c.reason,c.expected,c.actual]} rows={run.validation.failures.map(f=>[f.record,f.rule,String(f.expected),String(f.actual)])}/><p>{c.validationFix}</p></>}</div>}
          {actions(<>{button(c.validate,()=>advance('validate'),!run.validation)}{run.validation?.rejected===0&&button(c.continueMapping,()=>advance('mapping',false),true)}</>)}
        </>}
        {phase===2&&<><p>{c.mappingBody}</p><Table heads={[c.source,c.approved,c.destination]} rows={['C-001','C-002','SKU-001','SKU-X99'].map((id,i)=>[id,['SYN-C1','SYN-C2','B-P1','B-P99'][i],run.mappings.find(m=>m.source===id)?.target??<strong className="migration-warning">{c.missing}</strong>])}/>
          {actions(<>{button(missing?c.restoreMapping:c.breakMapping,()=>advance('mapping',!missing))}</>)}
          <details><summary>{c.fieldMap}</summary><Table heads={[c.source,c.destination]} rows={[
            ['transaction_id','external_id (unique)'],['customer_code','customer_id'],['sku','product_id'],['quantity','quantity (integer > 0)'],['gross_amount_raw / net_amount_raw / tax_amount_raw','gross_amount / net_amount / tax_amount (decimal, PLN)'],['transaction_date','transaction_date (YYYY-MM-DD)'],['SALE / CANCEL','ready / cancelled'],
          ]}/></details><h3>{c.migrationTitle}</h3><p>{c.migrationBody}</p>{actions(button(c.migrate,()=>advance('migrate'),true))}</>}
        {phase===4&&recovery}
        {phase===5&&<><section className="buyer-outcome" data-status={run.overall_status}><h3>{b.meaning}</h3><p>{run.overall_status==='PASS'?b.migrationPass:b.migrationFail}</p>{run.overall_status==='PASS'&&run.totals&&<dl><div><dt>{b.records}</dt><dd>{run.comparisons.filter(r=>r.status==='MATCH').length}</dd></div><div><dt>{b.controlTotal}</dt><dd>{new Intl.NumberFormat(locale,{style:'currency',currency:'PLN'}).format(Number(run.totals.source_gross))}</dd></div></dl>}</section><div className={'migration-verdict '+(run.overall_status==='PASS'?'pass':'fail')} role="status" data-testid="migration-verdict"><strong>{run.overall_status}</strong><p>{run.overall_status==='PASS'?c.pass:c.fail}</p></div>
          {run.totals&&<Table heads={['',c.source,c.destination]} rows={[[c.counts,run.totals.source_count,run.totals.target_count],[c.total,run.totals.source_gross,run.totals.target_gross]]}/>}
          <Table heads={[c.record,c.status,c.details]} rows={run.comparisons.map(r=>[r.record,({MATCH:c.match,'MISSING TARGET':c.missingTarget,'MISSING SOURCE':c.missingSource,DIFFERENCE:c.difference,'VERSION CONFLICT':c.difference}[r.status]??r.status),<details><summary>{c.details}</summary><pre>{JSON.stringify({expected:r.expected,actual:r.actual,differences:r.differences},null,2)}</pre></details>])}/>
          {actions(<><a className="button primary" href={api+'runs/'+run.run_id+'/report.html'} download>{c.html}</a><a className="button secondary" href={api+'runs/'+run.run_id+'/report.json'} download>{c.json}</a></>)}
          {run.exceptions.length>0&&recovery}
        </>}
        {run.attempts.length>0&&<section><h3>{c.attempts}</h3><Table heads={[c.steps[3],c.selected,c.skipped,c.writes]} rows={run.attempts.map(a=>[a.phase==='replay'?c.replayed:c.steps[3],a.selected.join(', ')||'—',a.skipped.join(', ')||'—',a.writes])}/></section>}
        <details className="migration-source"><summary>{c.editor}</summary><label>{c.dataset}<textarea aria-label={c.dataset} value={content} onChange={e=>setContent(e.target.value)} spellCheck={false}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{c.confirm}</label><button className="button secondary" type="button" disabled={busy||!confirmed} onClick={()=>void perform(()=>load(content))}>{c.loadEdited}</button></details>
        <details><summary>{c.audit}</summary><p>Run: <code>{run.run_id}</code></p><p>SHA-256: <code>{run.input_sha256}</code></p><pre>{JSON.stringify({audit:run.audit,mappings:run.mappings,checks:run.checks,validation:run.validation},null,2)}</pre></details>
      </>}
      {busy&&<p role="status">{c.busy}</p>}
    </section>
    {run&&<div className="migration-actions">{button(c.reset,()=>{setGuided(false);setRun(null);setContent('');setError('');setConfirmed(false);try{sessionStorage.removeItem('migration-run');}catch{/* Optional. */}})}</div>}
    <p className="migration-limits">{c.limits}</p></div>
    <ProofFlow input="CSV" processing="Data Quality → ERP Sync" failures={c.exceptions} output={c.evidenceTitle.slice(3)} acceptance={c.sourceTarget+' · PASS / FAIL'}/>
    <section className="shell section migration-deeper"><h2>{c.deeper}</h2><p>{c.deeperBody}</p><div className="migration-actions">{[['erp-sync','ERP Sync'],['data-quality','Data Quality'],['reconciliation','Reconciliation']].map(([path,label])=><Link className="button secondary" key={path} to={localizedPath('/'+path,locale)}>{label} →</Link>)}</div></section>
    <ProofNextStep example="proof/migration"/>
  </main>;
}
