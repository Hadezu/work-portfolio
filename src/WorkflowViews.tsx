import {useDomainText,useDomainValue} from './domain-copy';
import { useProofText } from './proof-copy';
import type { MatrixCell, ScenarioRow, WorkflowReport } from './workflow-model';
import { useCounted } from './localized-count';
export function ResultSummary({report}:{report:WorkflowReport}) { const counted=useCounted();  const t = useProofText();
  return <div className="exception-value"><div><span>{t('sc7133b0e5d49')}</span><strong data-testid="workflow-overall">{report.overall_status}</strong></div><p>{counted(report.scenario_count,['scenariusz','scenariusze','scenariuszy'])}{t('sb91423be1bcc')}{report.passed_scenarios}{t('s6d489b84dedb')}{report.failed_scenarios}<br/>{counted(report.discrepancy_count,['rozbieżność','rozbieżności','rozbieżności'])}{t('sadd84c4d811f')}</p></div>;
}
export function ScenarioTable({rows,onEvidence,onRerun}:{rows:ScenarioRow[];onEvidence:(r:ScenarioRow)=>void;onRerun:(id:string)=>void}) { const domain=useDomainText(),valueText=useDomainValue();  const t = useProofText();
  return <div className="table-scroll"><table><thead><tr><th>{t('sdd4b9f2b401e')}</th><th>{t('saf22313c2ee3')}</th><th>{t('s644855ad595f')}</th><th>{t('s60e6a5fcc71f')}</th><th>{t('s8e3c252723fc')}</th><th>{t('s1c45911567c2')}</th></tr></thead><tbody>{rows.map(r=><tr key={r.scenario_id} data-testid="workflow-row"><td><strong>{domain(r.name)}</strong><br/><code>{r.scenario_id}</code><br/><code>{r.rule}</code><br/><small>{t('s7eb29b374aec')}{valueText(r.severity)}</small></td><td>{r.user}<br/>{r.roles.map(valueText).join(', ')}</td><td>{r.expected}<br/><small>{r.expected_rule}</small></td><td>{r.actual}<br/><small>{r.rule}</small></td><td><strong className={r.result==='FAIL'?'wf-fail':'wf-pass'}>{r.result}</strong></td><td><button onClick={()=>onEvidence(r)}>{t('s1c45911567c2')}</button><button onClick={()=>onRerun(r.scenario_id)}>{t('sbe39b2ec63f9')}</button></td></tr>)}</tbody></table>{rows.length===0&&<p>{t('s9a34ce7b6b27')}</p>}</div>;
}
export function PermissionMatrix({cells,onSelect}:{cells:MatrixCell[];onSelect:(c:MatrixCell)=>void}) { const valueText=useDomainValue(); const t = useProofText();
  const roles=[...new Set(cells.map(c=>c.role))]; const columns=[...new Set(cells.map(c=>`${c.resource}/${c.action}`))];
  return <div className="table-scroll"><table><caption>{t('s8a3722fc3a3f')}</caption><thead><tr><th>{t('s699286d2a2ac')}</th>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{roles.map(role=><tr key={role}><th>{valueText(role)}</th>{columns.map(col=>{const c=cells.find(c=>c.role===role&&`${c.resource}/${c.action}`===col)!;return <td key={col} className={c.deviation?'wf-denied':''}><button aria-label={`${valueText(role)} ${col}: ${c.allowed?'ALLOW':'DENY'}`} onClick={()=>onSelect(c)}>{c.allowed?t('s99e2a1b01955'):t('s389a925b67d4')}</button>{c.deviation&&<p className="wf-fail"><strong>{t('s2beae3a345c6')}</strong><br/>{t('s1ba5332353cb')}{c.expected_allowed?t('s25a2778c67ba'):t('s36aa3700fc28')}{t('s67180bf7843d')}{c.allowed?t('s25a2778c67ba'):t('s36aa3700fc28')}</p>}</td>;})}</tr>)}</tbody></table></div>;
}
export function EvidenceView({value}:{value:unknown}) { const t = useProofText();
  const empty=value==null||(typeof value==='object'&&Object.keys(value).length===0);
  if(empty)return <div className="empty-state" data-testid="evidence-empty"><h3>{t('sc80320394f65')}</h3><p>{t('se5b0a448c68b')}</p></div>;
  return <pre className="lab-json" data-testid="workflow-evidence">{JSON.stringify(value,null,2)}</pre>;
}
