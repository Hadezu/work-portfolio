import {inquiryCopy} from '../inquiry-copy';
import {BusinessInput} from './BusinessInput';
import {businessCopy,businessSummary,businessRecord,businessAction,financeStatus} from './business';
import {BranchFlow} from './BranchFlow';
import {builderScope,comparisonRules,executionKind} from './semantics';
import type {ReactNode} from 'react';
import {Flow} from './Flow';
import {useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {useLocale,localizedPath} from '../locale';
import {selectCopy} from '../localization-contract';
import {automationCopy} from './copy';
import {patterns,presets} from './config';
import {automationHref,briefHref,createComparison,createInput,resolveSelection,simulate,type Run} from './engine';
import './automation.css';
import './presentation.css';

export default function AutomationExperience({children,homepage=false}:{children?:ReactNode;homepage?:boolean}){
 const locale=useLocale(),c=selectCopy(automationCopy,locale),location=useLocation();const [params,setParams]=useSearchParams();
 const {preset,pattern,invalid}=useMemo(()=>resolveSelection(location.search),[location.search]);const p=selectCopy(preset.copy,locale),pc=selectCopy(pattern.copy,locale);
 const kind=executionKind(preset,pattern.id),comparison=kind==='comparison',outline=kind==='outline';
 const bc=selectCopy(businessCopy,locale),finance=comparison&&preset.id==='finance';
 const domain=finance||(!comparison&&!outline&&['services','logistics'].includes(preset.id));
 const comparisonData=useMemo(()=>createComparison(preset.id==='finance'),[preset.id]);
 const rules=comparison?comparisonRules:preset.rules;
 const input=useMemo(()=>comparison?comparisonData.input:createInput(preset),[preset,comparison,comparisonData]);const [mode,setMode]=useState<'before'|'after'>('after');const [storedResult,setStoredResult]=useState<{preset:string;pattern:string;run:Run}|null>(null);const [phase,setPhase]=useState(0);
 // Never interpret a previous run with another preset's rule dictionary.
 const result=storedResult?.preset===preset.id&&storedResult.pattern===pattern.id?storedResult.run:null;
 function setResult(run:Run|null){setStoredResult(run?{preset:preset.id,pattern:pattern.id,run}:null);}
 const [reference,setReference]=useState(finance?p.comparisonSources[1]:''),[matchKey,setMatchKey]=useState('');
 const [source,setSource]=useState(1),[task,setTask]=useState(pattern.id==='reconciliation'?2:0),[target,setTarget]=useState(0);const [answers,setAnswers]=useState(['','','']);const [copyStatus,setCopyStatus]=useState<'idle'|'success'|'error'>('idle');
 useEffect(()=>{setResult(null);setPhase(0);},[preset.id,pattern.id]);
 useEffect(()=>{if(!result||phase>=6)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const timer=setTimeout(()=>setPhase(n=>Math.min(n+1,6)),reduced?0:350);return()=>clearTimeout(timer);},[result,phase]);
 function choose(industry:string,patternId:string){const next=new URLSearchParams(params);next.set('industry',industry);next.set('pattern',patternId);setParams(next,{replace:true});}
 const scope=builderScope(locale,source,task,target,reference,matchKey);
 const normalSteps=comparison?[c.readOnly]:pattern.destinations.map(i=>p.flow[i]);
 const questions=[c.source,c.manualQuestion,c.destination];const mailto=briefHref(c.subject,questions,answers);
 const done=!!result&&phase===6;const busy=!!result&&phase<6;
 const processId=locale==='pl'?'przyklady':'technical-evidence';
 return <div className="automation-experience">
  <section className="shell automation-playground" id={processId} aria-labelledby="playground-title">
   <div className="automation-heading"><div><span className="kicker">{c.product}</span><h2 id="playground-title">{c.title}</h2><p>{c.intro}</p></div><span className="demo-label">{c.demo}</span></div>
   <p className="automation-boundary">{c.boundary}</p>{invalid&&<p role="status">{c.badQuery}</p>}
   <div className="automation-selectors"><label>{c.industry}<select data-testid="industry" value={preset.id} onChange={e=>{const next=presets.find(p=>p.id===e.target.value)!;choose(next.id,next.defaultPattern);}}>{presets.map(p=><option key={p.id} value={p.id}>{selectCopy(p.copy,locale).name}</option>)}</select></label><label>{c.pattern}<select data-testid="pattern" value={pattern.id} onChange={e=>choose(preset.id,e.target.value)}>{patterns.map(p=><option key={p.id} value={p.id}>{selectCopy(p.copy,locale).name}</option>)}</select></label></div>
   {domain&&<aside className="business-story"><h3>{finance?bc.financeTitle:preset.id==='services'?bc.servicesTitle:bc.logisticsTitle}</h3><p>{finance?bc.financeIntro:preset.id==='services'?bc.servicesIntro:bc.logisticsIntro}</p></aside>}
   <div className="automation-mode" role="group" aria-label={c.before+' / '+c.after}>{(['before','after'] as const).map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{c[m]}</button>)}</div>

   {comparison&&<aside className="comparison-contract"><h3>{c.readOnly}</h3><p>{c.sourceData}: {p.comparisonSources[0]} ↔ {c.referenceData}: {p.comparisonSources[1]}</p><p>{finance?bc.financeContract:c.comparisonDetails}</p><p>{c.readOnlyNote}</p></aside>}
   {outline?<div className="scenario-limitation"><p role="status">{c.outline}</p><a className="button primary" href="#process-brief">{bc.outlineCta}</a></div>:<div className="automation-run"><button className="button primary" disabled={busy} onClick={()=>{setMode('after');setPhase(0);setResult(simulate(preset,pattern.id));}}>{busy?c.running:c.run}</button><button className="button secondary" disabled={!result} onClick={()=>{setResult(null);setPhase(0);}}>{c.reset}</button><p role="status" aria-live="polite">{done?c.complete:busy?`${c.step} ${phase+1}/6 · ${c.stages[phase]}`:outline?c.firstScope:c.ready}</p></div>}
   <div className="automation-results" aria-busy={busy}>
    {!done?(outline?null:<p className="automation-empty">{busy?c.running:c.empty}</p>):<>
     <div className="automation-metrics" data-testid="automation-metrics"><article><strong>{result.input.length}</strong><span>{c.total}</span></article><article><strong>{result.accepted.length}</strong><span>{comparison?c.matched:c.normal}</span></article><article className="needs-review"><strong>{result.reviewCount}</strong><span>{c.review}</span></article></div>
     <p className="business-result" data-testid="business-result" role="status">{businessSummary(locale,preset.id,comparison,result)}</p>
     <a className="text-link" href="#process-builder">{bc.discuss} →</a>
     <details className="result-details"><summary>{bc.details}</summary>
     <div className="automation-evidence"><section><h3>{c.queue}</h3><ul className="exception-list">{result.findings.map(f=>{const rule=selectCopy(rules.find(r=>r.id===f.rule)!.copy,locale);return <li key={f.record+f.rule}><span className="exception-badge">{c.review}</span><strong>{businessRecord(result.input.find(r=>r.id===f.record)!,finance?'finance':comparison?'other':preset.id)} · {finance?financeStatus(locale,result.input.find(r=>r.id===f.record)!,result):rule.label}</strong><p>{rule.action}</p></li>;})}</ul></section><section><details className="audit-disclosure"><summary>{c.audit}</summary><p>{c.auditNote}</p><ol className="audit-log" tabIndex={0} aria-label={c.audit}>{result.audit.map((event,i)=><li key={i}><time>{event.time}</time><span><strong>{event.record}</strong> · {event.event===8?c.reportRow:c.events[event.event]}{event.event===3?` · ${businessAction(locale,preset.id,result.input.find(r=>r.id===event.record)!,event.destination!,`${pc.action} → ${p.flow[event.destination!]}`)}`:''}</span></li>)}</ol></details></section></div>
     <details><summary>{comparison?c.readOnly:c.target} · {comparison?result.input.length:result.accepted.length}</summary><p>{comparison?c.readOnlyNote:c.normalNote}</p><ul>{comparison?result.input.map(row=><li key={row.id}>{row.id} · {row.reference} → {finance?financeStatus(locale,row,result):result.findings.filter(f=>f.record===row.id).map(f=>selectCopy(comparisonRules.find(r=>r.id===f.rule)!.copy,locale).label).join('; ')||c.matched}</li>):result.actions.map((a,i)=><li key={i}>{businessAction(locale,preset.id,result.input.find(r=>r.id===a.record)!,Number(a.destination),`${a.record} → ${p.flow[Number(a.destination)]} · ${pc.action}`)}</li>)}</ul></details>
     </details>
    </>}
   </div>
   <div className={'automation-process '+mode} data-phase={result?phase:undefined} data-testid="process-flow">
    {mode==='before'?<Flow label={c.before} items={comparison?(finance?bc.financeManual:c.comparisonManual):[p.flow[0],...p.manual]}/>:<BranchFlow input={comparison?p.comparisonSources:[p.flow[0]]} checks={finance?bc.financeChecks:domain?(preset.id==='services'?bc.servicesChecks:bc.logisticsChecks):c.stages[1]+' · '+c.stages[2]} normal={outline?[c.builderActions[1],c.firstScope]:normalSteps} report={comparison?[c.readOnly]:undefined}/>}
    <p className="automation-human">{mode==='after'?c.human:c.manualQuestion}</p><p>{c.humanNote}</p>
   </div>
   <div className="automation-engine"><details><summary>{c.engine}</summary><BranchFlow input={[c.stages[0]]} checks={c.stages[1]+' · '+c.stages[2]} normal={[c.action]} report={comparison?[c.readOnly]:undefined}/></details></div>
   <details className="automation-input"><summary>{c.input}</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={c.input}>{domain?<BusinessInput locale={locale} industry={finance?'finance':preset.id} input={input} reference={comparisonData.reference} run={done?result:null}/>:<table><caption>{c.demo}{comparison?` · ${c.sourceData}: ${p.comparisonSources[0]}`:''}</caption><thead><tr>{[c.record,c.reference,c.quantity,c.expected,c.valid,...c.evidence].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{input.map(r=><tr key={r.id}><th scope="row">{r.id}</th><td>{r.reference||'—'}</td><td>{r.value}</td><td>{comparison?(comparisonData.reference.find(b=>b.reference===r.reference)?.value??'—'):r.expected}</td><td>{r.valid?c.yes:c.no}</td><td>{r.stock}</td><td>{r.delay}</td><td>{r.status===r.expectedStatus?c.yes:c.no}</td><td>{r.approved?c.yes:c.no}</td></tr>)}</tbody></table>}</div><ul>{rules.map((r,i)=><li key={r.id}>{c.rule} {i+1} · {selectCopy(r.copy,locale).label}</li>)}</ul></details>
   {comparison&&<details><summary>{c.referenceData}</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={c.referenceData}><table><caption>{p.comparisonSources[1]}</caption><thead><tr>{(finance?bc.referenceHeaders:[c.reference,c.quantity]).map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{comparisonData.reference.map(r=><tr key={r.reference}><td>{r.reference}</td><td>{finance?r.value.toFixed(2):r.value}</td>{finance&&<><td>PLN</td><td>2026-09-15</td></>}</tr>)}</tbody></table></div></details>}
   <div className="automation-links"><Link to={automationHref(locale,preset.id,pattern.id)}>{c.share} ↗</Link><Link to={localizedPath('/'+preset.proof,locale)}>{c.proof} →</Link></div>
  </section>
  <section className="shell section automation-builder" id="process-builder"><span className="kicker">02 · {c.builder}</span><h2>{c.builder}</h2><p>{c.builderIntro}</p><div className="builder-controls">{[[c.source,c.sources,source,setSource],[c.manualQuestion,c.tasks,task,setTask],[c.destination,c.destinations,target,setTarget]].map(([title,options,value,set],i)=><label key={i}>{title as string}<select data-testid={`builder-${i}`} value={value as number} onChange={e=>(set as (n:number)=>void)(Number(e.target.value))}>{(options as string[]).map((text,j)=><option key={j} value={j}>{text}</option>)}</select></label>)}</div>{task===2&&<div className="builder-controls comparison-controls"><label>{c.comparisonSource}<input data-testid="comparison-source" value={reference} placeholder={bc.sourceHint} maxLength={120} onChange={e=>setReference(e.target.value)}/></label><label>{c.comparisonKey}<input data-testid="comparison-key" value={matchKey} placeholder={bc.keyHint} maxLength={80} onChange={e=>setMatchKey(e.target.value)}/></label><p>{bc.unknown} {c.readOnlyNote}</p></div>}
   <p className="scenario-limitation">{c.builderLimit}</p><p data-testid="task-constraints">{c.taskConstraints[task]}</p>
   <BranchFlow input={task===2?[c.sources[source],reference||bc.unknown]:[c.sources[source]]} checks={c.builderSteps[0]+' · '+c.builderActions[task]+(task===2?' · '+(matchKey||bc.unknown):'')} normal={[c.destinations[target]]} report={task===2?[c.readOnly,c.destination+': '+c.destinations[target]]:undefined}/>
   <div className="first-scope"><h3>{c.firstScope}</h3><p data-testid="first-scope">{scope}</p><a className="text-link" href="#process-brief" onClick={()=>{setAnswers([task===2?`${c.sources[source]} + ${reference.trim()||bc.unknown}`:c.sources[source],task===2?((finance?bc.manualFinance:bc.manualComparison)+(matchKey.trim()?`\n${bc.keyNote}${matchKey.trim()}`:'')):c.tasks[task],task===2?`${bc.briefResult}${c.destinations[target]}`:c.destinations[target]]);}}>{c.useBrief} →</a></div></section>
  <section className="shell section automation-systems" id={homepage?'existing-systems':locale==='pl'?'pomoc':'services'}><h2>{c.systems}</h2><ul>{['SAP','Microsoft Dynamics 365','Comarch','IFS','ERP','CRM','WMS','MES','Shopify','WooCommerce','Excel / CSV',locale==='pl'?'E-mail':'Email','API','n8n / Make'].map(system=><li key={system}>{system}</li>)}</ul><p>{c.qualifier}</p><small>{c.systemsNote}</small></section>
  <section className="shell section automation-ladder" id={locale==='pl'?'zakres':'scope'}>{!homepage&&<span id={locale==='pl'?'jak-pracuje':'how-i-work'}/>}<h2>{c.ladder}</h2><p>{c.ladderNote}</p><div>{c.levels.map((level,i)=><article key={level}><span className="kicker">0{i+1}</span><h3>{level}</h3><Flow label={level} items={c.levelFlows[i]}/></article>)}</div></section>
  <section className="shell section automation-handover" id="handover"><h2>{c.deliver}</h2><ul>{c.deliverables.map(text=><li key={text}><span aria-hidden="true">✓</span> {text}</li>)}</ul></section>
  {children}
  <section className="shell section automation-brief" id="process-brief"><div><span className="kicker">Ivan Matiushkin</span><h2>{c.brief}</h2><p>{c.identity}</p><p>{c.briefIntro}</p><p>{c.briefHelp}</p><p>{c.briefNote}</p><a href="mailto:ivan@matiushkin.com">ivan@matiushkin.com</a><button className="button secondary" onClick={async()=>{try{await navigator.clipboard.writeText('ivan@matiushkin.com');setCopyStatus('success');}catch{setCopyStatus('error');}}}>{c.copy}</button><p role="status">{copyStatus==='success'?c.copied:copyStatus==='error'?c.copyFailed:''}</p></div><form action="mailto:ivan@matiushkin.com" onSubmit={e=>{e.preventDefault();window.location.href=mailto;}}>{questions.map((question,i)=><label key={question}>{question}<textarea required maxLength={600} data-testid={`brief-${i}`} value={answers[i]} onChange={e=>setAnswers(a=>a.map((value,j)=>j===i?e.target.value:value))}/></label>)}<Link className="button primary" to={localizedPath('/contact',locale)} state={{brief:questions.map((q,i)=>q+'\n'+answers[i]).join('\n\n')}}>{inquiryCopy[locale].link}</Link><a className="button secondary brief-prepared" data-testid="prepared-mail" href={mailto} onClick={e=>{if(!e.currentTarget.closest('form')!.reportValidity())e.preventDefault();}}>{c.send} ↗</a></form></section>
 </div>;
}
