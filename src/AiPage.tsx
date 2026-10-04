import {SimilarTask} from './BuyerJourney';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {aiCopy} from './ai-copy';
import {AI_MODEL,versions,presets,documentsFor,canApprove} from './ai-lab-model';
import type {AiRun} from '../worker/ai-lab';
import {DemoTable} from './DemoTable';
import {EvidenceView} from './WorkflowViews';
import './ai.css';
const base='/lab-api/ai-automation/';
async function call(path:string,body:unknown):Promise<AiRun>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(String(r.status));return r.json();}
export default function AiPage(){
 const locale=useLocale(),c=aiCopy[locale],documents=documentsFor(locale);
 const [preset,setPreset]=useState('clear'),[run,setRun]=useState<AiRun|null>(null),[runs,setRuns]=useState<AiRun[]>([]),[tab,setTab]=useState(0),[busy,setBusy]=useState(false),[suite,setSuite]=useState(false),[error,setError]=useState(false);
 const lock=useRef(false),stop=useRef(false);
 useEffect(()=>{setRun(null);setTab(0);void fetch(base+'runs').then(r=>r.ok?r.json():[]).then(value=>setRuns(value as AiRun[])).catch(()=>setError(true));},[locale]);
 function remember(r:AiRun){setRuns(old=>[...old.filter(x=>x.run_id!==r.run_id),r]);}
 async function execute(id=preset){if(lock.current)return;lock.current=true;setBusy(true);setError(false);try{const r=await call('run',{preset:id,locale});setRun(r);remember(r);setTab(1);}catch{setError(true);}finally{lock.current=false;setBusy(false);}}
 async function review(decision:string){if(!run||lock.current)return;lock.current=true;setBusy(true);setError(false);try{const r=await call('review',{run_id:run.run_id,decision});setRun(r);remember(r);setTab(5);}catch{setError(true);}finally{lock.current=false;setBusy(false);}}
 async function evaluate(){if(lock.current)return;lock.current=true;stop.current=false;setSuite(true);setBusy(true);setError(false);try{for(const p of presets){if(stop.current)break;const r=await call('run',{preset:p.id,locale});remember(r);if(r.findings.includes('DAILY_BUDGET_EXHAUSTED'))break;}}catch{setError(true);}finally{lock.current=false;setBusy(false);setSuite(false);}}
 const selected=presets.find(p=>p.id===preset)!;
 const current=runs.filter(r=>r.locale===locale),checks=current.flatMap(r=>r.checks);
 const evidence=(value:unknown)=><EvidenceView value={value}/>;
 const inspect=(r:AiRun)=>{setRun(r);setPreset(r.preset);setTab(7);};
 return <main className="ai-page"><section className="shell section"><Link to={localizedPath('/',locale)}>← {c.back}</Link><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="intro">{c.intro}</p><p>{c.disclosure}</p><p className="ai-flow">{c.flow}</p><p>{c.guide}</p><SimilarTask example="proof/ai-automation"/>
 <details><summary>{c.metadata}</summary>{evidence({provider:'Cloudflare Workers AI',model:AI_MODEL,...versions})}<p>{c.limitations}</p><p>{c.sourceLanguage}</p></details>
 </section><section className="shell ai-workbench">
 <div className="ai-controls"><label>{c.select}<select value={preset} disabled={busy} onChange={e=>{setPreset(e.target.value);setRun(null);setTab(0);}}>{presets.map(p=><option key={p.id} value={p.id}>{p[locale]}</option>)}</select></label><button className="button primary" disabled={busy} onClick={()=>void execute()}>{busy?c.busy:run?c.repeat:c.run}</button><button className="button secondary" disabled={busy} title={c.resetNote} onClick={()=>{setRun(null);setPreset('clear');setTab(0);setError(false);}}>{c.reset}</button></div>
 {error&&<p role="alert">{c.error}</p>}{run?.findings.includes('DAILY_BUDGET_EXHAUSTED')&&<p role="alert">{c.budget}</p>}
 {run&&<div className="ai-status" role="status"><strong data-testid="ai-status">{run.status}</strong><span>{run.status==='READY'?c.approvalReady:run.status==='UNKNOWN'?c.unknown:run.status==='PENDING'?c.pending:run.run_id}</span></div>}
 <nav className="ai-tabs" aria-label={c.title}>{c.tabs.map((name,i)=><button key={name} aria-current={tab===i?'step':undefined} onClick={()=>setTab(i)}>{i+1}. {name}</button>)}</nav>
 <article className="ai-stage"><h2>{c.tabs[tab]}</h2>
 {tab===0&&<><h3>{c.question}</h3><blockquote>{selected.input}</blockquote><p>{c.sourceLanguage}</p><details><summary>{c.knowledge}</summary>{documents.map(d=><article key={d.id}><h3>{d.id} · {d.title}</h3><p>{d.text}</p></article>)}</details></>}
 {tab!==0&&tab!==6&&!run&&<p>{c.empty}</p>}
 {run&&tab===1&&<><h3>{c.parsed}</h3>{run.parsed&&<DemoTable heads={[c.metric,c.actual]} rows={[[c.fields.outcome,run.parsed.requested_outcome??'—'],[c.fields.category,run.parsed.category],[c.fields.systems,run.parsed.systems_mentioned.join(', ')||'—'],[c.fields.objects,run.parsed.data_objects.join(', ')||'—'],[c.fields.missing,run.parsed.missing_information.join('; ')||'—'],[c.fields.next,run.parsed.suggested_next_step]]}/>}<details><summary>{c.parsed} · JSON</summary>{evidence(run.parsed)}</details>{run.parsed&&<p>{c.confidence}: {run.parsed.confidence}</p>}<details><summary>{c.raw}</summary><pre className="lab-json">{run.raw}</pre></details>{run.fault&&<><p>{c.fault} <code>{run.fault}</code></p><details><summary>{c.tested}</summary><pre className="lab-json">{run.tested_raw}</pre></details></>}{run.schema_errors.length>0&&<><h3>{c.schema}</h3>{evidence(run.schema_errors)}</>}</>}
 {run&&tab===2&&<><p>{c.retrieval}</p><blockquote>{run.input}</blockquote><DemoTable heads={[c.rank,c.document,c.actual]} rows={run.retrieved.map((d,i)=>[`${i+1} · ${d.score}`,d.doc.id+' · '+d.doc.title,d.doc.text])}/><h3>{c.quote}</h3>{run.parsed?.claims.length?run.parsed.claims.map((q,i)=><blockquote key={i}>{q.quote}<footer><code>{q.document_id}</code> · {run.retrieved.some(d=>d.doc.id===q.document_id&&d.doc.text===q.quote)?'PASS':'FAIL'}</footer></blockquote>):<p>{c.noEvidence}</p>}<p>{c.citation}</p></>}
 {run&&tab===3&&<><h3>{c.checks}</h3>{run.findings.length?evidence(run.findings):<p>{c.clean}</p>}<h3>{c.schema}</h3>{evidence({valid:!!run.parsed,errors:run.schema_errors})}<h3>{c.outcome}</h3><p>{c.safety}</p>{evidence(run.attempts)}</>}
 {run&&tab===4&&<><p>{c.review}</p>{evidence(run.findings)}<div className="ai-controls"><button className="button primary" data-testid="ai-approve" disabled={busy||!canApprove(run.status,run.findings)} onClick={()=>void review('approve')}>{c.approve}</button><button className="button secondary" disabled={busy||!['READY','REVIEW','UNKNOWN','FAILED'].includes(run.status)} onClick={()=>void review('reject')}>{c.reject}</button><button className="button secondary" disabled={busy||!['READY','REVIEW','UNKNOWN','FAILED'].includes(run.status)} onClick={()=>void review('clarify')}>{c.clarify}</button></div><p>{c.missing}</p><p>{c.decision}: {run.decision??'—'}</p></>}
 {run&&tab===5&&<><p>{c.simulation}</p><h3>{c.tool}</h3>{evidence(run.parsed?.proposed_tool)}<h3>{c.receipt}</h3>{run.action?evidence(run.action):<p>{c.noAction}</p>}{run.action&&<button className="button secondary" disabled={busy} onClick={()=>void review('approve')}>{c.repeat}</button>}</>}
 {tab===6&&<><h3>{c.suite}</h3><p>{c.suiteIntro}</p><p>{c.limitations}</p><button className="button primary" disabled={busy} onClick={()=>void evaluate()}>{c.runSuite}</button>{suite&&<button className="button secondary" onClick={()=>{stop.current=true;}}>{c.stop}</button>}<p role="status">{c.counts}: {current.length}/20 · {c.total}: {checks.length} · {c.passed}: {checks.filter(c=>c.status==='PASS').length} · {c.failed}: {checks.filter(c=>c.status==='FAIL').length} · {c.warning}: {checks.filter(c=>c.status==='WARNING').length}</p>
 <DemoTable heads={[c.select,c.status,c.expected,c.actual]} rows={presets.map(p=>{const r=current.find(r=>r.preset===p.id);return [p[locale],r?.status??c.notRun,p.review?c.blocked:c.approvalReady,r?<details><summary>{r.checks.filter(c=>c.status==='FAIL').length} FAIL · {c.inspect}</summary><button onClick={()=>inspect(r)}>{c.inspect}</button><DemoTable heads={[c.metric,c.status,c.expected,c.actual,c.reason]} rows={r.checks.map(c=>[c.metric,c.status,c.expected,c.actual,c.reason])}/></details>:'—'];})}/>
 <div className="ai-controls"><a className="button secondary" download href={base+'evaluation.json'}>{c.downloadJson}</a><a className="button secondary" download href={base+'evaluation.html'}>{c.downloadHtml}</a></div><h3>{c.exceptions}</h3>{current.filter(r=>r.findings.length>0).map(r=><p key={r.run_id}><button onClick={()=>inspect(r)}>{presets.find(p=>p.id===r.preset)![locale]}</button> · {r.findings.join(', ')}</p>)}</>}
 {run&&tab===7&&<><p>{c.downloadNote}</p><div className="ai-controls"><a className="button primary" download href={base+'report/'+run.run_id+'.json'}>{c.downloadJson}</a><a className="button secondary" download href={base+'report/'+run.run_id+'.html'}>{c.downloadHtml}</a></div><h3>{c.audit}</h3>{evidence(run.audit)}<details><summary>{c.metadata}</summary>{evidence(run)}</details></>}
 </article><div className="ai-controls ai-step-controls"><button className="button secondary" disabled={tab===0} onClick={()=>setTab(tab-1)}>{c.previous}</button><button className="button secondary" disabled={tab===7} onClick={()=>setTab(tab+1)}>{c.next}</button></div>
 </section></main>;
}
