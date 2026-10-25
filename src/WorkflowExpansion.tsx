import {useLocale} from './locale';
const base='https://github.com/Hadezu/operations-desk-reliability/blob/codex/commercial-operations-expansion/docs/';
export default function WorkflowExpansion(){
 const en=useLocale()==='en';
 const cards=en?[
  ['Association Operations','Member import review, dues, payment reconciliation and document previews. German and Polish interface.','ASSOCIATION.md'],
  ['Booking & Payment Reliability','Limited resources, temporary holds, payment-event simulation, cancellation and refund.','BOOKING.md'],
  ['Delivery & Recovery Evidence','Reproducible setup, a tested logical restore and a failed-migration rehearsal.','DELIVERY-RECOVERY.md'],
 ]:[
  ['Association Operations','Weryfikacja importu członków, składki, uzgadnianie płatności i podgląd dokumentów. Interfejs po niemiecku i polsku.','ASSOCIATION.md'],
  ['Booking & Payment Reliability','Ograniczone zasoby, czasowe rezerwacje, symulacja zdarzeń płatniczych, anulowanie i zwrot.','BOOKING.md'],
  ['Delivery & Recovery Evidence','Odtwarzalny start, sprawdzone przywracanie kopii logicznej i próba nieudanej migracji.','DELIVERY-RECOVERY.md'],
 ];
 return <section className="shell section" aria-labelledby="workflow-expansion-title"><p className="kicker">{en?'Workflow demonstrations':'Demonstracje procesów'}</p><h2 id="workflow-expansion-title">{en?'Membership, booking and a reviewable handover':'Członkostwo, rezerwacje i sprawdzalne przekazanie'}</h2><p>{en?'New modules in Operations Desk, proposed for review and runnable locally. Source, walkthroughs and recorded checks; public hosting is pending.':'Nowe moduły Operations Desk, przygotowane do przeglądu i uruchomienia lokalnie. Kod, scenariusze i zapisane wyniki testów; publikacja demonstracji online oczekuje.'}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:24,marginTop:24}}>{cards.map(([title,body,file])=><article key={file} style={{borderTop:'1px solid currentColor',paddingTop:20}}><h3>{title}</h3><p>{body}</p><a href={base+file}>{en?'Inspect the workflow and evidence':'Zobacz proces i wyniki weryfikacji'} ↗</a></article>)}</div><p className="contact-notice">{en?'Synthetic data only. Payment simulator; no real bank, card or email connection. A first paid stage can focus on one import, resource type or restore rehearsal.':'Wyłącznie dane syntetyczne. Symulator płatności; bez połączenia z bankiem, kartami i wysyłką e-mail. Pierwszy płatny etap może objąć jeden import, typ zasobu lub próbę przywrócenia danych.'}</p></section>;
}
