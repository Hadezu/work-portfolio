import {useLocale} from './locale';
const base='https://github.com/Hadezu/operations-desk-reliability/blob/main/docs/';
const demo='https://operations-workflows-staging.vanya-matyushkin.workers.dev';
export default function WorkflowExpansion(){
 const en=useLocale()==='en';
 const cards=en?[
  ['Association Operations','Member import review, dues, payment reconciliation and document previews. German and Polish interface.','ASSOCIATION.md','/association/'],
  ['Booking & Payment Reliability','Limited resources, temporary holds, payment-event simulation, cancellation and refund.','BOOKING.md','/booking/'],
  ['Delivery & Recovery Evidence','Reproducible setup, a tested logical restore and a failed-migration rehearsal.','DELIVERY-RECOVERY.md',''],
 ]:[
  ['Association Operations','Weryfikacja importu członków, składki, uzgadnianie płatności i podgląd dokumentów. Interfejs po niemiecku i polsku.','ASSOCIATION.md','/association/'],
  ['Booking & Payment Reliability','Ograniczone zasoby, czasowe rezerwacje, symulacja zdarzeń płatniczych, anulowanie i zwrot.','BOOKING.md','/booking/'],
  ['Delivery & Recovery Evidence','Odtwarzalny start, sprawdzone przywracanie kopii logicznej i próba nieudanej migracji.','DELIVERY-RECOVERY.md',''],
 ];
 return <section className="shell section" aria-labelledby="workflow-expansion-title"><p className="kicker">{en?'Workflow demonstrations':'Demonstracje procesów'}</p><h2 id="workflow-expansion-title">{en?'Membership, booking and a reviewable handover':'Członkostwo, rezerwacje i sprawdzalne przekazanie'}</h2><p>{en?'Try the new Operations Desk modules in a separate public test environment with its own database. Free hosting limits apply; this is a synthetic demonstration.':'Wypróbuj nowe moduły Operations Desk w osobnym publicznym środowisku testowym z oddzielną bazą. Obowiązują limity bezpłatnego hostingu; demonstracja używa danych syntetycznych.'}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:24,marginTop:24}}>{cards.map(([title,body,file,path])=><article key={file} style={{borderTop:'1px solid currentColor',paddingTop:20}}><h3>{title}</h3><p>{body}</p>{path&&<p><a href={demo+path}>{en?'Open the test demo':'Otwórz demonstrację testową'} ↗</a></p>}<a href={base+file}>{en?'Inspect the workflow and evidence':'Zobacz proces i wyniki weryfikacji'} ↗</a></article>)}</div><p className="contact-notice">{en?'Synthetic data only. Payment simulator; no real bank, card or email connection. Discuss a complete application or start with one import, resource type or restore rehearsal.':'Wyłącznie dane syntetyczne. Symulator płatności; bez połączenia z bankiem, kartami i wysyłką e-mail. Możemy ustalić pełną aplikację albo zacząć od jednego importu, typu zasobu lub próby przywrócenia danych.'}</p></section>;
}
