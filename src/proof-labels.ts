import { useLocale } from './locale';
import { defineCopy, selectCopy } from './localization-contract';

// Stable model identifiers are separate from their displayed labels.
const rows: Array<[string, string, string]> = [
  ['start','rozpoczęcie','start'], ['poll','pobranie','fetch'], ['apply','zastosowanie','apply'],
  ['checkpoint','checkpoint','checkpoint'], ['complete','zakończenie','complete'], ['page-2','strona 2','page 2'],
  ['target-write','zapis docelowy','target write'], ['webhook-received','odebranie webhooka','webhook received'],
  ['webhook-apply','zastosowanie webhooka','apply webhook'], ['snapshot','migawka','snapshot'],
  ['Wejście','Wejście','Input'], ['Wyniki','Wyniki','Results'], ['Scenariusze','Scenariusze','Scenarios'],
  ['Macierz uprawnień','Macierz uprawnień','Permission matrix'], ['Workflow','Przepływ pracy','Workflow'],
  ['Raport','Raport','Report'], ['Architektura','Architektura','Architecture'], ['Interfejsy','Interfejsy','Interfaces'],
  ['Referencje','Referencje','References'], ['Mapowanie','Mapowanie','Mapping'], ['Synchronizacja','Synchronizacja','Synchronization'],
  ['Wyjątki','Wyjątki','Exceptions'], ['Uzgodnienie','Uzgodnienie','Reconciliation'], ['Reguły','Reguły','Rules'],
  ['Zamówienia','Zamówienia','Orders'], ['Dokumenty','Dokumenty','Documents'], ['Wynik testu','Wynik testu','Test result'],
  ['Encja','Encja','Entity'], ['Typ reguły','Typ reguły','Rule type'], ['Priorytet','Priorytet','Priority'], ['Reguła','Reguła','Rule'],
  ['ALL','Wszystkie','All'], ['high','wysoki','high'], ['warning','ostrzeżenie','warning'], ['HIGH','WYSOKI','HIGH'],
  ['MEDIUM','ŚREDNI','MEDIUM'], ['LOW','NISKI','LOW'], ['wysoki','wysoki','high'], ['średni','średni','medium'], ['niski','niski','low'],
  ['Jak działa kontrola','Jak działa kontrola','How the check works'], ['Co system wykrywa','Co system wykrywa','What the system detects'],
  ['Co otrzymujesz','Co otrzymujesz','What you receive'], ['Jak odbierany jest wynik','Jak odbierany jest wynik','How the result is accepted'],
  ['Użytkownicy, role, grupy, zasoby i workflow w edytowalnym JSON.','Użytkownicy, role, grupy, zasoby i przepływ pracy w edytowalnym JSON.','Users, roles, groups, resources and workflows in editable JSON.'],
  ['RBAC → przejścia → akceptacje → porównanie expected/actual.','RBAC → przejścia → akceptacje → porównanie wyniku oczekiwanego i rzeczywistego.','RBAC → transitions → approvals → expected/actual comparison.'],
  ['Brak roli, konflikt, pominięcie stanu lub wymaganej akceptacji.','Brak roli, konflikt, pominięcie stanu lub wymaganej akceptacji.','Missing role, conflict, skipped state or missing required approval.'],
  ['Raport rozbieżności, uporządkowane dowody i PASS/FAIL.','Raport rozbieżności, uporządkowane dowody i PASS/FAIL.','Discrepancy report, structured evidence and PASS/FAIL.'],
  ['Test przechodzi, gdy decyzja i reguła odpowiadają uzgodnionemu oczekiwaniu.','Test przechodzi, gdy decyzja i reguła odpowiadają uzgodnionemu oczekiwaniu.','The test passes when the decision and rule match the agreed expectation.'],
  ['Syntetyczne zasoby Patient, Organization, Encounter, Observation, Appointment, ServiceRequest.','Syntetyczne zasoby Patient, Organization, Encounter, Observation, Appointment, ServiceRequest.','Synthetic Patient, Organization, Encounter, Observation, Appointment and ServiceRequest resources.'],
  ['Kontrakt → typowane zasoby → referencje → scenariusze expected/actual.','Kontrakt → typowane zasoby → referencje → scenariusze z wynikiem oczekiwanym i rzeczywistym.','Contract → typed resources → references → expected/actual scenarios.'],
  ['Brak identyfikatora lub referencji, status, timestamp, niespójny subject i odpowiedź HTTP.','Brak identyfikatora lub referencji, status, znacznik czasu, niespójne pole subject i odpowiedź HTTP.','Missing identifier or reference, status, timestamp, inconsistent subject and HTTP response.'],
  ['Macierz interfejsów, graf referencji, dowody i raport JSON/CSV.','Macierz interfejsów, graf referencji, dowody i raport JSON/CSV.','Interface matrix, reference graph, evidence and JSON/CSV report.'],
  ['Uzgodnione decyzje, reguły i odpowiedzi dają oczekiwane wyniki testów.','Uzgodnione decyzje, reguły i odpowiedzi dają oczekiwane wyniki testów.','Agreed decisions, rules and responses produce the expected test results.'],
  ['SYSTEM A: klient, produkty i wersjonowane pozycje zamówień.','SYSTEM A: klient, produkty i wersjonowane pozycje zamówień.','SYSTEM A: customer, products and versioned order lines.'],
  ['Mapowanie → walidacja → stan transakcji → idempotencja i wersje.','Mapowanie → walidacja → stan transakcji → idempotencja i wersje.','Mapping → validation → transaction state → idempotency and versions.'],
  ['Brak mapowania, konflikt wersji, częściowy zapis, timeout.','Brak mapowania, konflikt wersji, częściowy zapis i przekroczenie czasu.','Missing mapping, version conflict, partial write and timeout.'],
  ['Historia, kolejka wyjątków, uzgodnienie i raport JSON/CSV.','Historia, kolejka wyjątków, uzgodnienie i raport JSON/CSV.','History, exception queue, reconciliation and JSON/CSV report.'],
  ['Oczekiwane decyzje i stan celu zgadzają się z wynikiem.','Oczekiwane decyzje i stan celu zgadzają się z wynikiem.','Expected decisions and target state match the result.'],
  ['Eksport danych operacyjnych CSV/JSON.','Eksport danych operacyjnych CSV/JSON.','CSV/JSON operational data export.'],
  ['Parser → normalizacja → reguły → cross-check.','Parser → normalizacja → reguły → kontrola powiązań.','Parser → normalization → rules → cross-check.'],
  ['Brak dokumentu, niespójny status, termin i zapas.','Brak dokumentu, niespójny status, termin i zapas.','Missing document, inconsistent status, deadline and inventory.'],
  ['Kolejka wyjątków, źródło rekordu i raport.','Kolejka wyjątków, źródło rekordu i raport.','Exception queue, record source and report.'],
  ['Reguły wykrywają uzgodnione przypadki i dają oczekiwany wynik.','Reguły wykrywają uzgodnione przypadki i dają oczekiwany wynik.','Rules detect the agreed cases and produce the expected result.'],
  ['Baseline import','Import referencyjny','Baseline import'], ['Nowe po checkpoint','Nowe rekordy po checkpoint','New records after checkpoint'],
  ['Przerwanie','Przerwanie','Interrupted run'], ['Resume','Wznów','Resume'], ['Replay','Replay','Replay same input'],
  ['429 / retry','429 / retry','Simulate 429'], ['Webhook OK','Poprawny webhook','Valid event'], ['Duplikat','Duplikat','Duplicate event'],
  ['Zły podpis','Błędny podpis','Invalid signature'], ['Stare zdarzenie','Nieaktualne zdarzenie','Stale event'],
  ['Repair replay','Napraw i wykonaj replay','Repair and replay'], ['Snapshot ×2','Dwa zapisy migawki','Append snapshot'],
  ['Eksport / API read-only','Eksport / API tylko do odczytu','Export / read-only API'], ['Normalizacja','Normalizacja','Normalization'],
  ['Kolejka wyjątków','Kolejka wyjątków','Exception queue'],
];
const pl: Record<string,string>={}, en: Record<string,string>={};
for (const [id,p,e] of rows) { if (id in pl) throw new Error(`Duplicate label ${id}`); pl[id]=p; en[id]=e; }
export const proofLabels=defineCopy('proof-labels',{pl,en});
export function useProofLabel() {
  const copy=selectCopy(proofLabels,useLocale());
  return (id:string) => {
    if (!(id in copy)) throw new Error(`Missing required proof label: ${id}`);
    return copy[id];
  };
}
