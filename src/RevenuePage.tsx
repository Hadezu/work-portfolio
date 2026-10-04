import {ProofBusinessContext,ProofNextStep} from './ProofOutreach';
import {DemoPreview,GuideStep} from './BuyerJourney';
import {buyerCopy} from './buyer-copy';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {DemoTable} from './DemoTable';
import {EvidenceView} from './WorkflowViews';
import {revenueCopy} from './revenue-copy';
import {emptyRevenueFilters,metricTrace,metrics,moneyText,revenueGroups,revenueSources,sumCents,filterRevenue,type RevenueRun,type RevenueFact,type RevenueFilters,type Metric} from './revenue-model';
import './revenue.css';

const api='/lab-api/revenue-bi/';
async function call(path:string,body:unknown={}):Promise<RevenueRun>{
  const r=await fetch(api+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw Error(String(r.status));return r.json();
}
type Trace={title:string;rows:RevenueFact[];metric?:ReturnType<typeof metricTrace>;check?:unknown};
type ChartItem={label:string;cents:string;metric:Metric;filters:RevenueFilters};
function RevenueChart({title,items,onTrace}:{title:string;items:ChartItem[];onTrace:(metric:Metric,filters:RevenueFilters)=>void}){
  const locale=useLocale(),c=revenueCopy[locale],max=Math.max(1,...items.map(i=>Number(i.cents)));
  return <section className="revenue-chart"><h3>{title}</h3>{!items.length?<p>{c.empty}</p>:<><div className="revenue-bars">{items.map((item,i)=><button key={i} type="button" onClick={()=>onTrace(item.metric,item.filters)} aria-label={`${item.label}: ${moneyText(item.cents,locale)}`}><span>{item.label}</span><svg viewBox="0 0 200 20" aria-hidden="true"><rect width="200" height="20" rx="3" fill="#eef3f6"/><rect width={Math.max(0,Number(item.cents)/max*200)} height="20" rx="3" fill={item.metric==='booked'?'#577594':'#157466'}/></svg><strong>{moneyText(item.cents,locale)}</strong></button>)}</div><details><summary>{c.chartTable}</summary><DemoTable heads={[c.record,c.total,c.trace]} rows={items.map(item=>[item.label,moneyText(item.cents,locale),<button type="button" onClick={()=>onTrace(item.metric,item.filters)}>{c.details}</button>])}/></details></>}</section>;
}
export {RevenueEntry} from './RevenueEntry';
export default function RevenuePage(){
  const locale=useLocale(),c=revenueCopy[locale],b=buyerCopy[locale];
  const [guided,setGuided]=useState(false),[traceVisited,setTraceVisited]=useState(false);
  const [run,setRun]=useState<RevenueRun|null>(null),[tab,setTab]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const [filters,setFilters]=useState<RevenueFilters>({...emptyRevenueFilters}),[trace,setTrace]=useState<Trace|null>(null);
  const lock=useRef(false),dialog=useRef<HTMLDialogElement>(null),title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(trace)dialog.current?.showModal();else dialog.current?.close();},[trace]);
  useEffect(()=>{title.current?.focus({preventScroll:true});},[tab]);
  async function perform(action:'start'|'map_customer'|'reconcile'){
    if(lock.current)return;lock.current=true;setBusy(true);setError(false);
    try{const value=await call(action==='start'?'start':'advance',action==='start'?{}:{parent:run!.run_id,action});setRun(value);setTrace(null);
      if(action==='start'){setTraceVisited(false);setTab(0);setFilters({...emptyRevenueFilters});}else setTab(3);
    }catch{setError(true);}finally{lock.current=false;setBusy(false);}
  }
  const facts=run?.facts??[],ready=run?.stage==='reconciled';
  const fmt=(cents:string|bigint,currency='EUR')=>moneyText(cents,locale,currency);
  const recordTable=(rows:RevenueFact[],signed?:Record<string,string>)=><DemoTable heads={[c.source,c.record,c.period,c.total,c.status,c.original]} rows={rows.map(f=>[c.sourceNames[f.source],f.source_id+' · #'+f.source_row,f.period,fmt(signed?.[f.id]??f.cents??'0',f.currency),f.included?c.included:f.exclusion,<details><summary>{c.original}</summary><EvidenceView value={{source:f.source,row:f.source_row,raw:f.raw,lineage:f.lineage,input_hash:f.input_hash}}/></details>])}/>;
  function showRows(label:string,rows:RevenueFact[],check?:unknown){setTrace({title:label,rows,check});}
  function showMetric(metric:Metric,context:RevenueFilters={...filters}){const value=metricTrace(facts,metric,context);setTrace({title:c.metricNames[metric],rows:value.included,metric:value});}
  const button=(label:string,onClick:()=>void,primary=false)=><button type="button" className={'button '+(primary?'primary':'secondary')} disabled={busy} onClick={onClick}>{label}</button>;
  const checkLabel=(id:string)=>c.checks[id as keyof typeof c.checks]??id;
  const sourceSummary=revenueSources.flatMap(source=>{
    const rows=facts.filter(f=>f.source===source);
    return [...new Set(rows.map(f=>f.currency))].map(currency=>{
      const bucket=rows.filter(f=>f.currency===currency),included=bucket.filter(f=>f.included),excluded=bucket.filter(f=>!f.included);
      return [c.sourceNames[source]+' · '+currency,bucket.length,included.length,excluded.length,fmt(sumCents(bucket),currency),fmt(sumCents(included),currency),fmt(sumCents(excluded),currency),run?.checks.find(x=>x.id===source+'_control_'+currency)?.status??'—',<button onClick={()=>showRows(c.sourceNames[source]+' · '+currency,bucket)}>{c.records}</button>];
    });
  });
  const sourceCard=(source:typeof revenueSources[number])=>{
    const rows=facts.filter(f=>f.source===source),periods=rows.map(f=>f.period).filter(p=>p!=='UNKNOWN').sort();
    return <article key={source}><h3>{c.sourceNames[source]}</h3><p><strong>{rows.length}</strong> {c.rows} · {periods[0]} — {periods.at(-1)}</p>{[...new Set(rows.map(f=>f.currency))].map(currency=><p key={currency}>{c.total}: <strong>{fmt(sumCents(rows.filter(f=>f.currency===currency)),currency)}</strong></p>)}<p>{c.quality}: {run!.findings.some(x=>x.category==='quality'&&rows.some(r=>r.id===x.record))?'WARNING':'PASS'}</p><button onClick={()=>showRows(c.sourceNames[source],rows)}>{c.sample}</button></article>;
  };
  const definitions=<details className="revenue-definitions"><summary>{c.definitions}</summary><dl>{metrics.map(m=><div key={m}><dt>{c.metricNames[m]}</dt><dd>{c.definitionsText[m]}</dd></div>)}</dl></details>;
  const groups=(dimension:keyof RevenueFilters):ChartItem[]=>revenueGroups(facts,'reported',dimension,filters).map(g=>({label:dimension==='customer'?facts.find(f=>f.customer===g.value)?.customer_name??g.value:g.value,cents:g.cents,metric:'reported',filters:g.filters}));
  const filterFields=(Object.keys(emptyRevenueFilters) as (keyof RevenueFilters)[]);
  const guideStep=!run?0:run.stage==='stale'?5:ready?(run.reconciliation_status==='WARNING'?4:tab===5?8:tab===4?(traceVisited?8:7):6):tab===0?1:tab===1?2:3;
  const guideAction=()=>{if(!run){void perform('start');}else if(guideStep===1)setTab(1);else if(guideStep===2)setTab(2);else if(guideStep===3||guideStep===5)void perform('reconcile');else if(guideStep===4)void perform('map_customer');else if(guideStep===6)setTab(4);else if(guideStep===7){showMetric('reported',{...emptyRevenueFilters,period:'2026-07'});setTraceVisited(true);}else setTab(5);};
  const guideLabels=[c.load,c.tabs[1],c.tabs[2],c.reconcile,c.map,c.reconcileAgain,c.tabs[4],b.traceJuly,tab===5?c.downloadHtml:b.nextReport];
  return <main className="revenue-page">
    <section className="shell revenue-intro premium-intro"><Link to={localizedPath('/',locale)}>← {c.back}</Link><p className="eyebrow">Working Demonstration · BI</p><h1>{c.title}</h1><ProofBusinessContext example="proof/revenue-bi"/><p className="intro">{c.intro}</p><p>{c.disclosure}</p>
      <>{!run&&<><button className="button primary buyer-preview-start" disabled={busy} onClick={()=>{setGuided(true);void perform("start");}}>{b.start}</button><DemoPreview kind="revenue-bi"/></>}</><details><summary>{c.tryTitle}</summary><ol>{c.trySteps.map(s=><li key={s}>{s}</li>)}</ol></details>
    </section>
    <section className="shell revenue-workspace" aria-busy={busy}>{guided&&<GuideStep step={guideStep} steps={b.revenueSteps} label={guideLabels[guideStep]} onAction={guideAction} href={tab===5&&ready&&run?.reconciliation_status==='PASS'?api+"runs/"+run.run_id+"/report.html?lang="+locale:undefined} onStop={()=>setGuided(false)} busy={busy}/> }
      {!run?<><h2>{c.tabs[0]}</h2><p>{c.sourcesIntro}</p>{button(c.load,()=>void perform('start'),true)}</>:<>
        <div className="revenue-status" aria-live="polite"><div><span>{c.model}</span><strong data-testid="revenue-status" className={run.reconciliation_status==='PASS'?'pass':'warning'}>{run.reconciliation_status==='NOT_RUN'?c.notRun:run.reconciliation_status==='STALE'?c.stale:run.reconciliation_status}</strong></div><div><span>{c.quality}</span><strong data-testid="revenue-quality">{run.source_quality_status}</strong></div><div><span>{c.version}</span><strong>{run.mapping_version}</strong></div></div>
        {run.reconciliation_status!=='NOT_RUN'&&<section className="buyer-outcome" data-status={run.reconciliation_status}><h3>{b.meaning}</h3><p>{run.reconciliation_status==='PASS'?b.revenuePass:run.reconciliation_status==='STALE'?b.revenueStale:run.reconciliation_status==='FAIL'?b.revenueFail:b.revenueWarning}</p>{ready&&<><small>{b.allData}</small><dl><div><dt>{b.reported}</dt><dd>{fmt(metricTrace(facts,'reported',emptyRevenueFilters).cents)}</dd></div><div><dt>{b.overlap}</dt><dd>{fmt(sumCents(facts.filter(f=>f.exclusion==='CUTOVER_OVERLAP'&&f.currency==='EUR')))}</dd></div><div><dt>{b.held}</dt><dd>{fmt(sumCents(facts.filter(f=>f.exclusion==='CUSTOMER_MAPPING_MISSING'&&f.currency==='EUR')))}</dd></div></dl></>}</section>}<p className="revenue-status-note">{c.passMeaning}</p>
        <nav className="revenue-tabs" aria-label={c.title}>{c.tabs.map((name,i)=><button type="button" key={name} aria-current={tab===i?'step':undefined} disabled={busy||(i===4&&!ready)} onClick={()=>setTab(i)}>{i+1}. {name}</button>)}</nav>
        <h2 ref={title} tabIndex={-1}>{c.tabs[tab]}</h2>
        {tab===0&&<><p>{c.sourcesIntro}</p><div className="revenue-source-cards">{revenueSources.map(sourceCard)}</div><div className="revenue-actions">{button(c.tabs[1]+' →',()=>setTab(1),true)}</div></>}
        {tab===1&&<><h3>{c.mapTitle}</h3><p>{c.mapIntro}</p><DemoTable heads={[c.source,c.from,c.to,c.rule]} rows={revenueSources.flatMap(source=>facts.find(f=>f.source===source)!.lineage.map(e=>[c.sourceNames[source],e.source_field+' · '+e.raw,e.target_field+' · '+e.value,e.rule]))}/>
          <div className="revenue-callout"><strong>Northstar Retail Ltd → {run.customer_mapped?'CUST-1042':'?'}</strong><p>{run.customer_mapped?c.mapped:c.issues.CUSTOMER_MAPPING_MISSING[2]}</p>{!run.customer_mapped&&button(c.map,()=>void perform('map_customer'),true)}</div>{definitions}<div className="revenue-actions">{button(c.tabs[2]+' →',()=>setTab(2),true)}</div></>}
        {tab===2&&<>{(Object.keys(c.categories) as (keyof typeof c.categories)[]).map(category=><section className="revenue-findings" key={category}><h3>{c.categories[category]}</h3>{!run.findings.some(f=>f.category===category)?<p>{c.none}</p>:run.findings.filter(f=>f.category===category).map((f,i)=><article key={f.code+i} data-testid={'finding-'+f.code}><div><code>{f.code}</code><h4>{c.issues[f.code][0]}</h4><p>{c.issues[f.code][1]}</p><p><strong>{c.impact}:</strong> {c.issues[f.code][2]}</p><p><strong>{c.action}:</strong> {c.issues[f.code][3]}</p></div><div><strong>{fmt(f.cents??'0',f.currency)}</strong><p>{f.record}</p><button type="button" onClick={()=>showRows(c.issues[f.code][0],facts.filter(r=>r.id===f.record),f)}>{c.records}</button>{f.code==='CUSTOMER_MAPPING_MISSING'&&!run.customer_mapped&&button(c.map,()=>void perform('map_customer'),true)}</div></article>)}</section>)}<div className="revenue-actions">{button(c.reconcile,()=>void perform('reconcile'),true)}</div></>}
        {tab===3&&<><p>{c.reconcileIntro}</p>{button(run.stage==='sources'?c.reconcile:c.reconcileAgain,()=>void perform('reconcile'),true)}{run.stage==='stale'?<p role="status" className="revenue-callout">{c.stale}</p>:<>
          <DemoTable heads={[c.source,c.rows,c.included,c.excluded,c.total,c.reconciled,c.difference,c.status,c.records]} rows={sourceSummary}/>
          <p>{c.difference} = {c.total} − {c.reconciled} = {c.excluded}.</p>
          <DemoTable heads={[c.control,c.expected,c.actual,c.status,c.records]} rows={run.checks.map(check=>[checkLabel(check.id),check.expected,check.actual,check.status,<button type="button" onClick={()=>showRows(checkLabel(check.id),facts.filter(f=>check.records.includes(f.id)),check)}>{c.details}</button>])}/><p>{locale==='en'?'Monetary checks are in integer cents. Row checks are counts.':'Kontrole kwot są w całkowitych groszach. Kontrole wierszy pokazują ich liczbę.'}</p>
          {ready&&<div className="revenue-actions">{!run.customer_mapped&&button(c.map,()=>void perform('map_customer'))}{button(c.tabs[4]+' →',()=>setTab(4),true)}</div>}
        </>}{definitions}</>}
        {tab===4&&ready&&<>
          {run.reconciliation_status!=='PASS'&&<p className="revenue-callout">{c.issues.CUSTOMER_MAPPING_MISSING[2]}</p>}
          <div className="revenue-filters">{filterFields.map(field=><label key={field}>{c[field]}<select value={filters[field]} onChange={e=>setFilters({...filters,[field]:e.target.value})}><option value="ALL">{c.all}</option>{[...new Set(facts.map(f=>f[field]))].sort().map(value=><option key={value} value={value}>{field==='customer'?facts.find(f=>f.customer===value)?.customer_name??value:value}</option>)}</select></label>)}<button onClick={()=>setFilters({...emptyRevenueFilters})}>{c.clearFilters}</button></div>
          <div className="revenue-kpis">{metrics.map(m=><button key={m} type="button" onClick={()=>showMetric(m)} data-testid={'metric-'+m}><span>{c.metricNames[m]}</span><strong>{fmt(metricTrace(facts,m,filters).cents)}</strong><small>{c.trace} →</small></button>)}</div>{definitions}
          <div className="revenue-chart-grid"><RevenueChart title={c.overTime} items={groups('period')} onTrace={showMetric}/><RevenueChart title={c.byCustomer} items={groups('customer')} onTrace={showMetric}/><RevenueChart title={c.byProduct} items={groups('product')} onTrace={showMetric}/><RevenueChart title={c.byRegion} items={groups('region')} onTrace={showMetric}/><RevenueChart title={c.bookedVs} items={revenueGroups(facts,'booked','period',filters).flatMap(g=>(['booked','invoiced'] as const).map(m=>({label:g.value+' · '+c.metricNames[m],cents:metricTrace(facts,m,g.filters).cents,metric:m,filters:g.filters})))} onTrace={showMetric}/>
          <section className="revenue-chart"><h3>{c.topCustomers}</h3><DemoTable heads={[c.customer,c.metricNames.reported,c.trace]} rows={groups('customer').sort((a,b)=>Number(b.cents)-Number(a.cents)).slice(0,5).map(g=>[g.label,fmt(g.cents),<button onClick={()=>showMetric('reported',g.filters)}>{c.details}</button>])}/></section></div>
          <h3>{c.varianceTitle}</h3><DemoTable heads={[c.code,c.record,c.total,c.trace]} rows={run.findings.filter(f=>filterRevenue(facts,filters).some(r=>r.id===f.record)).map(f=>[f.code,f.record,fmt(f.cents??'0',f.currency),<button onClick={()=>showRows(c.issues[f.code][0],facts.filter(r=>r.id===f.record),{...f,explanation:c.issues[f.code]})}>{c.records}</button>])}/><div className="revenue-actions">{button(c.tabs[5]+' →',()=>setTab(5),true)}</div>
        </>}
        {tab===5&&<><h3>{c.reportTitle}</h3><p>{c.reportIntro}</p>{ready&&run.reconciliation_status==='PASS'?<div className="revenue-actions"><a className="button primary" href={api+'runs/'+run.run_id+'/report.html?lang='+locale} download>{c.downloadHtml}</a><a className="button secondary" href={api+'runs/'+run.run_id+'/report.json?lang='+locale} download>{c.downloadJson}</a></div>:<p>{c.reportLocked}</p>}<p>Run: <code>{run.run_id}</code></p><p>SHA-256: <code>{run.source_hash}</code></p><details><summary>{c.reportTitle}</summary><EvidenceView value={{cutover:run.cutover,audit:run.audit,result_hash:run.result_hash}}/></details></>}
        <div className="revenue-actions">{button(c.reset,()=>{setGuided(false);void perform('start');})}</div>
      </>}
      {busy&&<p role="status">{c.busy}</p>}{error&&<p role="alert" className="revenue-error">{c.error}</p>}
    </section>
    <section className="shell section"><p className="revenue-limits">{c.limits}</p><h2>{c.technical}</h2><div className="revenue-actions">{[['proof/migration','Migration Showcase'],['data-quality','Data Quality'],['reconciliation','Reconciliation']].map(([path,label])=><Link key={path} className="button secondary" to={localizedPath('/'+path,locale)}>{label} →</Link>)}</div></section>
    <dialog className="revenue-dialog" ref={dialog} onClose={()=>setTrace(null)} aria-labelledby="revenue-trace-title"><button type="button" className="button secondary" onClick={()=>setTrace(null)}>{c.close}</button><h2 id="revenue-trace-title">{trace?.title}</h2>{trace?.metric&&<><h3>{fmt(trace.metric.cents)}</h3><p>{c.definitionsText[trace.metric.metric]}</p><h4>{c.context}</h4><p>{filterFields.map(field=>c[field]+': '+(trace.metric!.filters[field]==='ALL'?c.all:trace.metric!.filters[field])).join(' · ')}</p><p>{c.calculation}: {trace.metric.metric==='variance'?'Σ '+c.metricNames.booked+' − Σ '+c.metricNames.invoiced:'Σ '+c.included+' · EUR'}</p><ul>{revenueSources.flatMap(source=>{
      const rows=[...trace.metric!.included,...trace.metric!.excluded].filter(f=>f.source===source);
      return [...new Set(rows.map(f=>f.currency))].map(currency=>{const bucket=rows.filter(f=>f.currency===currency);return <li key={source+currency}>{c.sourceNames[source]} · {c.included}: {fmt(sumCents(bucket.filter(f=>f.included)),currency)} · {c.excluded}: {fmt(sumCents(bucket.filter(f=>!f.included)),currency)}</li>;});
    })}</ul><h4>{c.contributions}</h4></>}{trace&&recordTable(trace.rows,trace.metric?Object.fromEntries(trace.metric.contributions.map(x=>[x.record,x.cents])):undefined)}{trace?.metric&&<><h4>{c.exclusions}</h4>{recordTable(trace.metric.excluded)}</>}{trace?.check!==undefined&&<EvidenceView value={trace.check}/>}</dialog>
    <ProofNextStep example="proof/revenue-bi"/>
  </main>;
}
