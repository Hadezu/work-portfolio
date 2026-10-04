import './editorial-continuity.css';
import SiteBehavior,{MotionProvider,MotionToggle} from './SiteBehavior';
import PracticalResource from './PracticalResources';
import {practicalSlugs} from './practical-copy';
import MigrationGuide from './MigrationGuide';
import {guideSlugs} from './migration-guides';
import SiteNavigator from './SiteNavigator';



const ServicePage=lazy(()=>import('./ServicePage'));
import {serviceSlugs} from './services-copy';
import ContactPage,{PrivacyPage} from './ContactPage';
import SiteMetrics from './SiteMetrics';
import {useSharedCopy} from './shared-copy';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';


import { metadata } from './metadata';
import TrustBlock from './TrustBlock';






import PortfolioHome from './PortfolioHome';
import ScrollManager from './ScrollManager';
import { LocaleContext, isEnglishPath, localizedPath, stripLocale, useLocale } from './locale';
import { resolveLocale } from './localization-contract';

const MigrationPage=lazy(()=>import('./MigrationPage'));
const RevenuePage=lazy(()=>import('./RevenuePage'));
const AiPage=lazy(()=>import('./AiPage'));
const ApiTestsPage=lazy(()=>import('./ApiTestsPage'));
const DataBridgePage=lazy(()=>import('./DataBridgePage'));
const LabPage=lazy(()=>import('./LabPage'));
const WorkflowPage=lazy(()=>import('./WorkflowPage'));
const HealthcarePage=lazy(()=>import('./HealthcarePage'));
const ErpPage=lazy(()=>import('./ErpPage'));
const OperationsPage=lazy(()=>import('./OperationsPage'));
const DataQualityPage=lazy(()=>import('./DataQualityPage'));
const Reconciliation=lazy(()=>import('./ReconciliationPage'));
const AutomationPage=lazy(()=>import('./automation/AutomationPage'));

const mailto = 'mailto:ivan@matiushkin.com?subject=Wydzielony%20zakres%20techniczny';



// Server-rendered controls become interactive only after their route has hydrated.
// Keeping presentation effects in this boundary also prevents pre-hydration DOM mutations.
function RouteContent({children}:{children:ReactNode}) {
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  return <div style={{display:'contents'}} inert={!ready} data-route-ready={ready?'true':'false'}>{children}</div>;
}

function Meta() {
  const { pathname } = useLocation();
  const locale=useLocale();
  useEffect(() => {
    const { page, url, tags, alternates } = metadata(pathname);
    document.documentElement.lang = locale;
    document.title = page.title;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
    document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang="pl"], link[rel="alternate"][hreflang="en"], link[rel="alternate"][hreflang="x-default"]').forEach(link => link.remove());
    alternates.forEach(({ lang, href }) => {
      const link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = lang; link.href = href; link.dataset.langSwitch = 'true'; document.head.appendChild(link);
    });
    Object.entries(tags).forEach(([key, value]) => {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.appendChild(tag); }
      tag.content = value;
    });
  }, [pathname,locale]);
  return null;
}

function Header() { const shared=useSharedCopy();
  const { pathname, search } = useLocation();
  const english = useLocale() === 'en';
  const plainPath = stripLocale(pathname);
  const home = plainPath === '/';
  const enTarget = localizedPath(pathname, 'en') + search;
  const plTarget = localizedPath(pathname, 'pl') + search;
  return <header className={"site-header site-header--compact"+" site-header--editorial"}>
    <Link className="brand" to={english?'/en':'/'} aria-label={shared.sd2fe4a5869a6}>{!home&&<span className="brand-mark"><img src="/brand/logo-transparent.png" alt="" width="46" height="46"/></span>}<span><strong>Ivan Matiushkin</strong><small>{shared.saf66cac1eb7f}</small></span></Link>
    <nav aria-label={shared.s342e63de46f2}>{home?<a className="site-home-anchor" href={`${english?'/en':'/'}#${shared.nav[0][0]}`}>{shared.nav[0][1]}</a>:<Link className="site-back" to={english?'/en':'/'}>{plainPath.startsWith('/services/')||['/contact','/privacy'].includes(plainPath)?(english?'Home':'Strona główna'):shared.sdd94b6145e4e}</Link>}<Link className="site-shortcut" aria-current={plainPath==='/proof/migration'?'page':undefined} to={localizedPath('/proof/migration',english?'en':'pl')}>{english?'Data migration':'Migracja danych'}</Link><Link className="site-shortcut" aria-current={plainPath==='/proof/revenue-bi'?'page':undefined} to={localizedPath('/proof/revenue-bi',english?'en':'pl')}>{english?'Revenue reporting':'Raportowanie'}</Link><SiteNavigator/><Link className="site-contact" to={english?'/en/contact':'/contact'}>{shared.scda0fb0dc106}</Link><span className="language-switch" role="group" aria-label={shared.s313597ce2a2e}><Link aria-current={!english?'true':undefined} to={plTarget}>PL</Link><Link aria-current={english?'true':undefined} to={enTarget}>EN</Link></span></nav>
  </header>;
}

