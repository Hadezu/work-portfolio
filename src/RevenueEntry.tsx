import {Link} from 'react-router-dom';
import {localizedPath,useLocale} from './locale';
import {revenueCopy} from './revenue-copy';
import './revenue.css';
export function RevenueEntry(){const locale=useLocale(),c=revenueCopy[locale];return <div className="shell revenue-entry"><div><strong>{c.navTitle}</strong><p>{c.navIntro}</p></div><Link to={localizedPath('/proof/revenue-bi',locale)}>{c.open} →</Link></div>;}
