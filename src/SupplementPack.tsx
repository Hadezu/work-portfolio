import {useErrorText} from './error-copy';
import {useSharedCopy} from './shared-copy';
import VerificationGuide from './VerificationGuide';
import {useState} from 'react';
import { useLocale } from './locale';
import type {SupplementReport} from './supplement-engine';
export default function SupplementPack({kind}:{kind:'async'|'healthcare'}){ const errorText=useErrorText();  const shared=useSharedCopy();
 const locale=useLocale(); const en=locale==='en';
 const copy={
  async:{aria:shared.s1c23b884d77f,title:shared.s71f55d0475a6,body:shared.s349326ec9a5c,change:shared.sef7d07b6cfde},
  healthcare:{aria:shared.s502845736df2,title:shared.s202733bfbd4c,body:shared.s4e6f8fb6dc25,change:shared.sabae849b7239}
 }[kind];
 const [report,setReport]=useState<SupplementReport|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function run(controlled:boolean){setBusy(true);setError('');try{const r=await fetch('/api/demo/acceptance/'+kind,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({controlled})});if(!r.ok)throw Error('HTTP '+r.status);setReport(await r.json());}catch(e){setError(errorText(String(e)));}finally{setBusy(false);}}
 function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=kind+'-acceptance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="shell workspace" aria-label={copy.aria}>{kind==='async'&&<VerificationGuide/>}<h2>{copy.title}</h2><p>{copy.body}</p><p>{copy.change}</p><div className="workspace-actions"><button disabled={busy} onClick={()=>void run(false)}>{shared.s21f7edf80357}</button><button disabled={busy} onClick={()=>void run(true)}>{shared.s121e654cdc71}</button><button disabled={busy} onClick={()=>void run(false)}>{shared.sf5869210b908}</button></div>{error&&<p role="alert">{error}</p>}{report&&<><p data-testid={'supplement-'+kind}><strong>{report.status}</strong> · {report.passed} PASS / {report.failed} FAIL · {report.run_id}</p><div className="table-scroll"><table><thead><tr><th>{shared.s7d364b770841}</th><th>{shared.s533ec8f80643}</th><th>{shared.s0b2659865556}</th><th>{shared.se966f1ec9b8c}</th><th>{shared.s162c1ecbb6bb}</th></tr></thead><tbody>{report.checks.map(c=><tr key={c.rule}><td>{c.rule}</td><td>{c.expected}</td><td>{c.actual}</td><td>{c.status}</td><td><details><summary>{shared.sc797895b5350}</summary><pre>{JSON.stringify(c.evidence,null,2)}</pre></details></td></tr>)}</tbody></table></div><button onClick={download}>{shared.s374a5ff9a9d1}</button></>}</section>;
}
