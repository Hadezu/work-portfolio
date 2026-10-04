import {useContactHref} from './contact-copy';
import {useErrorText} from './error-copy';
import {useDomainValue} from './domain-copy';
import { useLocale, localizedPath } from './locale';
import { useProofLabel } from './proof-labels';
import { useProofText } from './proof-copy';
import VerificationGuide from './VerificationGuide';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCounted } from './localized-count';
import { filterScenarios, type Filters, type WorkflowReport } from './workflow-model';
import { EvidenceView, PermissionMatrix, ResultSummary, ScenarioTable } from './WorkflowViews';

async function call<T>(path:string,data?:unknown):Promise<T> {
  const response=await fetch('/lab-api/workflow-access/'+path,data===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok) throw new Error(`Walidacja wejścia: HTTP ${response.status}. ${await response.text()}`);
  return response.json() as Promise<T>;
}
const initialFilters:Filters={status:'ALL',severity:'ALL',type:'ALL',search:''};
export default function WorkflowPage() { const contact=useContactHref();  const errorText=useErrorText();  const enumText=useDomainValue();  const counted=useCounted();  const homePath=localizedPath('/',useLocale()); const t = useProofText(); const label = useProofLabel();
  const [input,setInput]=useState(''); const [report,setReport]=useState<WorkflowReport|null>(null);
  const [tab,setTab]=useState('Wyniki'); const [filters,setFilters]=useState(initialFilters);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [evidence,setEvidence]=useState<unknown>(null);
  const [lastRerun,setLastRerun]=useState(''); const dialog=useRef<HTMLDialogElement>(null);
  const original=useRef(''); const current=useRef('');
  useEffect(()=>{let active=true; call<unknown>('fixtures').then(data=>{if(active){const s=JSON.stringify(data,null,2);original.current=s;current.current=s;setInput(s);}}).catch(()=>{if(active)setError(errorText('Nie udało się pobrać wejścia. Odśwież stronę, aby ponowić żądanie.'));});return()=>{active=false;};},[]);
  async function run(defect=false,restore=false) {
    setBusy(true);setError('');setLastRerun('');
    try {
      const data=JSON.parse(restore?original.current:input);
      if(defect){const baseline=JSON.parse(original.current);baseline.roles.find((r:{id:string})=>r.id==='employee').permissions.push({resource:'configuration',action:'administer'}); current.current=JSON.stringify(baseline,null,2);setInput(current.current);}
      else {current.current=JSON.stringify(data,null,2);if(restore)setInput(current.current);}
      setReport(await call<WorkflowReport>('evaluate',{data:JSON.parse(current.current)}));setTab('Wyniki');setFilters({...initialFilters,status:defect?'FAIL':'ALL'});
    }catch(e){setError(errorText(e instanceof Error?e.message:'Błąd wykonania'));}finally{setBusy(false);}
  }
  async function rerun(id:string) {
    setBusy(true);setError('');
    try{const data=JSON.parse(current.current);data.cases=data.cases.filter((c:{scenario_id:string})=>c.scenario_id===id);const r=await call<WorkflowReport>('evaluate',{data});setLastRerun(`${id}: ${r.overall_status} · ${r.run_id}`);show(r.artifacts.scenarios[0]);}catch(e){setError(errorText(String(e)));}finally{setBusy(false);}
  }
  function show(value:unknown){setEvidence(value);dialog.current?.showModal();}
  async function download(format:'json'|'csv') {
    if(!report)return;
    try {const r=await fetch(`/lab-api/workflow-access/runs/${report.run_id}/report?format=${format}`);if(!r.ok)throw new Error('Nie można pobrać raportu');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=`workflow-acceptance.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(errorText(String(e)));}
  }
  const rows=report?.artifacts.scenarios??[];const visible=filterScenarios(rows,filters);
  return <main>
    <section className="shell tool-intro workflow-intro"><Link className="back" to={homePath}>{t('s084694e0b7e7')}</Link><div className="eyebrow">{t('s2b3e6f59e1b3')}</div><p className="wf-trust">{t('s5ceffcb0c3a2')}</p><h1>{t('se5323c212ad6')}</h1><p className="lab-standards">{t('sac2c083a92fd')}</p><p><strong>{t('sc14c246310c9')}</strong>{t('sca97617036ff')}</p><p className="lab-boundary">{t('s3db4ffaaef45')}</p></section>
    <section className="shell pipeline five">{[['Wejście','Użytkownicy, role, grupy, zasoby i workflow w edytowalnym JSON.'],['Jak działa kontrola','RBAC → przejścia → akceptacje → porównanie expected/actual.'],['Co system wykrywa','Brak roli, konflikt, pominięcie stanu lub wymaganej akceptacji.'],['Co otrzymujesz','Raport rozbieżności, uporządkowane dowody i PASS/FAIL.'],['Jak odbierany jest wynik','Test przechodzi, gdy decyzja i reguła odpowiadają uzgodnionemu oczekiwaniu.']].map(([h,p])=><article key={h}><b>{label(h)}</b><p>{label(p)}</p></article>)}</section>
    <section className="workspace shell lab-workspace"><VerificationGuide/><div className="workspace-top"><div><span className="kicker">{t('se6a475913154')}</span><h2>{t('s30420b31c989')}</h2><p>{t('sac73561bf9a1')}</p></div><div className="workspace-actions"><button className="button primary" disabled={busy||!input} onClick={()=>void run()}>{t('s18ff560ca85a')}</button><button className="button secondary" disabled={busy||!input} onClick={()=>void run(true)}>{t('s87604711bada')}</button><button disabled={busy} onClick={()=>void run(false,true)}>{t('s515a0ab1d2aa')}</button></div></div>
      <div className="wf-note" data-testid="workflow-mode"><strong>{report?.artifacts.configuration==='controlled'?t('s298e1308fdc9'):report?.artifacts.configuration==='custom'?t('s553807f517a7'):t('s40affbabe284')}</strong><p>{report?.artifacts.configuration==='controlled'?t('sad4bf8ad8d6e'):t('s168457c52fe9')}</p></div>
      {busy&&<p role="status">{t('s4b115420d5a5')}</p>}{error&&<p role="alert" className="error">{error}</p>}{lastRerun&&<p role="status">{t('se5d8c12364f8')}{lastRerun}</p>}
      <h3>{t('s34c34a5f83a5')}</h3><p>{t('sf90b38090620')}</p><nav className="lab-tabs" aria-label={t('se9f84da57028')}>{['Wejście','Wyniki','Scenariusze','Macierz uprawnień','Workflow','Raport','Architektura'].map(t=><button key={t} aria-pressed={t===tab} onClick={()=>setTab(t)}>{label(t)}</button>)}</nav>{!report&&["Workflow"].includes(tab)&&<div className="empty-state"><h3>{t('sc80320394f65')}</h3><p>{t('s7c2891283548')}</p></div>}
      {tab==='Wejście'&&<><h3>{t('s7013598ad54d')}</h3><p>{t('s480422c0c23c')}</p><label>{t('s38c46cf1fa3c')}<textarea aria-label={t('s85f9dfbc7cff')} value={input} onChange={e=>setInput(e.target.value)} spellCheck={false}/></label></>}
      {(tab==='Wyniki'||tab==='Scenariusze')&&<>{report?<><ResultSummary report={report}/><div className="lab-toolbar"><label>{t('sc7facc820c23')}<select aria-label={t('s8c262f1ad7a4')} value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>{['ALL','PASS','FAIL'].map(x=><option key={x} value={x}>{enumText(x)}</option>)}</select></label><label>{t('se22538e7e0d8')}<select aria-label={t('s89107103b539')} value={filters.severity} onChange={e=>setFilters({...filters,severity:e.target.value})}>{['ALL','high','warning'].map(x=><option key={x} value={x}>{enumText(x)}</option>)}</select></label><label>{t('scaabc03aa82a')}<select aria-label={t('s505a47457d3e')} value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}>{['ALL','rbac','workflow','approval','conflict'].map(x=><option key={x} value={x}>{enumText(x)}</option>)}</select></label><input aria-label={t('se9b8e2de874d')} placeholder={t('s7be153d27343')} value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/><span>{counted(visible.length,['pozycja','pozycje','pozycji'])}</span></div><ScenarioTable rows={visible} onEvidence={show} onRerun={id=>{if(!busy)void rerun(id);}}/></>:<p>{t('sdb365e45131b')}</p>}</>}
      {tab==='Macierz uprawnień'&&<><h3>{t('s9b890ee0cbf5')}</h3><p>{t('sd25ff98c0523')}</p>{report?<PermissionMatrix cells={report.artifacts.matrix} onSelect={show}/>:<p>{t('sfa74adc496e2')}</p>}</>}
      {tab==='Workflow'&&<><h3>{t('se0d26e91292b')}</h3><p>{t('sced20ae021aa')}</p><p>{t('s185c3fabaf5e')}</p>{report&&<><details><summary>{t('s346d14b32daf')}</summary><EvidenceView value={report.artifacts.workflow}/></details><div className="table-scroll"><table><thead><tr><th>{t('s3acd1bb4b27d')}</th><th>{t('s88aec9a071df')}</th><th>{t('s6b62ef2c86fd')}</th><th>{t('se5a33d15512c')}</th><th>{t('sfcd294047ec7')}</th><th>{t('s1c45911567c2')}</th></tr></thead><tbody>{rows.filter(r=>r.action==='transition').map(r=><tr key={r.scenario_id} className={r.actual==='DENY'?'wf-denied':''}><td>{r.evidence.request_id}<br/>{r.user}</td><td>{enumText(r.evidence.current_state??'—')} → {enumText(r.evidence.requested_transition??'—')}</td><td>{r.evidence.approvals_required.map(enumText).join(', ')||t('s1ee9efdeacbd')}</td><td>{r.evidence.approvals_found.map(a=>`${a.order}. ${enumText(a.role)}: ${a.actor}`).join('; ')||t('s946d517eef62')}</td><td>{r.actual} / {r.result}<br/>{r.rule}</td><td><button onClick={()=>show(r)}>{t('s1c45911567c2')}</button></td></tr>)}</tbody></table></div></>}</>}
      {tab==='Raport'&&<>{report?<><h3>{t('s9567867ae77b')}</h3><ResultSummary report={report}/><dl className="wf-report"><dt>{t('s26d3e7aaace4')}</dt><dd>{report.run_id}</dd><dt>{t('s350b978d013e')}</dt><dd>{report.timestamp}{t('s0bcf71c19bc3')}</dd><dt>{t('s73373981642c')}</dt><dd>{report.ruleset}</dd><dt>{t('s8dafcc5148a1')}</dt><dd>{report.input_sha256}</dd></dl><div className="workspace-actions"><button onClick={()=>void download('json')}>{t('s4dc00251c5cd')}</button><button onClick={()=>void download('csv')}>{t('s319b3b37a03d')}</button></div><p>{t('s8ebc75bd58e3')}</p><EvidenceView value={report}/></>:<p>{t('sfa74adc496e2')}</p>}</>}
      {tab==='Architektura'&&<><h3>{t('sf8ae7edec165')}</h3><p>{t('s8947121496e8')}</p><p>{t('s8234298da1f6')}</p><a href="/lab-api/docs" target="_blank" rel="noreferrer">{t('s59ac6a3d93c2')}</a></>}
    </section>
    <section className="shell section"><h2>{t('see04c89ef492')}</h2><p>{t('s7bc3b57f2174')}</p><h3>{t('s5756755bb8ed')}</h3><p>{t('s576fef94fbf3')}</p><h3>{t('sddc798a1a631')}</h3><p>{t('sb8ada606e9fb')}</p><p>{t('s8c8ef8f6251b')}</p><a className="button primary" href={contact}>{t('s33602450032d')}</a></section>
    <dialog ref={dialog} className="issue-dialog" onClose={()=>setEvidence(null)}><button className="dialog-close" aria-label={t('sb56e1e647517')} onClick={()=>dialog.current?.close()}>{t('s8db71ed28b0f')}</button><h2>{t('s2528f2dade60')}</h2><EvidenceView value={evidence}/></dialog>
  </main>;
}
