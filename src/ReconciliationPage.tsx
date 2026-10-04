import {ProofBusinessContext,ProofNextStep} from './ProofOutreach';
import {useCounted} from './localized-count';
import {useErrorCopy} from './error-copy';
import {useDomainValue,useDomainText} from './domain-copy';
import {useProofText} from './proof-copy';
import ProofFlow from './ProofFlow';
import VerificationGuide from './VerificationGuide';
import {type ChangeEvent,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import Papa from 'papaparse';
import {createDemoDataset,type Dataset,type Discrepancy,reconcile,toCsv} from './reconciliation';
import {localizedPath,useLocale} from './locale';
type UploadKey = keyof Dataset;
const uploadConfig: { key: UploadKey; label: string }[] = [{ key: 'orders', label: 'orders.csv' }, { key: 'invoices', label: 'invoices.csv' }, { key: 'warehouse', label: 'warehouse.csv' }];

export default function Reconciliation() { const counted=useCounted(); const errorCopy=useErrorCopy(); const valueText=useDomainValue();  const domain=useDomainText();  const homePath=localizedPath('/',useLocale()); const t = useProofText();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [uploads, setUploads] = useState<Partial<Dataset>>({});
  const [uploadError, setUploadError] = useState('');
  const [typeFilter, setTypeFilter] = useState('Wszystkie typy');
  const [severityFilter, setSeverityFilter] = useState('Wszystkie');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Discrepancy | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const issues = useMemo(() => dataset ? reconcile(dataset) : [], [dataset]);
  const filtered = useMemo(() => issues.filter((issue) => (typeFilter === 'Wszystkie typy' || issue.type === typeFilter) && (severityFilter === 'Wszystkie' || issue.severity === severityFilter) && `${issue.sources} ${issue.reason}`.toLowerCase().includes(query.toLowerCase())), [issues, typeFilter, severityFilter, query]);
  const records = dataset ? dataset.orders.length + dataset.invoices.length + dataset.warehouse.length : 0;
  const affected = new Set(issues.flatMap((issue) => issue.sources.match(/(?:ORD|INV|WH)-\d+/g) ?? [])).size;
  const ok = Math.max(0, records - affected);
  const types = [...new Set(issues.map((issue) => issue.type))];

  const runDemo = () => { setDataset(createDemoDataset()); setUploads({}); setUploadError(''); setTypeFilter('Wszystkie typy'); setSeverityFilter('Wszystkie'); setQuery(''); };
  const reset = () => { setDataset(null); setUploads({}); setUploadError(''); setSelected(null); };
  const reference = (defect=false) => { const data=createDemoDataset(true);if(defect)data.invoices[0].amount+=12.5;reset();setTypeFilter('Wszystkie typy');setSeverityFilter('Wszystkie');setQuery('');setDataset(data); };
  const upload = (key: UploadKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: ({ data, errors }) => {
      if (errors.length) { setUploadError(errorCopy.csv); return; }
      const numeric = (row: Record<string, string>) => ({ ...row, quantity: Number(row.quantity), ...(key !== 'warehouse' ? { amount: Number(row.amount) } : {}) });
      const next = { ...uploads, [key]: data.map(numeric) } as Partial<Dataset>;
      setUploads(next); setUploadError('');
      if (next.orders && next.invoices && next.warehouse) setDataset(next as Dataset);
    }});
  };
  const openDetails = (issue: Discrepancy) => { setSelected(issue); requestAnimationFrame(() => dialogRef.current?.showModal()); };
  const exportReport = () => {
    const blob = new Blob([`\uFEFF${toCsv(issues)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'raport-rozbieznosci.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <main className="reconciliation-page">
    <section className="tool-intro shell premium-intro"><Link className="back" to={homePath}>{t('s084694e0b7e7')}</Link><div className="eyebrow">{t('sc951f1afcc83')}</div><h1>{t('sd90f010e8bde')}<br/><span>{t('s9fa2dea86ac8')}</span></h1><ProofBusinessContext example="reconciliation" quickStart/><p>{t('sca94915c4156')}</p>
      <div className="privacy"><span>●</span><div><strong>{t('se458429ca214')}</strong><small>{t('s1c6202a6f6ea')}</small></div></div>
    </section>

    <ProofFlow input={t('s0369b0fcf885')} processing={t('sa5f1ab01519a')} failures={t('s56329664f32c')} output={t('sb580bdeb4fc4')} acceptance={t('scec059a2e9e6')}/>
    <section id="proof-workspace" tabIndex={-1} className="workspace shell" aria-label={t('s002c6fee3abb')}>
      <VerificationGuide/><p>{t('s4c062ac95aa9')}</p><div className="workspace-actions"><button onClick={()=>reference()}>{t('sea07f6417941')}</button><button onClick={()=>reference(true)}>{t('s87604711bada')}</button><button onClick={()=>reference()}>{t('s87120779fa5f')}</button></div>{dataset&&<p data-testid="reconciliation-overall"><strong>{issues.length?t('s425305e25df9'):t('s2f9acb02faa1')}</strong> · {issues.length?t('sbec6fb4008bf'):t('s941270ca4bde')}</p>}
      <div className="workspace-top"><div><span className="kicker">{t('sc1b402fe31df')}</span><h2>{t('s70310d30e0b6')}</h2></div><div className="workspace-actions"><button className="button primary" onClick={runDemo}>{t('sff57eaa470a7')}</button>{dataset && <button className="button secondary" onClick={reset}>{t('sa0a5e74cd728')}</button>}</div></div>
      <div className="uploads">{uploadConfig.map(({ key, label }) => <label className={uploads[key] ? 'uploaded' : ''} key={key}><span>{uploads[key] ? '✓' : '+'}</span><div><strong>{label}</strong><small>{uploads[key] ? `${uploads[key]!.length} ${errorCopy.records}` : t('s33e70389143a')}</small></div><input aria-label={`${errorCopy.upload} ${label}`} type="file" accept=".csv,text/csv" onChange={upload(key)}/></label>)}</div>
      <p className="upload-help">{t('s81729e541c4e')}</p>{uploadError && <p className="error" role="alert">{uploadError}</p>}

      {!dataset ? <div className="empty-state"><div className="empty-icon">≋</div><h3>{t('se2d51773a7f1')}</h3><p>{t('s5a924aa20e71')}</p></div> : <div className="results" data-testid="results">
        <div className="summary-grid"><article><span>{t('s8636ab38c100')}</span><strong>{records}</strong><small>{t('s076f2dceb74e')}</small></article><article className="ok"><span>{t('s052132d1c3d3')}</span><strong>{ok}</strong><small>{Math.round(ok / records * 100)}{t('scf97c12c0718')}</small></article><article className="bad"><span>{t('s2550a0a99a71')}</span><strong data-testid="issue-count">{issues.length}</strong><small>{counted(types.length,['typ','typy','typów'])}</small></article><article><span>{t('sc65913e29a7f')}</span><strong>{issues.filter(i => i.severity === 'wysoki').length}</strong><small>{t('scf4442a5fe96')}</small></article></div>
        <div className="type-strip">{types.map(type => <button key={type} onClick={() => setTypeFilter(type)} className={typeFilter === type ? 'selected' : ''}><span>{issues.filter(i => i.type === type).length}</span>{domain(type)}</button>)}</div>
        <div className="table-panel"><div className="table-tools"><div><h3>{t('s7669241ef822')}</h3><span>{filtered.length}{t('s7ed4087095f0')}{issues.length}{t('se1a434dc5474')}</span></div><div className="filters"><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('s5dd47a69e40b')} aria-label={t('s4f26eea08e20')}/><select aria-label={t('secafc349cc70')} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="Wszystkie typy">{t('s497893247b4d')}</option>{types.map(type => <option key={type} value={type}>{domain(type)}</option>)}</select><select aria-label={t('sebbbc59ba95e')} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}><option value="Wszystkie">{t('s11366eeda268')}</option><option value="wysoki">{t('s9356c8a12559')}</option><option value="średni">{t('s416dc3356a6c')}</option><option value="niski">{t('s90a9a1c876d1')}</option></select><button className="button secondary export" onClick={exportReport}>{t('se7b78d01fe01')}</button></div></div>
          <div className="table-scroll"><table><thead><tr><th>{t('s803fd14c770e')}</th><th>{t('s1b024183cb33')}</th><th>{t('saf62b5bdfb8c')}</th><th>{t('s0242c4ba129e')}</th><th>{t('s3a1aea517e29')}</th><th></th></tr></thead><tbody>{filtered.map(issue => <tr key={issue.id}><td><span className={`severity ${issue.severity}`}>{valueText(issue.severity)}</span></td><td><strong>{domain(issue.type)}</strong></td><td><code>{issue.sources}</code></td><td><span className="values"><em>{valueText(issue.expected)}</em><del>{valueText(issue.actual)}</del></span></td><td>{domain(issue.reason)}</td><td><button className="details" onClick={() => openDetails(issue)} aria-label={`${errorCopy.details}: ${domain(issue.type)}`}>{t('s92f18f0c1655')}</button></td></tr>)}</tbody></table></div>
        </div>
      </div>}
    </section>

    <section className="technical shell section"><div className="section-heading"><div><span className="kicker">{t('s4a8befa1a1f8')}</span><h2>{t('sb7ab7015ffd0')}</h2></div><p>{t('sdce01ea302db')}</p></div><div className="pipeline"><article><b>{t('sbbce86fe202e')}</b><h3>{t('s9000648bf215')}</h3><p>{t('s836d5efd24ae')}</p></article><article><b>{t('s14739d74ad58')}</b><h3>{t('s586bb4cab409')}</h3><p>{t('sbb71a5e4fb8d')}</p></article><article><b>{t('s9ffc83192189')}</b><h3>{t('sdca2149fb79d')}</h3><p>{t('s5cd816bf3b83')}</p></article><article><b>{t('s6b40a50de781')}</b><h3>{t('s24c2628a19c2')}</h3><p>{t('s7287c029ec8d')}</p></article></div></section>

    <section className="commercial"><div className="shell commercial-grid"><div><span className="kicker">{t('s58876e021ab2')}</span><h2>{t('s152601c2cb55')}</h2></div><div><p><strong>{t('s7aac66813938')}</strong>{t('se2c13d845f64')}</p><p>{t('sfef235406c11')}</p></div></div></section>
    <ProofNextStep example="reconciliation"/>

    <dialog ref={dialogRef} onClose={() => setSelected(null)} className="issue-dialog">{selected && <><button className="dialog-close" onClick={() => dialogRef.current?.close()} aria-label={t('s00b8d851752c')}>{t('s8db71ed28b0f')}</button><span className={`severity ${selected.severity}`}>{valueText(selected.severity)}</span><h2>{domain(selected.type)}</h2><dl><div><dt>{t('saf62b5bdfb8c')}</dt><dd><code>{selected.sources}</code></dd></div><div><dt>{t('s644855ad595f')}</dt><dd>{valueText(selected.expected)}</dd></div><div><dt>{t('s60e6a5fcc71f')}</dt><dd>{valueText(selected.actual)}</dd></div><div><dt>{t('s3a1aea517e29')}</dt><dd>{domain(selected.reason)}</dd></div><div><dt>{t('s0dff9d5efd62')}</dt><dd>{domain(selected.action)}</dd></div></dl></>}</dialog>
  </main>;
}
