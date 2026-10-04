import {useContactHref} from './contact-copy';
import {useDomainText,useDomainValue} from './domain-copy';
import {useErrorText} from './error-copy';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from './locale';
import { transitCopy } from './transit-copy';
import {transitUiCopy} from './transit-ui-copy';
import {selectCopy} from './localization-contract';
import { useCounted } from './localized-count';
import VerificationGuide from './VerificationGuide';
import {EvidenceView} from './WorkflowViews';
type Check = { rule: string; record: string; expected: string; actual: string; status: string; severity: string; evidence: string; action: string };
type Report = { run_id: string; source: string; timestamp: string; input_sha256: string; checks_executed: number; passed: number; failed: number; warnings: number; overall_status: string; checks: Check[]; discrepancies: Check[]; normalized: unknown[]; artifacts: Record<string, unknown>; reproduction: string };
type Scenario = { scenario: string; expected: string; actual: string[]; status: string; run: Report; input: unknown };
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error(`API ${response.status}: ${(await response.text()).slice(0, 220)}`);
  return response.json() as Promise<T>;
}
export default function LabPage({ slug }: { slug: string }) { const contact=useContactHref();  const domain=useDomainText(),valueText=useDomainValue(); const errorText=useErrorText();  const counted=useCounted();

  const locale = useLocale(); const en = locale === 'en'; const lab=selectCopy(transitCopy,locale);
  const T = selectCopy(transitUiCopy,locale);
  const [input, setInput] = useState(''); const [run, setRun] = useState<Report | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [tab, setTab] = useState('Wyniki');
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('FAIL');
  const [selected, setSelected] = useState<Check | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const evidenceTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (selected) dialogRef.current?.showModal(); }, [selected]);
  async function reset() { setError(''); setRun(null); setScenarios([]); setSelected(null); setTab('Wyniki'); setQuery(''); try { setInput(JSON.stringify(await api(`/lab-api/${slug}/fixture`), null, 2)); } catch { setError(errorText('Usługa laboratoryjna jest niedostępna. Ponów żądanie po chwili.')); } }
  useEffect(() => { void reset(); }, [slug]); // separate route instance owns its fixture
  async function reference(defect=false){setBusy(true);setError('');try{const data=await api<{realtime:{header:{timestamp:number}}}>(`/lab-api/${slug}/fixture`);if(defect)data.realtime.header.timestamp-=4812;setInput(JSON.stringify(data,null,2));setRun(await api<Report>(`/lab-api/${slug}/validate`,{data}));setTab('Wyniki');setFilter('FAIL');setQuery('');}catch(e){setError(errorText(String(e)));}finally{setBusy(false);}}
  async function execute(kind: 'validate' | 'scenarios') {
    setBusy(true); setError('');
    try {
      if (kind === 'validate') { setRun(await api<Report>(`/lab-api/${slug}/validate`, { data: JSON.parse(input) })); setTab('Wyniki'); }
      else { const result = await api<Scenario[]>(`/lab-api/${slug}/scenarios/all`, {}); setScenarios(result); setRun(result.find(s => s.run.failed > 0)?.run ?? result[0].run); setTab('Scenariusze'); }
    } catch (e) { setError(errorText(e instanceof Error ? e.message : 'Nie można wykonać testu')); }
    finally { setBusy(false); }
  }
  function download(format: 'json' | 'csv') { if (run) { const a = document.createElement('a'); a.href = `/lab-api/${slug}/runs/${run.run_id}/report?format=${format}`; a.download = `acceptance.${format}`; a.click(); } }
  const visible = (run?.checks ?? []).filter(c => (filter === 'ALL' || c.status === filter) && JSON.stringify(c).toLowerCase().includes(query.toLowerCase()));
  return <main>
    <section className="tool-intro shell"><Link className="back" to={en?'/en':'/'}>{T.back}</Link><div className="eyebrow">{T.demo}</div><p className="lab-trust">{T.trust}</p><h1>{lab.title}</h1>{slug==='transit-validation' && <p className="lab-standards">GTFS · GTFS-RT · NeTEx · SIRI</p>}<p>{lab.problem}</p><p><strong>{T.buyer}</strong> {T.reportLine}</p><p className="lab-boundary">{T.first} {T.boundary}</p></section>
    <section className="shell pipeline five lab-flow">{[[T.flow[0],lab.input],[T.flow[1],lab.processing],[T.flow[2],lab.failures],[T.flow[3],lab.result],[T.flow[4],lab.acceptance]].map(([title,text])=><article key={title}><b>{title}</b><p>{text}</p></article>)}</section>
    <section className="workspace shell lab-workspace"><VerificationGuide/><p>{T.controlled}</p><div className="workspace-actions"><button disabled={busy||!input} onClick={()=>void reference()}>{T.runRef}</button><button disabled={busy||!input} onClick={()=>void reference(true)}>{T.introduce}</button><button disabled={busy||!input} onClick={()=>void reference()}>{T.restore}</button></div><div className="workspace-top"><div><span className="kicker">{T.scope}</span><h2>{T.pack}</h2><p>{T.separate}</p></div><div className="workspace-actions"><button disabled={busy || !input} className="button primary" onClick={()=>void execute('validate')}>{T.validate}</button><button disabled={busy || !input} className="button secondary" onClick={()=>void execute('scenarios')}>{T.runScenarios}</button><button disabled={busy} className="button secondary" onClick={()=>void reset()}>{T.reset}</button></div></div>
      {error && <p role="alert" className="error">{error}</p>}{busy && <p role="status">{T.processing}</p>}
      <nav className="lab-tabs" aria-label={T.sections}>{['Wejście','Wyniki','Scenariusze','Model i mapowanie','Raport','Architektura'].map(name=><button aria-pressed={tab===name} key={name} onClick={()=>setTab(name)}>{T.tabs[name as keyof typeof T.tabs]}</button>)}</nav>
      {tab==='Wejście' && <><p>{T.inputHelp}</p><label>{T.inputJson}<textarea aria-label={T.inputJson} value={input} onChange={e=>setInput(e.target.value)} spellCheck={false}/></label></>}
      {tab==='Wyniki' && <>{run ? <><div className="exception-value"><div><span>{T.inputValidation}</span><strong data-testid="lab-overall">{run.overall_status}</strong></div><p>{counted(run.failed, ['błąd','błędy','błędów'])} / {counted(run.checks_executed, ['sprawdzenie','sprawdzenia','sprawdzeń'])}. {T.valid}: {run.passed}.</p></div><div className="lab-toolbar"><label>{T.result} <select aria-label={T.result} value={filter} onChange={e=>setFilter(e.target.value)}><option>FAIL</option><option>PASS</option><option value="ALL">{T.all}</option></select></label><input aria-label={T.searchEvidence} placeholder={T.searchPlaceholder} value={query} onChange={e=>setQuery(e.target.value)}/><span>{counted(visible.length, ['pozycja','pozycje','pozycji'])}</span></div><div className="table-scroll"><table><thead><tr><th>{T.ruleSource}</th><th>{T.priority}</th><th>{T.expected}</th><th>{T.actual}</th><th>{T.result}</th><th>{T.evidence}</th></tr></thead><tbody>{visible.map((c,i)=><tr key={i}><td><strong>{c.rule}</strong><br/><code>{c.record}</code></td><td>{valueText(c.severity)}</td><td>{domain(c.expected)}</td><td className="lab-value">{c.actual}</td><td>{c.status}</td><td><button onClick={event=>{evidenceTrigger.current=event.currentTarget;setSelected(c);}}>{T.details}</button></td></tr>)}</tbody></table></div>{visible.length===0 && <p>{T.noFilter}</p>}</> : <div className="empty-state"><h3>{T.emptyHead}</h3><p>{T.emptyBody}</p></div>}</>}
      {tab==='Scenariusze' && <><p>{T.scenarioIntro}</p>{scenarios.length===0&&<p>{T.noScenarios}</p>}<div className="table-scroll"><table><thead><tr><th>{T.scenario}</th><th>{T.expected}</th><th>{T.detected}</th><th>{T.acceptance}</th><th>{T.reproduction}</th></tr></thead><tbody>{scenarios.map(s=><tr key={s.scenario} data-testid="scenario-row"><td>{s.scenario}</td><td>{s.expected}</td><td>{s.actual.join(', ')}</td><td>{s.status}</td><td><button onClick={()=>{setInput(JSON.stringify(s.input,null,2));setRun(s.run);setTab('Wyniki');}}>{T.openRun}</button></td></tr>)}</tbody></table></div></>}
      {tab==='Model i mapowanie' && <><h3>{T.modelTitle}</h3><EvidenceView value={run?{normalized:run.normalized,artifacts:run.artifacts}:null}/></>}
      {tab==='Raport' && <>{run ? <><h3>{run.run_id}</h3><p>{T.clock} {run.timestamp} · {counted(run.checks_executed, ['sprawdzenie','sprawdzenia','sprawdzeń'])} · {run.overall_status}</p><p>{T.reproduce}</p><div className="workspace-actions"><button onClick={()=>download('json')}>{T.downloadJson}</button><button onClick={()=>download('csv')}>{T.downloadCsv}</button></div><pre className="lab-json">{JSON.stringify(run,null,2)}</pre></> : <p>{T.firstRun}</p>}</>}
      {tab==='Architektura' && <><h3>{T.archHead}</h3><p>{T.archBody}</p><a className="text-link" href="/lab-api/docs" target="_blank" rel="noreferrer">{T.docs}</a><h3>{T.params}</h3><p>{lab.limits}</p></>}
    </section>
    <section className="shell section"><h2>{T.verify}</h2><p>{T.verifyBody}</p><h3>{T.problem}</h3><p>{lab.acceptance}</p><p>{lab.limits}</p><a className="button primary" href={contact}>{T.describe}</a></section>
    <dialog ref={dialogRef} className="lab-evidence-dialog" aria-label={T.dialog} onClose={()=>{setSelected(null);evidenceTrigger.current?.focus();}}>{selected && <div><button autoFocus onClick={()=>dialogRef.current?.close()}>{T.closeEvidence}</button><h2>{selected.rule}</h2><p><strong>{T.source}</strong> {selected.record}</p><pre className="lab-json">{JSON.stringify(selected,null,2)}</pre></div>}</dialog>
  </main>;
}
