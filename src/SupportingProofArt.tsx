import {Link} from 'react-router-dom';
import {useLocale,localizedPath} from './locale';
import {defineCopy} from './localization-contract';
import {buyerCopy} from './buyer-copy';
import './supporting-proof-art.css';

const copy=defineCopy('supporting-proof-art',{
 en:{reconciliation:'Reconciliation',operations:'Operations exceptions',compare:'Compare the sources',sources:['Orders','Invoices','Warehouse'],difference:'Amount mismatch',trace:'Trace the difference to its source record.',review:'From exception to review',rule:'Rule',priority:'Priority',source:'Source record',ruleValue:'Missing document',priorityValue:'High',sourceValue:'File + row',note:'Inspect the evidence and recommended action.',disclosure:'Capability illustration · synthetic scenario · not a live result'},
 pl:{reconciliation:'Uzgadnianie danych',operations:'Wyjątki operacyjne',compare:'Porównaj źródła',sources:['Zamówienia','Faktury','Magazyn'],difference:'Niezgodna kwota',trace:'Prześledź różnicę do rekordu źródłowego.',review:'Od wyjątku do weryfikacji',rule:'Reguła',priority:'Priorytet',source:'Rekord źródłowy',ruleValue:'Brak dokumentu',priorityValue:'Wysoki',sourceValue:'Plik + wiersz',note:'Sprawdź dowody i zalecane działanie.',disclosure:'Ilustracja funkcji · scenariusz syntetyczny · nie jest bieżącym wynikiem'},
});

export function SupportingProofArt({kind}:{kind:'reconciliation'|'operations-exceptions'}){
 const locale=useLocale(),c=copy[locale],open=buyerCopy[locale].open,reconciliation=kind==='reconciliation';
 return <figure className="support-art">
  <Link className={'evidence-preview support-art-panel '+(reconciliation?'support-art-compare':'support-art-operations')} to={localizedPath('/'+kind,locale)} aria-label={(reconciliation?c.reconciliation:c.operations)+' — '+open}>
   <div className="support-art-header"><span>{reconciliation?c.reconciliation:c.operations}</span><span aria-hidden="true">{reconciliation?'A / B':'! / →'}</span></div>
   {reconciliation?<>
    <div className="support-art-title">{c.compare}</div>
    <div className="support-art-sources">{c.sources.map((source,i)=><div key={source}><span className="support-art-source-number" aria-hidden="true">0{i+1}</span><span>{source}</span><span className={'support-art-register register-'+i} aria-hidden="true"><i/><i/><i/><i/><i/></span></div>)}</div>
    <div className="support-art-finding"><span aria-hidden="true">≠</span><strong>{c.difference}</strong></div>
    <p className="support-art-note">{c.trace}</p>
   </>:<>
    <div className="support-art-title">{c.review}</div>
    <dl className="support-art-ledger">{[[c.rule,c.ruleValue],[c.priority,c.priorityValue],[c.source,c.sourceValue]].map(([label,value],i)=><div key={label}><dt><span aria-hidden="true">0{i+1}</span>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="support-art-note">{c.note}</p>
   </>}
   <div className="support-art-action">{open}<span aria-hidden="true">↗</span></div>
  </Link>
  <figcaption>{c.disclosure}</figcaption>
 </figure>;
}
