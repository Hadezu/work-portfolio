import Hero3D from './Hero3D';
import {useRef,type PointerEvent} from 'react';
import {useEditorialMotion} from './useEditorialMotion';
import {editorialCopy} from './editorial-copy';
import TaskFit,{CollaborationTerms} from './TaskFit';
import {BuyerExamples} from './BuyerJourney';
import {ContactForm} from './ContactPage';
import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {homeCopy} from './home-copy';
import {homeJourney,homeWorkflow,homeGithub} from './home-journey-copy';
import {PracticalLinks} from './PracticalResources';
import {ServiceLinks} from './ServiceLinks';
import './portfolio.css';
import './home-journey.css';
import './editorial-tokens.css';
import './editorial-home.css';
import './editorial-refinement.css';
import './home-harmony.css';
export default function PortfolioHome(){
 const root=useRef<HTMLElement>(null),motion=useEditorialMotion(root);
 const portraitLight=(event:PointerEvent<HTMLElement>)=>{if(!motion.available||motion.paused||event.pointerType==='touch'||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const el=event.currentTarget,box=el.getBoundingClientRect();el.style.setProperty('--portrait-light-x',`${event.clientX-box.left}px`);el.style.setProperty('--portrait-light-y',`${event.clientY-box.top}px`);};
 const locale=useLocale(),c=homeCopy[locale],j=homeJourney[locale],e=editorialCopy[locale],workflow=homeWorkflow[locale],github=homeGithub[locale];
 return <main ref={root} className="portfolio-home" data-motion={motion.available&&!motion.paused?'on':'off'}>
  <section className="section portfolio-hero"><div className="shell hero-inner"><div className="home-hero-copy">
   <p className="kicker">Ivan Matiushkin · {c.hero.role}</p>
   <h1>{c.hero.title.slice(0,-e.accent.length)}<em>{e.accent}</em></h1><p className="intro">{c.hero.intro}</p>
   <div className="hero-actions"><a className="button primary" href="#send-task">{c.hero.contact}</a><a className="button secondary" href={'#'+c.ids.proofs}>{c.hero.examples}</a></div><p className="no-call">{j.noCall}</p>
  </div><figure className="hero-material"><Hero3D/><div className="hero-material-index" aria-hidden="true"><span>01 / {e.source}</span><span>02 / {e.structure}</span><span>03 / {e.verify}</span></div><figcaption>{e.metaphor}</figcaption><div className="motion-control">{motion.available&&<button className="motion-toggle" type="button" onClick={motion.toggle}>{locale==='en'?(motion.paused?'Resume motion':'Pause motion'):(motion.paused?'Wznów ruch':'Wstrzymaj ruch')}</button>}</div></figure></div></section>
  <TaskFit/>
  <BuyerExamples/>
  <section className="section home-start" id={c.ids.work}><div className="shell"><p className="editorial-index">{e.process}</p><h2>{j.start}</h2><ol>{j.steps.map(([title,body])=><li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol>
   <aside className="home-ai-workflow" aria-labelledby="ai-workflow-title"><div><span className="workflow-tool">Codex</span><h3 id="ai-workflow-title">{workflow.title}</h3></div><div><p>{workflow.body}</p><p>{workflow.checks}</p></div></aside>
   <p className="contact-notice">{j.reviewLimit}</p></div></section>
  <section className="shell section contractor-facts" id="contractor"><figure className="about-portrait" onPointerMove={portraitLight}><div className="portrait-frame"><img src="/editorial/ivan-portrait.jpg" width="960" height="1280" alt={e.portrait} loading="lazy"/></div><figcaption>Ivan Matiushkin <span>{e.location}</span></figcaption></figure><div className="about-copy"><p className="editorial-index">{e.about}</p><h2>{j.about}</h2><p>{j.bio}</p>
   <aside className="home-github" aria-labelledby="github-proof-title"><h3 id="github-proof-title">{github.title}</h3><p>{github.body}</p><ul><li><a href="https://github.com/Hadezu/work-portfolio">{github.source} <span aria-hidden="true">↗</span></a></li><li><a href="https://github.com/Hadezu/atomic-crm-import-review/blob/main/CASE-STUDY.md">{github.crm} <span aria-hidden="true">↗</span></a></li></ul><p className="github-boundary">{github.boundary}</p><a className="github-profile" href="https://github.com/Hadezu">{github.profile} <span aria-hidden="true">↗</span></a></aside>
   <CollaborationTerms/><details><summary>{j.terms}</summary><p>{j.billing}</p></details><details className="home-resources"><summary>{j.technical}</summary><Link to={localizedPath('/automation',locale)}>{j.more} →</Link><ServiceLinks/><PracticalLinks/></details></div></section>
  <ContactForm embedded/>
 </main>;
}