function Footer() { const shared=useSharedCopy();
  const english = useLocale() === 'en';
  const commercial=stripLocale(useLocation().pathname);
  return <>{!commercial.startsWith('/services/')&&!commercial.startsWith('/guides/')&&!['/contact','/privacy'].includes(commercial)&&<TrustBlock/>}<footer className="editorial-footer"><div className="footer-identity">{commercial!=='/'&&<img src="/brand/logo-transparent.png" alt="" width="42" height="42"/>}<strong>Ivan Matiushkin</strong><span>{shared.s43d65ed3e1d4}</span></div><a href="mailto:ivan@matiushkin.com">ivan@matiushkin.com</a><Link to={english?'/en/privacy':'/privacy'}>{english?'Data and statistics':'Dane i statystyki'}</Link>{commercial!=='/'&&<MotionToggle/>}</footer></>;
}

function Home() { return <PortfolioHome/>; }
function English() { return <PortfolioHome/>; }

function NotFound() { const shared=useSharedCopy();
  const english = useLocale() === 'en';
  return <main className="shell not-found"><div className="eyebrow">404</div><h1>{shared.sbfb24cd23e8a}</h1><p>{shared.s94a32c06b903}</p><Link className="button primary" to={english?'/en':'/'}>{shared.s08c3a528f835}</Link></main>;
}


function ProofElement({slug}:{slug:string}) {
  if (slug === 'proof/revenue-bi') return <RevenuePage/>;
  if (slug === 'proof/ai-automation') return <AiPage/>;
  if (slug === 'proof/migration') return <MigrationPage/>;
  if (slug === 'reconciliation') return <Reconciliation/>;
  if (slug === 'api-tests') return <ApiTestsPage/>;
  if (slug === 'data-bridge') return <DataBridgePage/>;
  if (slug === 'data-quality') return <DataQualityPage/>;
  if (slug === 'operations-exceptions') return <OperationsPage/>;
  if (slug === 'erp-sync') return <ErpPage/>;
  if (slug === 'healthcare-integration') return <HealthcarePage/>;
  if (slug === 'workflow-access') return <WorkflowPage/>;
  return <LabPage key={slug} slug={slug}/>;
}
const proofSlugs = ['proof/ai-automation','proof/revenue-bi','proof/migration','reconciliation','api-tests','data-bridge','transit-validation','workflow-access','healthcare-integration','erp-sync','operations-exceptions','data-quality'];
function AppShell() {
  const pathname = useLocation().pathname;
  const locale = resolveLocale(pathname);
  return <LocaleContext.Provider value={locale}><Meta/><SiteMetrics/><ScrollManager/><Header/><Suspense fallback={<main className="shell section" role="status">{locale==='en'?'Loading example…':'Wczytywanie przykładu…'}</main>}><RouteContent key={pathname}><Routes>{["","/en"].flatMap(prefix=>practicalSlugs.map((slug,index)=><Route key={prefix+slug} path={prefix+"/"+slug} element={<PracticalResource index={index}/>}/>))}{["","/en"].flatMap(prefix=>guideSlugs.map((slug,index)=><Route key={prefix+slug} path={prefix+"/"+slug} element={<MigrationGuide index={index}/>}/>))}{['','/en'].flatMap(prefix=>[...serviceSlugs.map((slug,index)=><Route key={prefix+slug} path={`${prefix}/${slug}`} element={<ServicePage index={index}/>}/>),<Route key={prefix+'contact'} path={`${prefix}/contact`} element={<ContactPage/>}/>,<Route key={prefix+'privacy'} path={`${prefix}/privacy`} element={<PrivacyPage/>}/>])}{["/automation","/en/automation"].map(path=><Route key={path} path={path} element={<Suspense fallback={<main className="shell section"><a href="mailto:ivan@matiushkin.com">ivan@matiushkin.com</a></main>}><AutomationPage/></Suspense>}/>)}<Route path="/" element={<Home/>}/><Route path="/en" element={<English/>}/>{proofSlugs.map(slug=><Route key={slug} path={`/${slug}`} element={<ProofElement slug={slug}/>}/>)}{proofSlugs.map(slug=><Route key={`en-${slug}`} path={`/en/${slug}`} element={<ProofElement slug={slug}/>}/>)}<Route path="*" element={<NotFound/>}/></Routes><SiteBehavior/></RouteContent></Suspense><Footer/></LocaleContext.Provider>;
}
export default function App() { return <MotionProvider><AppShell/></MotionProvider>; }
