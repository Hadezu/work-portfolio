import {editorialCopy} from './editorial-copy';
import {ProofArt} from './ProofArt';
import {SupportingProofArt} from './SupportingProofArt';
import {SystemThread} from './SystemThread';
import {homeJourney} from './home-journey-copy';
import {Link,useLocation} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {pages} from './metadata';
import {buyerCopy} from './buyer-copy';
import './buyer-journey.css';

export const exampleServices:Record<string,string>={'proof/ai-automation':'other','proof/migration':'data-migration','proof/revenue-bi':'data-migration','reconciliation':'exceptions','api-tests':'integration-testing','data-bridge':'api-integration','transit-validation':'integration-testing','workflow-access':'integration-testing','healthcare-integration':'integration-testing','erp-sync':'api-integration','operations-exceptions':'exceptions','data-quality':'data-migration','automation':'other'};
export function exampleContext(example:string|null,locale:'en'|'pl'){
  if(!example||!Object.hasOwn(exampleServices,example))return null;
  const path=localizedPath('/'+example,locale),page=pages[path];
  return page?{example,path,label:page.label,service:exampleServices[example]}:null;
}
export function SimilarTask({example,label}:{example:string;label?:string}){const locale=useLocale(),c=buyerCopy[locale],context=exampleContext(example,locale);return context?<Link className="button primary similar-task" to={localizedPath('/contact',locale)+'?'+new URLSearchParams({service:context.service,example}).toString()}>{label??c.similar} →</Link>:null;}
export function DemoPreview({kind}:{kind:'migration'|'revenue-bi'}){
 const locale=useLocale(),c=buyerCopy[locale],location=useLocation(),path=localizedPath('/proof/'+kind,locale);
 const content=<><span className="evidence-topline"><span>{c.demoNames[kind==='migration'?0:1]}</span><span aria-hidden="true">{kind==='migration'?'01':'02'}</span></span><span className="evidence-image"><img src={`/previews/${kind}-${locale}.png`} alt={c.demoNames[kind==='migration'?0:1]+' — '+c.preview} width={kind==='migration'?622:626} height={kind==='migration'?300:429} loading="lazy"/></span></>;
 return <figure className="demo-preview">{location.pathname===path?<div className="evidence-preview">{content}</div>:<Link className="evidence-preview" to={path}>{content}<span className="evidence-bottom">{c.open}<span aria-hidden="true">↗</span></span></Link>}<figcaption>{c.preview}</figcaption></figure>;
}
export function BuyerExamples(){
 const locale=useLocale(),c=buyerCopy[locale],j=homeJourney[locale],e=editorialCopy[locale];
 return <section className="section buyer-examples" id={locale==='en'?'technical-evidence':'przyklady'}><div className="shell proof-inner">
  <SystemThread stage="verify"/><p className="editorial-index">{e.proof}</p><h2>{e.proofTitle}</h2><p className="proof-disclosure">{e.proofNote}</p>
  <div className="primary-proofs">{(['migration','revenue-bi'] as const).map((kind,i)=><article key={kind} className={'proof-feature proof-feature--'+kind}>
   <div className="proof-heading"><span className="editorial-index">0{i+1} / {c.demoNames[i]}</span><h3>{j.proofs[i][0]}</h3></div>
   <div className="proof-media"><ProofArt kind={kind}/></div>
   <div className="proof-description"><p>{j.proofs[i][1]}</p><p><strong>{j.proof}: </strong>{j.proofs[i][2]}</p><details><summary>{j.limits}</summary><p>{j.proofs[i][3]}</p></details><Link className="button secondary" to={localizedPath('/proof/'+kind,locale)}>{c.open} →</Link></div>
  </article>)}</div>
  <div className="compact-proofs">{(['reconciliation','operations-exceptions'] as const).map((route,i)=><article key={route}>
   <div className="proof-heading"><span className="editorial-index">0{i+3}</span><h3>{e.extraProofs[i][0]}</h3></div>
   <SupportingProofArt kind={route}/>
   <div className="proof-description"><p>{e.extraProofs[i][1]}</p><Link to={localizedPath('/'+route,locale)}>{e.open} →</Link></div>
  </article>)}</div></div></section>;
}
export function GuideStep({step,steps,label,onAction,href,onStop,busy}:{step:number;steps:readonly (readonly string[])[];label:string;onAction?:()=>void;href?:string;onStop:()=>void;busy:boolean}){const locale=useLocale(),c=buyerCopy[locale];return <aside className="buyer-guide" aria-label={c.guide} data-testid="buyer-guide"><div><small>{c.guide} · {c.step} {step+1}/{steps.length}</small><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p></div><div>{href?<a className="button primary" href={href} download>{label}</a>:<button className="button primary" disabled={busy} onClick={onAction}>{label}</button>}<button className="buyer-guide-stop" onClick={onStop}>{c.stop}</button></div></aside>;}
