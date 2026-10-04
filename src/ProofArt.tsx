import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {defineCopy} from './localization-contract';
import {buyerCopy} from './buyer-copy';
import {proofArtData as data} from './proof-art-data';
import './proof-art.css';
const copy=defineCopy('proof-art',{
 en:{source:'Source records',before:'Delivered before correction',after:'Matched after replay',repair:'Replayed after correction',migrationNote:'SKU-X99 mapping corrected. Four delivered records remain unchanged.',total:'Matching total',reportedBefore:'Reported revenue before correction',mapping:'Northstar mapping',reportedAfter:'After mapping and reconciliation',revenueNote:'Previously excluded revenue is included. This is a reporting correction, not new sales.',disclosure:'Illustrated scenario · synthetic data · not a live run',direction:'Source → match'},
 pl:{source:'Rekordy źródłowe',before:'Przeniesione przed poprawką',after:'Zgodne po ponowieniu',repair:'Ponowione po poprawce',migrationNote:'Poprawiono mapowanie SKU-X99. Cztery dostarczone rekordy pozostały bez zmian.',total:'Zgodna suma',reportedBefore:'Przychód raportowany przed poprawką',mapping:'Mapowanie Northstar',reportedAfter:'Po mapowaniu i uzgodnieniu',revenueNote:'Uwzględniono wcześniej pominięty przychód. To poprawka raportu, nie nowa sprzedaż.',disclosure:'Ilustracja scenariusza · dane syntetyczne · nie jest bieżącym wynikiem',direction:'Źródło → zgodność'},
});
export function ProofArt({kind}:{kind:'migration'|'revenue-bi'}){
 const locale=useLocale(),c=copy[locale],b=buyerCopy[locale],migration=kind==='migration',m=data.migration,r=data.revenue;
 const money=(cents:number,currency:string)=>new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:currency==='EUR'?0:2,minimumFractionDigits:currency==='EUR'?0:2}).format(cents/100);
 return <figure className="proof-art"><Link className={'evidence-preview proof-art-panel '+(migration?'proof-art-migration':'proof-art-revenue')} to={localizedPath('/proof/'+kind,locale)} aria-label={b.demoNames[migration?0:1]+' — '+b.open}>
  <div className="proof-art-heading"><span>{b.demoNames[migration?0:1]}</span><span>{migration?c.direction:'EUR'}</span></div>
  {migration?<><div className="proof-art-flow">{[[m.source,c.source],[m.before,c.before],[m.after,c.after]].map(([count,label],i)=><div key={i}><strong>{count}</strong><span>{label}</span><div className="proof-art-marks" aria-hidden="true">{Array.from({length:m.source},(_,j)=><i key={j} className={j>=Number(count)?'held':''}/>)}</div></div>)}</div><p className="proof-art-trace">{m.replayed.join(' + ')}<span>{c.repair}</span></p><p className="proof-art-note">{c.migrationNote}</p><p className="proof-art-total">{c.total}: <strong>{money(Math.round(Number(m.total)*100),'PLN')}</strong></p></>:<><div className="proof-art-before">{money(r.before,'EUR')}</div><p className="proof-art-label">{c.reportedBefore}</p><p className="proof-art-delta">+{money(r.delta,'EUR')} <span>/ {c.mapping}</span></p><div className="proof-art-after">{money(r.after,'EUR')}</div><p className="proof-art-label">{c.reportedAfter}</p><p className="proof-art-note">{c.revenueNote}</p></>}
  <div className="proof-art-action">{b.open}<span aria-hidden="true">↗</span></div>
 </Link><figcaption>{c.disclosure}</figcaption></figure>;
}
