import { defineCopy } from './localization-contract';
export const homeCopy = defineCopy('homepage', {
  "pl": {
    "ids": {
      "services": "pomoc",
      "scope": "zakres",
      "work": "jak-pracuje",
      "risk": "brak-case-study",
      "competencies": "kompetencje",
      "proofs": "przyklady"
    },
    "hero": {
      "eyebrow": "Buduję · naprawiam · integruję · automatyzuję",
      "role": "Niezależny wykonawca · Polska / współpraca zdalna",
      "tagline": "Integracje, automatyzacja i systemy wewnętrzne dla firm",
      "title": "Oprogramowanie dla procesów, które wciąż wymagają zbyt wiele ręcznej pracy.",
      "verbs": "API · ERP / CRM · CSV / XLS / XML · e-commerce · przepływy pracy",
      "intro": "Tworzę narzędzia i automatyzacje, które łączą systemy, ograniczają powtarzalną pracę i pomagają korzystać z danych. Opisz obecną sytuację — sprawdzę, jak mogę pomóc i od czego warto zacząć.",
      "contact": "Opisz swój problem",
      "examples": "Zobacz przykłady"
    },
    "services": {
      "eyebrow": "Co mogę zrealizować",
      "title": "Co mogę zrealizować",
      "intro": "Jeśli przepisujesz dane z e-maili do ERP albo porównujesz eksporty w Excelu, mogę przygotować integrację lub narzędzie, które wykona tę pracę.",
      "cards": [
        [
          "Integracje API i ERP",
          "Przekazywanie zamówień, dokumentów i statusów między systemami. Ustalam, co zrobić po przerwaniu połączenia i jak obsłużyć ponowne otrzymanie tych samych danych."
        ],
        [
          "Migracje i importy danych",
          "Przygotowanie i przeniesienie danych ze sprawdzeniem liczby rekordów, wymaganych pól i uzgodnionych sum kontrolnych. Odrzucone dane trafiają do raportu."
        ],
        [
          "Uzgadnianie danych",
          "Porównanie płatności, faktur lub rekordów z dwóch systemów. Każdą rozbieżność można odnieść do danych źródłowych; niejednoznaczne dopasowania trafiają do sprawdzenia."
        ],
        [
          "Automatyzacja obiegu pracy",
          "Obsługa uzgodnionych przypadków automatycznie; wyjątki i decyzje trafiają do odpowiednich osób."
        ],
        [
          "Systemy i narzędzia wewnętrzne",
          "Panele operacyjne, formularze i kolejki spraw: kto ma podjąć decyzję, co wymaga uwagi i co już zostało zrobione. Uprawnienia dopasowane do ról w procesie."
        ],
        [
          "Testy integracyjne i odbiorowe",
          "Scenariusze poprawnego działania i błędów, z wynikiem oczekiwanym i rzeczywistym. Sprawdzenia, które można powtórzyć przy odbiorze i po kolejnych zmianach."
        ]
      ],
      "scopeNote": "Zakres może obejmować pojedynczy komponent albo większy fragment rozwiązania — np. integrację kilku systemów, migrację danych, panel operacyjny i warstwę testów w jednym projekcie."
    },
    "scope": {
      "eyebrow": "Dobry pierwszy zakres",
      "title": "Masz małe zadanie?",
      "intro": "Nie trzeba zaczynać od dużego wdrożenia. Mogę przejąć pojedyncze płatne zadanie — zakres i sposób odbioru uzgadniamy przed rozpoczęciem.",
      "label": "Dobry pierwszy zakres",
      "items": [
        "naprawa jednego błędu w webhooku lub API",
        "jeden import lub konwerter CSV / XLS / XML → ERP / CRM",
        "synchronizacja jednego obiektu między systemami",
        "wykrywanie duplikatów, braków lub rozbieżności",
        "mały przepływ automatyzacji w n8n / Make",
        "jeden skrypt w Pythonie lub TypeScript",
        "jedna strona lub małe narzędzie wewnętrzne",
        "automatyzacja jednego powtarzalnego procesu"
      ],
      "button": "Wyślij krótki opis",
      "note": "Opisz problem lub oczekiwany wynik i podaj używane systemy. Najpierw uzgadniamy wynik, wejścia i sposób odbioru."
    },
    "work": {
      "eyebrow": "Jak zaczynamy",
      "title": "Jak zaczynamy",
      "intro": "Zacznij od 2–3 zdań o problemie. Nie potrzebujesz gotowej specyfikacji. Odpowiem e-mailem; materiały, zakres i sposób odbioru ustalimy w kolejnym kroku.",
      "steps": [
        [
          "Materiały",
          "Opis procesu, dokumentacja API lub zanonimizowany eksport."
        ],
        [
          "Analiza",
          "Sprawdzam dane, dostępy i ograniczenia. Wskazuję zależności od innych systemów oraz decyzje potrzebne przed realizacją."
        ],
        [
          "Zakres",
          "Uzgodnienie wyniku, etapów, wyłączeń, wynagrodzenia i kryteriów odbioru."
        ],
        [
          "Realizacja",
          "Pokazuję działające etapy na uzgodnionych danych. Ryzyka i zmiany zakresu omawiam, zanim wpłyną na dalszą pracę."
        ],
        [
          "Testy i odbiór",
          "Sprawdzamy wynik oraz zachowanie przy błędach, brakach danych i ponowieniach. Odbiór opiera się na uzgodnionych scenariuszach."
        ],
        [
          "Przekazanie",
          "Kod, wyniki testów i instrukcja uruchomienia. Dokumentuję konfigurację, obsługę błędów i znane ograniczenia dla osoby, która przejmie rozwiązanie."
        ]
      ]
    },
    "risk": {
      "eyebrow": "Redukcja ryzyka",
      "title": "Sprawdźmy dopasowanie techniczne na małym zakresie",
      "intro": "Jeśli Twojego systemu nie ma w przykładach, zaczynam od dokumentacji API, anonimowej próbki danych lub środowiska testowego. Sprawdzamy, czy wybrany przepływ da się zrealizować i gdzie mogą wystąpić błędy.",
      "closing": "Z góry ustalone oczekiwania i powtarzalne sprawdzenia pomagają ocenić gotowy komponent.",
      "items": [
        "jeden punkt końcowy API lub przepływ danych",
        "mapowanie pól",
        "10–30 przykładowych rekordów",
        "jeden typ błędu lub wyjątku",
        "obsługa duplikatów i idempotencji",
        "uzgodnione kryteria odbioru"
      ]
    },
    "competencies": {
      "eyebrow": "Kompetencje techniczne",
      "title": "Każda pozycja wskazuje działający dowód",
      "cards": [
        [
          "Integracje REST/API",
          "/api-tests",
          "pakiet testów API i kontrakt odpowiedzi"
        ],
        [
          "Integracje zdarzeniowe i webhooki",
          "/data-bridge",
          "poprawne zdarzenie, duplikat, błędny podpis i nieaktualne zdarzenie"
        ],
        [
          "Synchronizacja przyrostowa i idempotencja",
          "/data-bridge",
          "checkpoint, replay i zero duplikatów"
        ],
        [
          "Checkpoint / retry / replay",
          "/data-bridge",
          "przerwanie, wznowienie i ograniczone ponowienia po HTTP 429"
        ],
        [
          "Walidacja kontraktów API",
          "/api-tests",
          "referencja, brak pola, błędny typ, wartość słownikowa i zmiana niezgodna z kontraktem"
        ],
        [
          "Uzgodnienie danych i walidacja migracji",
          "/reconciliation",
          "wartości oczekiwane i rzeczywiste dla eksportów"
        ],
        [
          "Jakość danych, schema drift i lineage",
          "/data-quality",
          "zmiany schematu, kwarantanna i pochodzenie wartości pola"
        ],
        [
          "RBAC i przepływ pracy",
          "/workflow-access",
          "macierz uprawnień i przejścia stanów"
        ],
        [
          "Obsługa wyjątków",
          "/operations-exceptions",
          "kolejka wyjątków i raport"
        ],
        [
          "Walidacja standardów transportowych",
          "/transit-validation",
          "GTFS / GTFS-RT / NeTEx / SIRI"
        ],
        [
          "Walidacja danych medycznych i kontraktów FHIR",
          "/healthcare-integration",
          "kontrakty i referencje zasobów"
        ],
        [
          "Raporty odbiorowe i dowody",
          "/data-bridge",
          "pobranie raportu wykonania i uporządkowany dziennik zdarzeń"
        ]
      ]
    },
    "handover": {
      "eyebrow": "Co otrzymujesz",
      "title": "Rozwiązanie, które można przejąć",
      "intro": "Uzgodniony kod, narzędzie lub konfiguracja, instrukcja uruchomienia, opis obsługi błędów i wyniki testów. Kryteria odbioru pozwalają ponownie sprawdzić działanie po zmianach.",
      "note": "Demonstracje wykorzystują dane syntetyczne i nie są przedstawiane jako wdrożenia klientów."
    },
    "proofs": {
      "eyebrow": "Działające demonstracje techniczne",
      "title": "Zobacz, jak działają poszczególne elementy",
      "intro": "Demonstracje techniczne na danych syntetycznych, nie wdrożenia klientów. Pokazują przepływ danych i efekt działania; testy pozwalają sprawdzić również błędy i sposób ich obsługi.",
      "groups": [
        [
          "Łączenie systemów",
          "Przekazywanie i synchronizacja danych"
        ],
        [
          "Codzienna praca",
          "Sprawy, decyzje i rozbieżności"
        ],
        [
          "Bezpieczne przekazanie danych",
          "Kontrole przed kolejnym krokiem"
        ]
      ],
      "cards": [
        [
          "erp-sync",
          "Synchronizacja rekordów między systemami",
          "Przekaż zmiany do drugiego systemu i wykryj nieudane aktualizacje.",
          "Historia synchronizacji, wyjątki i uzgodnienie danych.",
          "API · mapowanie · idempotencja · retry",
          "/card-thumbnails/pl/erp-sync.png"
        ],
        [
          "data-bridge",
          "Przekształcanie i przekazywanie danych",
          "Uporządkuj dane z kilku źródeł i przygotuj je do kolejnego kroku. Demonstracja pokazuje też wznowienia i duplikaty.",
          "Normalizacja i kolejka spraw wymagających uwagi.",
          "Tylko odczyt · normalizacja · wyjątki",
          "/card-thumbnails/pl/data-bridge.png"
        ],
        [
          "api-tests",
          "Sprawdzenie integracji API przed odbiorem",
          "Sprawdź kontrakty API, ponowienia i obsługę błędów przed przekazaniem komponentu.",
          "Pakiet wyników oczekiwanych i rzeczywistych, scenariusze negatywne i raport.",
          "API · kontrakt · idempotencja",
          "/card-thumbnails/pl/api-tests.png"
        ],
        [
          "operations-exceptions",
          "Jedna kolejka wyjątków operacyjnych",
          "Zbierz braki dokumentów, opóźnienia i niezgodności w listę spraw wymagających działania.",
          "Kolejka działań z priorytetem i dowodem źródłowym.",
          "Zamówienia · dokumenty · statusy · terminy",
          "/card-thumbnails/pl/operations-exceptions.png"
        ],
        [
          "workflow-access",
          "Uprawnienia i akceptacje w procesie",
          "Sprawdź, kto może wykonać dany krok i czy decyzja prowadzi do właściwego stanu.",
          "Macierz uprawnień i powtarzalny raport PASS/FAIL.",
          "RBAC · przepływ pracy · akceptacje",
          "/card-thumbnails/pl/workflow-access.png"
        ],
        [
          "reconciliation",
          "Braki i różnice między źródłami",
          "Porównaj dwa źródła danych i wskaż brakujące lub niezgodne rekordy.",
          "Lista braków, zmian i nadmiarowych rekordów z dowodem.",
          "CSV · reguły porównania · raport",
          "/card-thumbnails/pl/reconciliation.png"
        ],
        [
          "data-quality",
          "Poprawne dane przed kolejnym krokiem",
          "Wykryj brakujące, zduplikowane i nieprawidłowe rekordy, zanim trafią dalej.",
          "Raport jakości, kwarantanna i ślad od źródła do celu.",
          "Kontrakt · transformacje · lineage · regresja",
          "/card-thumbnails/pl/data-quality.png"
        ],
        [
          "transit-validation",
          "Spójne dane transportowe",
          "Wykryj nieaktualne dane i niespójne powiązania przed ich wykorzystaniem przez kolejny system.",
          "Scenariusze, dowody i raport odbiorczy.",
          "GTFS · GTFS-RT · NeTEx · SIRI",
          "/card-thumbnails/pl/transit-validation.png"
        ],
        [
          "healthcare-integration",
          "Spójna wymiana danych medycznych",
          "Sprawdź strukturę i powiązania zasobów w przykładowej wymianie danych inspirowanej FHIR.",
          "Macierz interfejsów, testy i dowody rozbieżności.",
          "FHIR · kontrakty API · referencje",
          "/card-thumbnails/pl/healthcare-integration.png"
        ]
      ],
      "result": "Co sprawdzisz",
      "view": "Zobacz działający przykład",
      "image": "Widok działającego narzędzia: "
    },
    "contact": {
      "eyebrow": "Kontakt e-mail",
      "title": "Masz jeden powtarzalny proces?",
      "intro": "Napisz, co chcesz uprościć:",
      "items": [
        "jakie systemy lub pliki są używane,",
        "co dzieje się dziś,",
        "jaki wynik chcesz uzyskać."
      ],
      "closing": "Na tej podstawie mogę określić mały pierwszy zakres. Możemy zacząć e-mailem, bez umawiania rozmowy.",
      "button": "Opisz jeden proces"
    },
    "partners": {
      "eyebrow": "Współpraca podwykonawcza",
      "title": "Dla agencji, firm programistycznych i integratorów",
      "intro": "Możesz wydzielić jeden zakres: sprawdzenie eksportu przed migracją, uzgodnienie danych między systemami albo testy jednego przepływu API. Pracuję jako niezależny wykonawca w ramach uzgodnionych granic projektu.",
      "note": "Na początek: specyfikacja i próbka bez danych poufnych. Rezultat: powtarzalne kontrole, lista różnic i raport odbioru; kod oraz dokumentacja zgodnie z zakresem. Cenę, termin i kryteria odbioru ustalamy przed płatną pracą.",
      "button": "Opisz komponent do wykonania"
    },
    "contractor": {
      "title": "Współpraca ze mną",
      "location": "Polska / współpraca zdalna",
      "billing": "Obecnie rozliczenie projektów realizuję przez Useme.",
      "agreement": "Przed rozpoczęciem uzgadniamy zakres, wynagrodzenie, harmonogram i sposób odbioru.",
      "areas": "Obszary techniczne: API · Python / FastAPI · TypeScript / React · SQL · CSV / XLS / XML",
      "method": "Zmiany zapisuję w Git. Przy przekazaniu otrzymujesz kod, wyniki testów i dokumentację pozwalającą prześledzić, jak działa rozwiązanie i jak je uruchomić.",
      "commitmentsTitle": "Na czym możesz polegać",
      "commitmentsIntro": "Prowadzę pracę od ustaleń technicznych do przekazania. Pokazuję postępy i zgłaszam kwestie, które wymagają Twojej decyzji.",
      "commitments": [
        ["Ustalenia na piśmie", "Przed startem zapisujemy wynik, zakres, zależności, terminy i sposób odbioru. Wiesz, co zamawiasz i jakie materiały lub dostępy są potrzebne."],
        ["Zmiany bez zaskoczenia przy rozliczeniu", "Dodatkowy zakres oraz jego wpływ na koszt i termin przedstawiam do akceptacji przed realizacją. Nie rozszerzam płatnych prac bez uzgodnienia."],
        ["Postęp, który możesz zobaczyć", "Uzgadniamy punkty przeglądu. Pokazuję działające elementy, wyjaśniam, co jest gotowe, co pozostaje otwarte i czego potrzebuję do następnego etapu."],
        ["Jasna informacja o przeszkodach", "Gdy wykryję ograniczenie API, brak danych lub ryzyko dla terminu, opisuję problem i dostępne opcje. Decyzję o zmianie kierunku podejmujemy świadomie."],
        ["Odbiór według sprawdzalnych kryteriów", "Przekazuję wyniki uzgodnionych testów. Wykryte przed odbiorem niezgodności z ustalonym zakresem poprawiam i sprawdzam ponownie; nowe wymagania uzgadniamy osobno."],
        ["Dostępy i uruchomienie pod kontrolą", "Proszę o uprawnienia potrzebne do uzgodnionego zadania. Do wstępnej oceny wystarczą zanonimizowane próbki. Zmiany w środowisku produkcyjnym wykonuję po uzgodnieniu sposobu i terminu uruchomienia."],
        ["Rozwiązanie do dalszego utrzymania", "Przekazuję uzgodniony kod, konfigurację i instrukcje, tak aby pracę mógł kontynuować również inny wykonawca. Wskazuję zależności, wymagane licencje i znane ograniczenia."],
        ["Zasady po przekazaniu ustalone wcześniej", "Przed rozpoczęciem ustalamy warunki zgłaszania błędów po odbiorze oraz to, czy utrzymanie i dalszy rozwój wchodzą w zakres. Wiesz, czego możesz oczekiwać także po zakończeniu prac."]
      ]
    }
  },
  "en": {
    "ids": {
      "services": "services",
      "scope": "scope",
      "work": "how-i-work",
      "risk": "no-case-study",
      "competencies": "competencies",
      "proofs": "technical-evidence"
    },
    "hero": {
      "eyebrow": "Build · fix · integrate · automate",
      "role": "Independent contractor · Poland / remote",
      "tagline": "Integrations, automation and internal systems for businesses",
      "title": "Custom software for business processes that still take too much manual work.",
      "verbs": "APIs · ERP / CRM · CSV / XLS / XML · e-commerce · workflows",
      "intro": "I build tools and automations that connect systems, reduce repetitive work and make business data easier to use. Describe what happens today — I will review it and suggest a practical next step.",
      "contact": "Describe your problem",
      "examples": "See examples"
    },
    "services": {
      "eyebrow": "What I can deliver",
      "title": "What I can deliver",
      "intro": "If you copy data from emails into your ERP or compare exports in a spreadsheet, I can build an integration or tool to handle that work.",
      "cards": [
        [
          "API and ERP integrations",
          "Move orders, documents and statuses between systems. Define how to recover from a lost connection and handle the same data arriving again."
        ],
        [
          "Data migrations and imports",
          "Prepare and transfer data, checking record counts, required fields and agreed control totals. Rejected data is included in a report."
        ],
        [
          "Data reconciliation",
          "Compare payments, invoices or records from two systems. Trace each discrepancy to its source data and flag ambiguous matches for review."
        ],
        [
          "Workflow automation",
          "Handle agreed cases automatically; route exceptions and decisions to the right people."
        ],
        [
          "Internal systems and tools",
          "Operational dashboards, forms and case queues: who needs to decide, what needs attention and what has been done. Permissions follow the roles in your process."
        ],
        [
          "Integration and acceptance tests",
          "Success and failure scenarios with expected and actual results. Checks you can repeat at acceptance and after subsequent changes."
        ]
      ],
      "scopeNote": "The scope can cover a single component or a larger part of a solution: for example, several system integrations, data migration, an operational dashboard and tests in one project."
    },
    "scope": {
      "eyebrow": "A good first project",
      "title": "Have a small task?",
      "intro": "You do not need to start with a large implementation. I can take on a single paid task, with scope and acceptance agreed before work begins.",
      "label": "A good first scope",
      "items": [
        "fix one webhook or API bug",
        "one CSV / XLS / XML importer or converter → ERP / CRM",
        "synchronize one object between systems",
        "detect duplicates, missing records or discrepancies",
        "a small n8n / Make workflow",
        "one Python or TypeScript script",
        "one internal page or small operational tool",
        "automate one repetitive process"
      ],
      "button": "Send the brief",
      "note": "Describe the problem or expected result and the systems involved. First, we agree on the result, inputs and how to accept the work."
    },
    "work": {
      "eyebrow": "How we start",
      "title": "How we start",
      "intro": "Start with two or three sentences about the problem. You do not need a finished specification. I will reply by email; we can then agree the materials, scope and acceptance checks.",
      "steps": [
        [
          "Materials",
          "A process description, API documentation or an anonymized export."
        ],
        [
          "Analysis",
          "I review data, access and constraints, identify dependencies on other systems and flag decisions needed before implementation."
        ],
        [
          "Scope",
          "Agree the outcome, stages, exclusions, payment and acceptance criteria."
        ],
        [
          "Implementation",
          "I demonstrate working stages with agreed data. Risks and scope changes are discussed before they affect the next stage of work."
        ],
        [
          "Testing and acceptance",
          "We check the result and behavior with failures, missing data and retries. Acceptance is based on agreed scenarios."
        ],
        [
          "Handover",
          "Code, test results and setup instructions. I document configuration, error handling and known limitations for the person taking over the solution."
        ]
      ]
    },
    "risk": {
      "eyebrow": "Risk reduction",
      "title": "Verify the technical fit before a larger implementation",
      "intro": "If your system is not represented in the examples, I start with API documentation, an anonymized data sample or a test environment. We check whether the chosen flow is feasible and where failures may occur.",
      "closing": "Agreed expectations and repeatable checks help you assess the delivered component.",
      "items": [
        "one API endpoint or data flow",
        "field mapping",
        "10–30 sample records",
        "one expected error or exception",
        "duplicate and idempotency handling",
        "agreed acceptance criteria"
      ]
    },
    "competencies": {
      "eyebrow": "Technical competencies",
      "title": "Each capability links to working evidence",
      "cards": [
        [
          "REST/API integrations",
          "/api-tests",
          "API test package and response contract"
        ],
        [
          "Event integrations and webhooks",
          "/data-bridge",
          "valid event, duplicate, invalid signature and stale event"
        ],
        [
          "Incremental synchronization and idempotency",
          "/data-bridge",
          "checkpoint, replay and zero duplicates"
        ],
        [
          "Checkpoint / retry / replay",
          "/data-bridge",
          "interruption, resume and bounded retries after HTTP 429"
        ],
        [
          "API contract validation",
          "/api-tests",
          "reference, missing field, wrong type, enum value and breaking change"
        ],
        [
          "Reconciliation and migration validation",
          "/reconciliation",
          "expected and actual values for exports"
        ],
        [
          "Data quality, schema drift and lineage",
          "/data-quality",
          "schema changes, quarantine and field lineage"
        ],
        [
          "RBAC and workflow",
          "/workflow-access",
          "permission matrix and state transitions"
        ],
        [
          "Exception handling",
          "/operations-exceptions",
          "exception queue and report"
        ],
        [
          "Transport standard validation",
          "/transit-validation",
          "GTFS / GTFS-RT / NeTEx / SIRI"
        ],
        [
          "Healthcare data and FHIR contract validation",
          "/healthcare-integration",
          "contracts and resource references"
        ],
        [
          "Acceptance reports and evidence",
          "/data-bridge",
          "execution report download and structured event log"
        ]
      ]
    },
    "handover": {
      "eyebrow": "What you receive",
      "title": "A component you can take over",
      "intro": "The agreed code, tool or configuration, setup instructions, error-handling notes and test results. Acceptance criteria let you check the behavior again after changes.",
      "note": "The demonstrations use synthetic data and are not presented as customer deployments."
    },
    "proofs": {
      "eyebrow": "Technical evidence",
      "title": "See the components in action",
      "intro": "Technical demonstrations using synthetic data, not client deployments. They show data flows and working outcomes; tests also expose failures and how they are handled.",
      "groups": [
        [
          "Connect systems",
          "Move and synchronize data"
        ],
        [
          "Daily operations",
          "Actions, decisions and discrepancies"
        ],
        [
          "Reliable data handoffs",
          "Checks before the next step"
        ]
      ],
      "cards": [
        [
          "erp-sync",
          "Synchronize records between systems",
          "Send changes to a second system and detect failed updates.",
          "Sync history, exceptions and reconciliation evidence.",
          "API · mapping · idempotency · retry",
          "/card-thumbnails/en/erp-sync.png"
        ],
        [
          "data-bridge",
          "Transform and move structured data",
          "Normalize data from multiple sources for the next step. The demonstration also shows recovery and duplicate handling.",
          "Normalization and an action queue for records requiring attention.",
          "Read-only · normalization · exceptions",
          "/card-thumbnails/en/data-bridge.png"
        ],
        [
          "api-tests",
          "Check API integrations before handover",
          "Verify API contracts, retries and failure handling before handing over the component.",
          "Expected/actual package, negative scenarios and report.",
          "API · contract · idempotency",
          "/card-thumbnails/en/api-tests.png"
        ],
        [
          "operations-exceptions",
          "One operational exception queue",
          "Collect missing documents, delays and mismatches in one actionable workflow.",
          "Prioritized action queue with source evidence.",
          "Orders · documents · statuses · deadlines",
          "/card-thumbnails/en/operations-exceptions.png"
        ],
        [
          "workflow-access",
          "Permissions and approvals in a workflow",
          "Check who can perform each step and whether a decision leads to the correct state.",
          "Permission matrix and repeatable PASS/FAIL report.",
          "RBAC · workflow · approvals",
          "/card-thumbnails/en/workflow-access.png"
        ],
        [
          "reconciliation",
          "Find missing and mismatched records",
          "Compare two data sources and surface missing or inconsistent records.",
          "Missing, changed and extra records with evidence.",
          "CSV · comparison rules · report",
          "/card-thumbnails/en/reconciliation.png"
        ],
        [
          "data-quality",
          "Catch invalid data before the next step",
          "Detect missing, duplicate and invalid records before they move downstream.",
          "Quality report, quarantine and source-to-target lineage.",
          "Contract · transformations · lineage · regression",
          "/card-thumbnails/en/data-quality.png"
        ],
        [
          "transit-validation",
          "Consistent transport data",
          "Detect stale data and inconsistent references before another system uses them.",
          "Scenarios, evidence and acceptance report.",
          "GTFS · GTFS-RT · NeTEx · SIRI",
          "/card-thumbnails/en/transit-validation.png"
        ],
        [
          "healthcare-integration",
          "Consistent healthcare data exchange",
          "Check resource structure and references in a sample FHIR-inspired data exchange.",
          "Interface matrix, tests and discrepancy evidence.",
          "FHIR-style · API contracts · references",
          "/card-thumbnails/en/healthcare-integration.png"
        ]
      ],
      "result": "What you can check",
      "view": "View working example",
      "image": "Working tool view: "
    },
    "contact": {
      "eyebrow": "Email first",
      "title": "Have one repetitive process?",
      "intro": "Tell me what you want to simplify:",
      "items": [
        "which systems or files you use,",
        "what happens today,",
        "what result you want."
      ],
      "closing": "From that, I can define a small first scope. We can start by email, without scheduling a call.",
      "button": "Describe one process"
    },
    "partners": {
      "eyebrow": "Subcontract work",
      "title": "For agencies, software houses and integrators",
      "intro": "Delegate one bounded task: check an export before migration, reconcile data between systems or test one API flow. I work as an independent contractor within the agreed project boundaries.",
      "note": "Start with a specification and a sanitised sample. Receive repeatable checks, a list of differences and an acceptance report, with code and documentation as scoped. We agree price, timing and acceptance criteria before paid work.",
      "button": "Describe the component"
    },
    "contractor": {
      "title": "Working with me",
      "location": "Poland / remote",
      "billing": "I currently handle project payments through Useme.",
      "agreement": "Before starting, we agree the scope, payment, schedule and acceptance process.",
      "areas": "Technical areas: API · Python / FastAPI · TypeScript / React · SQL · CSV / XLS / XML",
      "method": "I track changes in Git. At handover, you receive code, test results and documentation explaining how the solution works and how to run it.",
      "commitmentsTitle": "What you can count on",
      "commitmentsIntro": "I handle the technical work through to handover, show progress and flag anything that needs your decision.",
      "commitments": [
        ["Written agreement on the work", "Before starting, we document the outcome, scope, dependencies, schedule and acceptance process. You know what you are commissioning and which materials or access are needed."],
        ["Scope changes approved before extra work", "I explain additional work and its effect on cost and schedule for approval before implementation. I do not expand paid work without agreement."],
        ["Progress you can see", "We agree review points. I demonstrate working elements, explain what is ready, what remains open and what I need for the next stage."],
        ["Clear information about blockers", "When I identify an API limitation, missing data or a risk to the schedule, I explain the problem and available options. We make an informed decision about any change of direction."],
        ["Acceptance based on verifiable criteria", "I provide the results of agreed tests. Deviations from the agreed scope found before acceptance are corrected and retested; new requirements are agreed separately."],
        ["Controlled access and deployment", "I request the permissions needed for the agreed task. Anonymized samples are enough for an initial review. Production changes follow an agreed deployment approach and schedule."],
        ["A solution someone else can maintain", "I hand over the agreed code, configuration and instructions so another contractor can continue the work. I identify dependencies, required licenses and known limitations."],
        ["Support terms agreed in advance", "Before starting, we agree how defects will be reported after acceptance and whether maintenance and further development are included. You know what to expect after delivery as well."]
      ]
    }
  }
});
