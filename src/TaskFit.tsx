import {Link,useSearchParams} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {taskFit,taskRoutes,taskIndex} from './task-fit';
import {homeJourney} from './home-journey-copy';
import {homeCopy} from './home-copy';
import './task-fit.css';
import {editorialCopy} from './editorial-copy';
import {SystemThread} from './SystemThread';

export function CollaborationTerms(){const locale=useLocale(),c=taskFit[locale];return <div className="collaboration-terms"><details><summary>{c.collaboration}</summary><p>{c.terms}</p></details></div>}
export default function TaskFit(){
 const locale=useLocale(),c=taskFit[locale],[params,setParams]=useSearchParams();
 const j=homeJourney[locale],other=params.get('task')==='other';
 const index=taskIndex(params.get('task')),item=c.items[index],route=taskRoutes[index];
 return <section className="shell section task-fit commercial-services" id={homeCopy[locale].ids.services}>
  <SystemThread stage="structure"/><p className="editorial-index">{editorialCopy[locale].problems}</p><h2>{c.title}</h2><p className="section-intro">{c.intro}</p><div className="task-layout">
  <div className="task-options" role="group" aria-label={c.choose}>{c.items.map((value,i)=><button key={taskRoutes[i].id} type="button" aria-label={value.label} aria-pressed={!other&&i===index} aria-controls="task-evidence" onClick={()=>{const next=new URLSearchParams(params);next.set('task',taskRoutes[i].id);setParams(next,{preventScrollReset:true});}}>{value.label}</button>)}<button type="button" aria-label={j.other} aria-pressed={other} aria-controls="task-evidence" onClick={()=>{const next=new URLSearchParams(params);next.set("task","other");setParams(next,{preventScrollReset:true});}}>{j.other}</button></div>
  {other?<article id="task-evidence" className="task-evidence"><h3>{j.otherTitle}</h3><p>{j.otherBody}</p><Link className="button primary" to={localizedPath("/contact",locale)}>{c.ask} →</Link></article>:<article id="task-evidence" className="task-evidence"><h3>{item.title}</h3><p>{item.demonstrated}</p><details><summary>{c.first}</summary><dl>{[[c.first,item.first],[c.input,item.input],[c.output,item.output],[c.acceptance,item.acceptance]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></details>
   <div className="hero-actions"><Link className="button secondary" to={localizedPath('/'+route.proof,locale)}>{c.proof} →</Link><Link className="button primary" to={localizedPath('/contact',locale)+'?'+new URLSearchParams({service:route.service,example:route.proof}).toString()}>{c.ask} →</Link></div>
   <details><summary>{c.boundary}</summary><p>{item.limits}</p><Link to={localizedPath('/'+route.secondary,locale)}>{c.deeper} →</Link></details>
  </article>}</div><p className="guide-disclosure">{c.disclosure}</p>

 </section>;
}
