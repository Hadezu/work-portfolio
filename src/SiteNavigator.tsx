import {migrationGuides} from './migration-guides';
import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {defineCopy} from './localization-contract';
import {pages} from './metadata';
import {serviceSlugs} from './services-copy';
import './site-navigation.css';

const copy=defineCopy('site-navigation',{
  en:{menu:'Menu',title:'What do you need to solve?',search:'Find a topic',placeholder:'Data, reporting, integration…',close:'Close navigation',home:'Home',tasks:'Choose your task',examples:'See how it works',technical:'For a technical reviewer',empty:'No matching topic. Describe your task and I will help you find a starting point.',count:'results',current:'Current page',contact:'Discuss your task',contactNote:'Not sure where to start?',privacy:'Privacy',disclosure:'Working examples use synthetic data, not client deployments.',goals:[['Move data between systems','Mapping, validation and agreed control totals.'],['Trust your revenue reports','Explore a working example with traceable numbers.'],['Connect your systems','One data flow with error and duplicate handling.'],['Check an integration before release','Repeatable tests and clear acceptance criteria.']],proofs:[['Data migration','Follow records from source to a reconciled target.'],['Revenue reporting','See where dashboard numbers come from.']]},
  pl:{menu:'Menu',title:'Co chcesz usprawnić?',search:'Znajdź temat',placeholder:'Dane, raportowanie, integracje…',close:'Zamknij nawigację',home:'Strona główna',tasks:'Wybierz zadanie',examples:'Zobacz, jak to działa',technical:'Dla osoby technicznej',empty:'Brak pasującego tematu. Opisz zadanie — pomogę ustalić punkt wyjścia.',count:'wyników',current:'Bieżąca strona',contact:'Opisz zadanie',contactNote:'Nie wiesz, od czego zacząć?',privacy:'Prywatność',disclosure:'Działające przykłady używają danych syntetycznych. To nie są wdrożenia klientów.',goals:[['Przenieść dane między systemami','Mapowanie, walidacja i uzgodnione sumy kontrolne.'],['Uporządkować raporty przychodów','Sprawdź działający przykład z danymi do każdej kwoty.'],['Połączyć systemy','Jeden przepływ z obsługą błędów i duplikatów.'],['Sprawdzić integrację przed wdrożeniem','Powtarzalne testy i jasne kryteria odbioru.']],proofs:[['Migracja danych','Prześledź drogę rekordów od źródła do uzgodnienia.'],['Raportowanie przychodów','Sprawdź, skąd pochodzą wartości w panelu.']]},
});

export default function SiteNavigator(){
  const locale=useLocale(),c=copy[locale],location=useLocation();
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');
  const dialog=useRef<HTMLDialogElement>(null),focusSearch=useRef(false);
  const catalog=Object.entries(pages).filter(([,p])=>p.locale===locale).map(([path,p])=>({path,slug:p.alternateBase,label:p.alternateBase?p.label:c.home,description:p.description}));
  const showcase=['proof/migration','proof/revenue-bi'];
  const goals=['services/data-migration','proof/revenue-bi','services/api-integration','services/integration-testing'];
  const grouped=[goals.map((slug,i)=>({...catalog.find(p=>p.slug===slug)!,label:c.goals[i][0],description:c.goals[i][1]})),showcase.map((slug,i)=>({...catalog.find(p=>p.slug===slug)!,label:c.proofs[i][0],description:c.proofs[i][1]})),catalog.filter(p=>p.slug&&!p.slug.startsWith('guides/')&&!['contact','privacy',...showcase,...serviceSlugs].includes(p.slug)),catalog.filter(p=>p.slug?.startsWith('guides/'))];
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replaceAll('ł','l');
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  const results=grouped.map(group=>group.filter(p=>terms.every(t=>normalize(p.label+' '+p.description+' '+p.slug).includes(t))));
  const count=results.reduce((n,g)=>n+g.length,0);
  function show(search=false){focusSearch.current=search;setQuery('');setOpen(true);}
  useEffect(()=>{setOpen(false);},[location.pathname,location.search,location.hash]);
  useEffect(()=>{
    if(!open){dialog.current?.close();return;}
    dialog.current?.showModal();
    if(focusSearch.current)dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=previous;};
  },[open]);
  useEffect(()=>{
    function shortcut(event:KeyboardEvent){
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        if(!open&&document.querySelector('dialog[open], [role="dialog"]'))return;
        event.preventDefault();if(open)setOpen(false);else show(true);
      }
    }
    document.addEventListener('keydown',shortcut);return ()=>document.removeEventListener('keydown',shortcut);
  },[open]);
  return <>
    <button className="site-nav-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="site-navigation" onClick={()=>show()}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="12" y="3" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/></svg>{c.menu}</button>
    <dialog ref={dialog} id="site-navigation" className="site-navigation" aria-labelledby="site-navigation-title" onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}} onKeyDown={e=>{
      const links=Array.from(dialog.current?.querySelectorAll<HTMLAnchorElement>('.site-nav-result')??[]).filter(link=>link.getClientRects().length>0);
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();const i=links.indexOf(document.activeElement as HTMLAnchorElement);
        links[i<0?(e.key==='ArrowDown'?0:links.length-1):(i+(e.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();
      }
    }}>
      <div className="site-nav-heading"><div><span className="site-nav-eyebrow">IVAN MATIUSHKIN</span><h2 id="site-navigation-title">{c.title}</h2></div><button type="button" aria-label={c.close} onClick={()=>setOpen(false)}>×</button></div>
      <label className="site-nav-search"><span>{c.search}</span><input type="search" value={query} placeholder={c.placeholder} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();dialog.current?.querySelector<HTMLAnchorElement>('.site-nav-result')?.click();}}}/><kbd>↵</kbd></label>
      <div className="site-nav-results"><p className="site-nav-count" aria-live="polite">{query&&`${count} ${c.count}`}</p>{count===0&&<p className="site-nav-empty">{c.empty}</p>}{results.map((group,i)=>{
        if(!group.length)return null;
        const title=[c.tasks,c.examples,c.technical,migrationGuides[locale].label][i];
        const list=<ul className={i===0?'site-nav-goals':undefined}>{group.map(p=><li key={p.path}><Link className="site-nav-result" to={localizedPath('/'+p.slug,locale)} aria-current={location.pathname===p.path?'page':undefined} onClick={()=>setOpen(false)}><span>{p.label}{i<2&&<small>{p.description}</small>}</span><span className="site-nav-marker" aria-label={location.pathname===p.path?c.current:undefined}>{location.pathname===p.path?'●':'→'}</span></Link></li>)}</ul>;
        return i>=2?<details key={title} open={query?true:undefined}><summary>{title}</summary>{list}</details>:<section key={title} aria-label={title}><h3>{title}</h3>{list}{i===1&&<p className="site-nav-disclosure">{c.disclosure}</p>}</section>;
      })}</div>
      <div className="site-nav-footer"><div><span>{c.contactNote}</span><Link className="site-nav-contact" to={localizedPath('/contact',locale)} onClick={()=>setOpen(false)}>{c.contact} →</Link></div><div className="site-nav-secondary"><Link to={localizedPath('/',locale)} onClick={()=>setOpen(false)}>{c.home}</Link><Link to={localizedPath('/privacy',locale)} onClick={()=>setOpen(false)}>{c.privacy}</Link></div></div>
    </dialog>
  </>;
}
