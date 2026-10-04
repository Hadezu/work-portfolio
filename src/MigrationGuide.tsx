import {SampleLink} from './PracticalResources';
import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {guideSlugs,migrationGuides} from './migration-guides';
import {DemoPreview} from './BuyerJourney';
import './migration-guides.css';
export function MigrationGuideLinks(){const l=useLocale(),c=migrationGuides[l];return <section className="migration-guide-links"><h2>{c.label}</h2>{c.articles.map((a,i)=><p key={a.title}><Link to={localizedPath('/'+guideSlugs[i],l)}>{a.title} →</Link></p>)}</section>}
export function MigrationOffer(){const l=useLocale(),c=migrationGuides[l];return <section className="shell section migration-offer"><h2>{c.offerTitle}</h2><p>{c.offer}</p><ol>{c.offerList.map(s=><li key={s}>{s}</li>)}</ol><MigrationGuideLinks/></section>}
export default function MigrationGuide({index}:{index:number}){const l=useLocale(),c=migrationGuides[l],a=c.articles[index];return <main className="shell section migration-guide"><article><Link to={localizedPath('/services/data-migration',l)}>{c.service} →</Link><p className="eyebrow">Ivan Matiushkin · {c.label}</p><h1>{a.title}</h1><p className="intro">{a.intro}</p><p className="guide-disclosure">{c.disclosure}</p>{a.sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}<SampleLink/><DemoPreview kind="migration"/><div className="hero-actions"><Link className="button primary" to={localizedPath('/proof/migration',l)}>{c.demo} →</Link><Link className="button secondary" to={localizedPath('/contact',l)+'?service=data-migration&example=proof%2Fmigration'}>{c.service}</Link></div><h2>{c.related}</h2><Link to={localizedPath('/'+guideSlugs[1-index],l)}>{c.articles[1-index].title} →</Link></article></main>}
