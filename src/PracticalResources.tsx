import {Link} from 'react-router-dom';
import {localizedPath,useLocale} from './locale';
import {practicalCopy,practicalSlugs} from './practical-copy';
import sample from './delivery-sample.json';
import './migration-guides.css';

export function PracticalLinks(){const l=useLocale(),c=practicalCopy[l];return <details className="migration-guide-links"><summary>{c.label}</summary><ul>{practicalSlugs.map((slug,i)=><li key={slug}><Link to={localizedPath('/'+slug,l)}>{i===2?c.sampleLink:c.articles[i].title} →</Link></li>)}</ul></details>}
export function SampleLink(){const l=useLocale();return <p><Link to={localizedPath('/'+practicalSlugs[2],l)}>{practicalCopy[l].sampleLink} →</Link></p>}
export default function PracticalResource({index}:{index:number}){
 const l=useLocale(),c=practicalCopy[l],s=c.sample,isSample=index===2,a=c.articles[index===2?0:index];
 const proof=index===0?'api-tests':index===1?'proof/revenue-bi':'proof/migration';
 const service=index===0?'integration-testing':'data-migration';
 return <main className="shell section migration-guide"><article><Link to={localizedPath('/services/'+service,l)}>{c.contact} →</Link><p className="eyebrow">Ivan Matiushkin</p><h1>{isSample?s.title:a.title}</h1><p className="intro">{isSample?s.intro:a.intro}</p><p className="guide-disclosure">{c.disclosure}</p>
 {isSample?<><p>{s.scope}</p>{([['before',s.before,'FAIL'],['after',s.after,'PASS']] as const).map(([key,title,status])=><section key={key}><h2>{title} · {status}</h2><table className="sample-table"><thead><tr><th>{s.rows} / {s.total}</th><th>{s.source}</th><th>{s.target}</th></tr></thead><tbody><tr><th>{s.rows}</th><td>{sample[key].source_count}</td><td>{sample[key].target_count}</td></tr><tr><th>{s.total}</th><td>{sample[key].source_gross}</td><td>{sample[key].target_gross}</td></tr></tbody></table></section>)}<section><h2>{s.replay}</h2><p>{s.selected}: {sample.replay.selected.join(', ')}<br/>{s.skipped}: {sample.replay.skipped.join(', ')}<br/>{s.writes}: {sample.replay.writes}</p></section><section><h2>{s.files}</h2><p><a href={'/samples/migration-evidence-'+l+'.html'}>{s.html} →</a></p><p><a download href={'/samples/migration-evidence-'+l+'.html'}>{c.download} HTML</a> · <a download href="/samples/migration-evidence.json">{s.json}</a> · <a download href="/samples/synthetic-orders.csv">{s.csv}</a></p><p className="guide-disclosure">{s.generated}: <time dateTime={sample.generated_at}>{sample.generated_at}</time><br/>{sample.version}</p></section><p>{s.limits}</p><p>{s.reproduce}</p><p>{s.request}</p></>:a.sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}
 <div className="hero-actions"><Link className="button secondary" to={localizedPath('/'+proof,l)}>{c.open} →</Link><Link className="button primary" to={localizedPath('/contact',l)+'?'+new URLSearchParams({service,example:proof}).toString()}>{c.contact} →</Link></div>{index===0&&<p><Link to={localizedPath('/proof/migration',l)}>Migration Showcase →</Link></p>}<h2>{c.related}</h2><PracticalLinks/></article></main>;
}
