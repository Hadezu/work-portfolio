import {Link} from 'react-router-dom';
import {localizedPath,useLocale} from './locale';
import {servicesCopy,serviceSlugs} from './services-copy';
export function ServiceLinks(){const locale=useLocale(),c=servicesCopy[locale];return <nav className="service-links" aria-label={locale==='pl'?'Zakres usług':'Service details'}>{c.cards.map((s,i)=><Link key={s.title} to={localizedPath('/'+serviceSlugs[i],locale)}>{s.title} →</Link>)}</nav>}
