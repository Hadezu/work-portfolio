import {useCounted} from './localized-count';
import {useContactHref} from './contact-copy';
import {useDomainValue} from './domain-copy';
import {useDomainText} from './domain-copy';
import { useLocale, localizedPath } from './locale';
import { useProofLabel } from './proof-labels';
import { useProofText } from './proof-copy';
import ProofFlow from './ProofFlow';
import VerificationGuide from './VerificationGuide';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BridgeException, BridgeRunMode, bridgeExceptionsToCsv, bridgeExecutionReportJson, createBridgeDataset, detectBridgeExceptions, normalizeBridgeData, runBridgeExecution } from './data-bridge';


export default function DataBridgePage() { const counted=useCounted(); const contact=useContactHref();  const enumText=useDomainValue();  const valueText=useDomainValue();  const domain=useDomainText();  const homePath=localizedPath('/',useLocale()); const t = useProofText(); const label = useProofLabel();
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('Wszystkie');
  const [source, setSource] = useState('Wszystkie');
  const [actionOnly, setActionOnly] = useState(true);
  const [selected, setSelected] = useState<BridgeException | null>(null);
  const [integrationMode, setIntegrationMode] = useState<BridgeRunMode>('incremental-baseline');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dataset,setDataset] = useState(()=>createBridgeDataset());
  const normalized = useMemo(() => normalizeBridgeData(dataset), [dataset]);
  const exceptions = useMemo(() => detectBridgeExceptions(dataset), [dataset]);
  const filtered = exceptions.filter((item) => {
    const text = `${item.recordId} ${item.type} ${item.issue} ${item.source}`.toLowerCase();
    return (!actionOnly || item.actionable) && (severity === 'Wszystkie' || item.severity === severity) && (source === 'Wszystkie' || item.source === source) && text.includes(query.toLowerCase());
  });
  const sources = [...new Set(exceptions.map((item) => item.source))];
  const inputRecords = dataset.orders.length + dataset.inventory.length + dataset.shipments.length;
  const affectedOrders = new Set(exceptions.flatMap((item) => item.recordId.match(/ORD-\d+/g) ?? [])).size;
  const normalRecords = normalized.length - affectedOrders;
  const executionReport = useMemo(() => runBridgeExecution(integrationMode), [integrationMode]);

  const run = () => { setDataset(createBridgeDataset());setRunning(true); setQuery(''); setSeverity('Wszystkie'); setSource('Wszystkie'); setActionOnly(true); };
  const reference = (defect=false) => { const data=createBridgeDataset(true);if(defect)data.shipments[0].trackingNumber='';setDataset(data);setRunning(true);setQuery('');setSeverity('Wszystkie');setSource('Wszystkie');setActionOnly(true); };
  const reset = () => { setRunning(false); setQuery(''); setSeverity('Wszystkie'); setSource('Wszystkie'); setActionOnly(true); setSelected(null); };
  const exportCsv = () => {
    const blob = new Blob([`\uFEFF${bridgeExceptionsToCsv(exceptions)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'data-bridge-wyjatki.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportExecutionReport = () => {
    const blob = new Blob([bridgeExecutionReportJson(executionReport)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `data-bridge-execution-${executionReport.runId.toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const openDetails = (item: BridgeException) => { setSelected(item); requestAnimationFrame(() => dialogRef.current?.showModal()); };

  return <main className="bridge-page">
    <section className="tool-intro shell bridge-intro"><Link className="back" to={homePath}>{t('s084694e0b7e7')}</Link><div className="eyebrow">{t('sc951f1afcc83')}</div><h1>{t('sb5fead6d6179')}<br/><span>{t('se37a63b4f755')}</span></h1><p>{t('sd539c63c39f4')}</p>
      <div className="privacy"><span>●</span><div><strong>{t('s0756bd43071a')}</strong><small>{t('s3804ad575a95')}</small></div></div>
    </section>

    <section className="workspace shell bridge-workspace" aria-label={t('s139f86f7eb2d')}>
      <div className="workspace-top"><div><span className="kicker">{t('s89abaa055eae')}</span><h2>{t('sf6670dd5fa72')}</h2><p>{t('sefdd1100207b')}</p></div><div className="workspace-actions"><button className="button secondary" onClick={exportExecutionReport}>{t('s96bf51ddd360')}</button></div></div>
      <div className="lab-toolbar">{([
        ['incremental-baseline','Baseline import'],['incremental-new','Nowe po checkpoint'],['interrupted','Przerwanie'],['resume','Resume'],['replay','Replay'],['rate-limit','429 / retry'],['webhook-valid','Webhook OK'],['webhook-duplicate','Duplikat'],['webhook-invalid-signature','Zły podpis'],['webhook-stale','Stare zdarzenie'],['webhook-repair','Repair replay'],['snapshot','Snapshot ×2'],
      ] as [BridgeRunMode,string][]).map(([mode,caption])=><button key={mode} aria-pressed={integrationMode===mode} onClick={()=>setIntegrationMode(mode)}>{label(caption)}</button>)}</div>
      <div className="exception-value"><div><span>{t('s8f482ec682c0')}</span><strong data-testid="bridge-execution-status">{executionReport.status} · {executionReport.runId}</strong></div><p>{executionReport.correlationId}{t('sd4789debefb6')}{executionReport.mode}{t('sa90d62b8ea9c')}{executionReport.checkpoint}</p></div>
      <div className="summary-grid bridge-summary"><article><span>{t('s36ecb4f86691')}</span><strong>{executionReport.input}</strong><small>{executionReport.contractVersion}</small></article><article className="ok"><span>{t('s3f288e47f764')}</span><strong>{executionReport.inserted} / {executionReport.updated}</strong><small>{t('sfd1913ef8e40')}{executionReport.unchanged}</small></article><article><span>{t('s1c265befb589')}</span><strong data-testid="bridge-duplicates">{executionReport.duplicatesPrevented}</strong><small>{t('s155eb29215dd')}</small></article><article className={executionReport.rejected?'bad':'ok'}><span>{t('sbab678c85568')}</span><strong>{executionReport.rejected} / {executionReport.attempts}</strong><small>{executionReport.durationMs}{t('s20249a0dcc95')}</small></article></div>
      <div className="table-scroll" tabIndex={0}><table><thead><tr><th>{t('s48dd3e5c178b')}</th><th>{t('s2bede2e1b680')}</th><th>{t('s4b5eaf07e411')}</th><th>{t('s1c45911567c2')}</th></tr></thead><tbody>{executionReport.events.map((event,index)=><tr key={`${event.type}-${index}`}><td>{label(event.stage)}</td><td>{event.type}</td><td><code>{event.entity}</code></td><td>{valueText(event.message)}{event.attempt&&<small>{t('s1b814539a8e1')}{event.attempt}</small>}{event.cursor&&<small>{t('s49f9c8fa566d')}{event.cursor}</small>}</td></tr>)}</tbody></table></div>
      {executionReport.issues.length>0&&<><h3>{t('sb0b504af144f')}</h3><div className="table-scroll" tabIndex={0}><table><thead><tr><th>{t('s3843971dcfde')}</th><th>{t('sf87248d78a7b')}</th><th>{t('sdfaaa170c07d')}</th><th>{t('s3a1aea517e29')}</th><th>{t('s2457a7874bba')}</th><th>{t('sc8dae6371b33')}</th></tr></thead><tbody>{executionReport.issues.map(issue=><tr key={issue.id}><td><code>{issue.id}</code><br/><small>{issue.runId}</small></td><td>{valueText(issue.category)}</td><td>{issue.ruleId}</td><td>{valueText(issue.reason)}<br/><small>{issue.timestamp}{t('seb47e4d9a557')}{issue.attempts}</small></td><td>{valueText(issue.expected)}<br/>{valueText(issue.actual)}</td><td>{issue.replayEligible?t('s2959bb1215ae'):t('scd5b158f21b7')}</td></tr>)}</tbody></table></div></>}
      <details className="normalized-panel"><summary>{t('s5d0c1ea1a2da')}</summary><EvidenceBlock value={{summary:executionReport.summary,target:executionReport.target,evidence:executionReport.evidence}}/></details>
    </section>

    <ProofFlow input={t('s79b0ecda8fca')} processing={t('s435713a27489')} failures={t('sa7331e26473a')} output={t('s7cb6c3cb9b8d')} acceptance={t('sa3c9b60e17c8')}/>
    <section className="shell bridge-architecture" aria-label={t('sb957d705d85a')}>
      {['Eksport / API read-only', 'Normalizacja', 'Reguły', 'Kolejka wyjątków'].map((caption, index) => <div className="bridge-arch-step" key={caption}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label(caption)}</strong>{index < 3 && <i aria-hidden="true">→</i>}</div>)}
    </section>

    <section className="workspace shell bridge-workspace" aria-label={t('s48f948bfab57')}>
      <VerificationGuide/><p>{t('sfbfb9f99061b')}</p><div className="workspace-actions"><button onClick={()=>reference()}>{t('sea07f6417941')}</button><button onClick={()=>reference(true)}>{t('s87604711bada')}</button><button onClick={()=>reference()}>{t('s87120779fa5f')}</button></div>{running&&<p data-testid="bridge-overall"><strong>{exceptions.length?t('s425305e25df9'):t('s2f9acb02faa1')}</strong> · {exceptions.length?t('sa2e440812ac0'):t('s7acf57be7dba')}</p>}
      <div className="workspace-top"><div><span className="kicker">{t('sb98e9510aecd')}</span><h2>{t('sb2e0154ca12f')}</h2><p>{t('s0a14c76bdf1d')}</p></div><div className="workspace-actions"><button className="button primary" onClick={run}>{t('sff57eaa470a7')}</button>{running && <button className="button secondary" onClick={reset}>{t('sa0a5e74cd728')}</button>}</div></div>

      {!running ? <div className="empty-state bridge-empty"><div className="empty-icon">⇢</div><h3>{t('seb92c5807e6f')}</h3><p>{t('s54d19aaa0cc0')}</p></div> : <div className="results" data-testid="bridge-results">
        <div className="exception-value"><div><span>{t('s21ef24ba58b6')}</span><strong>{counted(exceptions.length,['sprawa wymaga uwagi','sprawy wymagają uwagi','spraw wymaga uwagi'])}</strong></div><p>{normalRecords}{t('sfd495acb09a0')}</p></div>
        <div className="summary-grid bridge-summary"><article><span>{t('s6ef125ddbb7a')}</span><strong>{inputRecords}</strong><small>{t('s076f2dceb74e')}</small></article><article className="ok"><span>{t('sa24aaa126631')}</span><strong>{normalized.length}</strong><small>{t('s1406d02c80a1')}</small></article><article className="bad"><span>{t('s2b23072b2e78')}</span><strong data-testid="bridge-count">{exceptions.length}</strong><small>{counted(new Set(exceptions.map((item) => item.type)).size,['typ','typy','typów'])}</small></article><article><span>{t('sc65913e29a7f')}</span><strong>{exceptions.filter((item) => item.severity === 'wysoki').length}</strong><small>{t('s434015cff1d0')}</small></article></div>

        <div className="action-toggle"><label><input type="checkbox" checked={actionOnly} onChange={(event) => setActionOnly(event.target.checked)}/><span aria-hidden="true"></span><b>{t('sc6a26b4d713c')}</b></label><small>{t('sfa1f28e4bf85')}</small></div>

        <div className="table-panel"><div className="table-tools bridge-tools"><div><h3>{t('s6b9c009e9e3a')}</h3><span data-testid="bridge-filter-count">{filtered.length}{t('s7ed4087095f0')}{exceptions.length}{t('se1a434dc5474')}</span></div><div className="filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('se37b8ed75528')} aria-label={t('s385fe75852a0')}/><select aria-label={t('sebbbc59ba95e')} value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="Wszystkie">{t('s11366eeda268')}</option><option value="wysoki">{t('s9356c8a12559')}</option><option value="średni">{t('s416dc3356a6c')}</option><option value="niski">{t('s90a9a1c876d1')}</option></select><select aria-label={t('s1e6830da90e9')} value={source} onChange={(event) => setSource(event.target.value)}><option value="Wszystkie">{t('s11366eeda268')}</option>{sources.map((item) => <option key={item} value={item}>{enumText(item)}</option>)}</select><button className="button secondary export" onClick={exportCsv}>{t('se7b78d01fe01')}</button></div></div>
          <div className="table-scroll" tabIndex={0}><table className="bridge-table"><thead><tr><th>{t('s803fd14c770e')}</th><th>{t('s94e2e1623946')}</th><th>{t('s8cf67d704387')}</th><th>{t('sa1c5ae7bcb34')}</th><th>{t('s792f1c199bdb')}</th><th>{t('scaf8d74aa0ff')}</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className={`severity ${item.severity}`}>{valueText(item.severity)}</span></td><td>{domain(item.source)}</td><td><code>{item.recordId}</code></td><td><strong>{domain(item.type)}</strong><small>{domain(item.issue)}</small></td><td>{valueText(item.detectedValue)}</td><td>{domain(item.recommendedAction)}</td><td><button className="details" onClick={() => openDetails(item)} aria-label={`${t('s92f18f0c1655')} ${item.id}`}>{t('s92f18f0c1655')}</button></td></tr>)}</tbody></table></div>
        </div>

        <details className="normalized-panel"><summary>{t('sfd3998fee75d')}</summary><div className="table-scroll" tabIndex={0}><table><thead><tr><th>{t('s20196d55a3a0')}</th><th>{t('s69da56ba6fca')}</th><th>{t('sf88ba99c9b34')}</th><th>{t('s56f62b01c9dc')}</th><th>{t('s540febb3d7c4')}</th><th>{t('s448ca9984272')}</th><th>{t('sf2ed870a6af8')}</th></tr></thead><tbody>{normalized.map((item) => <tr key={item.orderId}><td><code>{item.orderId}</code></td><td>{item.externalId || '—'}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{item.orderStatus}</td><td>{item.availableQuantity ?? '—'}</td><td>{item.shipmentStatus ?? '—'}</td></tr>)}</tbody></table></div></details>
      </div>}
    </section>

    <section className="technical shell section"><div className="section-heading"><div><span className="kicker">{t('s4a8befa1a1f8')}</span><h2>{t('s92387b947a58')}</h2></div><p>{t('s41aae3266c02')}</p></div><div className="pipeline five"><article><b>{t('sbbce86fe202e')}</b><h3>{t('s076f2dceb74e')}</h3><p>{t('s9c3d31c80d0e')}</p></article><article><b>{t('s7125050a5af8')}</b><h3>{t('s4fe8df9d0a61')}</h3><p>{t('sacf7d3f83c05')}</p></article><article><b>{t('s55c28fd8a42c')}</b><h3>{t('s3cb0ae38f2d2')}</h3><p>{t('se55acd8b26d7')}</p></article><article><b>{t('sdfc73706616b')}</b><h3>{t('s394a689edb97')}</h3><p>{t('se0948fc6e3b4')}</p></article><article><b>{t('s3e02227a1508')}</b><h3>{t('s05c0ea1733df')}</h3><p>{t('s1517b3da5a7d')}</p></article></div></section>

    <section className="commercial"><div className="shell commercial-grid"><div><span className="kicker">{t('s58876e021ab2')}</span><h2>{t('s9f5c3b537802')}</h2></div><div><p><strong>{t('s19a19b7cd7c6')}</strong>{t('se359249684bb')}</p><p>{t('sf30ddd467f13')}</p><a className="button primary" href={contact}>{t('s33602450032d')}</a></div></div></section>

    <dialog ref={dialogRef} onClose={() => setSelected(null)} className="issue-dialog bridge-dialog">{selected && <><button className="dialog-close" onClick={() => dialogRef.current?.close()} aria-label={t('s00b8d851752c')}>{t('s8db71ed28b0f')}</button><span className={`severity ${selected.severity}`}>{valueText(selected.severity)}</span><h2>{domain(selected.type)}</h2><dl><div><dt>{t('s793e30c8998c')}</dt><dd>{domain(selected.source)} · <code>{selected.recordId}</code></dd></div><div><dt>{t('sa1c5ae7bcb34')}</dt><dd>{domain(selected.issue)}</dd></div><div><dt>{t('s792f1c199bdb')}</dt><dd>{valueText(selected.detectedValue)}</dd></div><div><dt>{t('scaf8d74aa0ff')}</dt><dd>{domain(selected.recommendedAction)}</dd></div></dl></>}</dialog>
  </main>;
}

function EvidenceBlock({value}:{value:unknown}){return <pre className="lab-json">{JSON.stringify(value,null,2)}</pre>;}
