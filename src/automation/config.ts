import {defineCopy, type Localized} from '../localization-contract';
export type RuleKind = 'missing'|'mismatch'|'invalid'|'overdue'|'stock'|'duplicate'|'status'|'approval';
export type Preset = {id:string; defaultPattern:PatternId; proof:'erp-sync'|'data-bridge'|'operations-exceptions'|'reconciliation'|'data-quality'|'api-tests'|'workflow-access'|'transit-validation'|'healthcare-integration'; copy:Localized<{name:string;flow:[string,string,string,string,string];manual:string[];comparisonSources:[string,string]}>;rules:{id:string;kind:RuleKind;copy:Localized<{label:string;action:string}>}[]};
const source = [
  {
    "id": "manufacturing",
    "defaultPattern": "order-flow",
    "proof": "erp-sync",
    "copy": {
      "pl": {
        "name": "Produkcja",
        "flow": [
          "Zamówienie",
          "ERP",
          "Produkcja",
          "Magazyn",
          "Wysyłka"
        ],
        "manual": [
          "Przeczytaj zamówienie",
          "Przepisz pozycje do ERP",
          "Sprawdź materiał i ilości",
          "Uzgodnij produkcję i wydanie"
        ],
        "comparisonSources": [
          "Eksport zamówień ERP",
          "Eksport wydań magazynowych"
        ]
      },
      "en": {
        "name": "Manufacturing",
        "flow": [
          "Order",
          "ERP",
          "Production",
          "Warehouse",
          "Dispatch"
        ],
        "manual": [
          "Read the order",
          "Enter line items in ERP",
          "Check materials and quantities",
          "Coordinate production and dispatch"
        ],
        "comparisonSources": [
          "ERP order export",
          "Warehouse dispatch export"
        ]
      }
    },
    "rules": [
      {
        "id": "manufacturing-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Brak materiału",
            "action": "Uzupełnij kartotekę materiału."
          },
          "en": {
            "label": "Missing material",
            "action": "Complete the material record."
          }
        }
      },
      {
        "id": "manufacturing-2",
        "kind": "mismatch",
        "copy": {
          "pl": {
            "label": "Różnica ilości",
            "action": "Porównaj ilość z dokumentem."
          },
          "en": {
            "label": "Quantity mismatch",
            "action": "Compare the quantity with the document."
          }
        }
      },
      {
        "id": "manufacturing-3",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Błąd danych",
            "action": "Popraw dane wejściowe."
          },
          "en": {
            "label": "Invalid data",
            "action": "Correct the input data."
          }
        }
      },
      {
        "id": "manufacturing-4",
        "kind": "overdue",
        "copy": {
          "pl": {
            "label": "Opóźniony etap",
            "action": "Uzgodnij termin z właścicielem etapu."
          },
          "en": {
            "label": "Delayed stage",
            "action": "Confirm the deadline with the stage owner."
          }
        }
      }
    ]
  },
  {
    "id": "ecommerce",
    "defaultPattern": "order-flow",
    "proof": "data-bridge",
    "copy": {
      "pl": {
        "name": "Handel / e-commerce",
        "flow": [
          "Sklep / platforma sprzedażowa",
          "ERP",
          "Magazyn",
          "Kurier",
          "Klient"
        ],
        "manual": [
          "Odczytaj zamówienie ze sklepu",
          "Znajdź SKU i sprawdź zapas",
          "Sprawdź adres i duplikaty",
          "Przekaż zamówienie do magazynu i kuriera"
        ],
        "comparisonSources": [
          "Eksport zamówień sklepu",
          "Eksport zamówień ERP"
        ]
      },
      "en": {
        "name": "Retail / ecommerce",
        "flow": [
          "Store / marketplace",
          "ERP",
          "Warehouse",
          "Carrier",
          "Customer"
        ],
        "manual": [
          "Read the shop order",
          "Find the SKU and check stock",
          "Check address and duplicates",
          "Forward the order to warehouse and carrier"
        ],
        "comparisonSources": [
          "Shop order export",
          "ERP order export"
        ]
      }
    },
    "rules": [
      {
        "id": "ecommerce-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Brak SKU w ERP",
            "action": "Sprawdź mapowanie produktu."
          },
          "en": {
            "label": "SKU missing in ERP",
            "action": "Check the product mapping."
          }
        }
      },
      {
        "id": "ecommerce-2",
        "kind": "stock",
        "copy": {
          "pl": {
            "label": "Brak towaru",
            "action": "Uzgodnij dostępność towaru."
          },
          "en": {
            "label": "Insufficient stock",
            "action": "Confirm stock availability."
          }
        }
      },
      {
        "id": "ecommerce-3",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Nieprawidłowy adres",
            "action": "Potwierdź adres z klientem."
          },
          "en": {
            "label": "Invalid address",
            "action": "Confirm the address with the customer."
          }
        }
      },
      {
        "id": "ecommerce-4",
        "kind": "duplicate",
        "copy": {
          "pl": {
            "label": "Powtórzone zamówienie",
            "action": "Sprawdź istniejące zamówienie; nie twórz drugiego."
          },
          "en": {
            "label": "Duplicate order",
            "action": "Check the existing order; do not create another."
          }
        }
      },
      {
        "id": "ecommerce-5",
        "kind": "status",
        "copy": {
          "pl": {
            "label": "Niezgodność statusu",
            "action": "Porównaj statusy w obu systemach."
          },
          "en": {
            "label": "Status mismatch",
            "action": "Compare the statuses in both systems."
          }
        }
      }
    ]
  },
  {
    "id": "logistics",
    "defaultPattern": "status-sync",
    "proof": "operations-exceptions",
    "copy": {
      "pl": {
        "name": "Logistyka / dystrybucja",
        "flow": [
          "Zdarzenie od kuriera",
          "ERP",
          "Magazyn",
          "Kurier",
          "ERP: zamówienie dostarczone"
        ],
        "manual": [
          "Otwórz zdarzenie od kuriera",
          "Znajdź zamówienie po numerze przesyłki",
          "Sprawdź wagę, status i powtórzone zdarzenia",
          "Zmień status zamówienia w ERP z wysłane na dostarczone"
        ],
        "comparisonSources": [
          "Eksport przesyłek WMS",
          "Eksport zdarzeń przewoźnika"
        ]
      },
      "en": {
        "name": "Logistics / distribution",
        "flow": [
          "Carrier event",
          "ERP",
          "Warehouse",
          "Carrier",
          "ERP: order delivered"
        ],
        "manual": [
          "Open the carrier event",
          "Find the order by shipment number",
          "Check weight, status and repeated events",
          "Change the ERP order from dispatched to delivered"
        ],
        "comparisonSources": [
          "WMS shipment export",
          "Carrier event export"
        ]
      }
    },
    "rules": [
      {
        "id": "logistics-1",
        "kind": "mismatch",
        "copy": {
          "pl": {
            "label": "Niezgodność wagi lub wymiarów",
            "action": "Sprawdź dane przesyłki."
          },
          "en": {
            "label": "Weight or dimension mismatch",
            "action": "Check the shipment data."
          }
        }
      },
      {
        "id": "logistics-2",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Brak statusu przesyłki",
            "action": "Uzupełnij status od przewoźnika."
          },
          "en": {
            "label": "Missing shipment status",
            "action": "Retrieve the carrier status."
          }
        }
      },
      {
        "id": "logistics-3",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Wyjątek w dostawie",
            "action": "Przekaż sprawę do obsługi dostawy."
          },
          "en": {
            "label": "Delivery exception",
            "action": "Assign the delivery for review."
          }
        }
      },
      {
        "id": "logistics-4",
        "kind": "duplicate",
        "copy": {
          "pl": {
            "label": "Powtórzone zdarzenie przesyłki",
            "action": "Sprawdź identyfikator zdarzenia."
          },
          "en": {
            "label": "Duplicate shipment event",
            "action": "Check the event identifier."
          }
        }
      }
    ]
  },
  {
    "id": "finance",
    "defaultPattern": "reconciliation",
    "proof": "reconciliation",
    "copy": {
      "pl": {
        "name": "Finanse / księgowość",
        "flow": [
          "Faktura / ERP",
          "Bank",
          "Uzgodnienie",
          "Status płatności",
          "Raport"
        ],
        "manual": [
          "Pobierz dokumenty i wyciąg",
          "Znajdź pary według referencji",
          "Porównaj kwoty",
          "Zapisz różnice do wyjaśnienia"
        ],
        "comparisonSources": [
          "Eksport należności ERP",
          "Wyciąg bankowy"
        ]
      },
      "en": {
        "name": "Finance / accounting",
        "flow": [
          "Invoice / ERP",
          "Bank",
          "Reconciliation",
          "Payment status",
          "Report"
        ],
        "manual": [
          "Export documents and bank statement",
          "Match pairs by reference",
          "Compare amounts",
          "Record differences for review"
        ],
        "comparisonSources": [
          "ERP receivables export",
          "Bank statement"
        ]
      }
    },
    "rules": [
      {
        "id": "finance-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Płatność bez dopasowania",
            "action": "Sprawdź numer referencyjny płatności."
          },
          "en": {
            "label": "Unmatched payment",
            "action": "Check the payment reference."
          }
        }
      },
      {
        "id": "finance-2",
        "kind": "mismatch",
        "copy": {
          "pl": {
            "label": "Niezgodność kwoty",
            "action": "Porównaj kwotę płatności i faktury."
          },
          "en": {
            "label": "Amount mismatch",
            "action": "Compare payment and invoice amounts."
          }
        }
      },
      {
        "id": "finance-3",
        "kind": "duplicate",
        "copy": {
          "pl": {
            "label": "Duplikat płatności",
            "action": "Zweryfikuj powtórzenie przed księgowaniem."
          },
          "en": {
            "label": "Duplicate payment",
            "action": "Verify the duplicate before posting."
          }
        }
      },
      {
        "id": "finance-4",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Brak dokumentu",
            "action": "Uzupełnij dokument źródłowy."
          },
          "en": {
            "label": "Missing document",
            "action": "Provide the source document."
          }
        }
      }
    ]
  },
  {
    "id": "services",
    "defaultPattern": "document-flow",
    "proof": "workflow-access",
    "copy": {
      "pl": {
        "name": "Usługi / B2B",
        "flow": [
          "Zapytanie klienta z formularza",
          "CRM",
          "Utworzenie zadania w CRM",
          "Przypisanie opiekuna sprawy",
          "Status sprawy"
        ],
        "manual": [
          "Przeczytaj zapytanie klienta",
          "Znajdź firmę i sprawdź opis sprawy",
          "Sprawdź zgodę na rozpoczęcie pracy",
          "Utwórz zadanie i przypisz opiekuna"
        ],
        "comparisonSources": [
          "Eksport zadań CRM",
          "Eksport dokumentów rozliczeniowych"
        ]
      },
      "en": {
        "name": "Services / B2B",
        "flow": [
          "Customer enquiry from a form",
          "CRM",
          "Create a CRM task",
          "Assign the case owner",
          "Case status"
        ],
        "manual": [
          "Read the customer enquiry",
          "Find the company and check the request",
          "Check approval to start work",
          "Create a task and assign its owner"
        ],
        "comparisonSources": [
          "CRM task export",
          "Billing document export"
        ]
      }
    },
    "rules": [
      {
        "id": "services-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Niepełne dane",
            "action": "Uzupełnij wymagane pola."
          },
          "en": {
            "label": "Incomplete input",
            "action": "Complete the required fields."
          }
        }
      },
      {
        "id": "services-2",
        "kind": "duplicate",
        "copy": {
          "pl": {
            "label": "Powtórzona firma",
            "action": "Porównaj z istniejącym wpisem w CRM."
          },
          "en": {
            "label": "Duplicate company",
            "action": "Compare with the existing CRM entry."
          }
        }
      },
      {
        "id": "services-3",
        "kind": "approval",
        "copy": {
          "pl": {
            "label": "Wymagana akceptacja",
            "action": "Przekaż decyzję uprawnionej osobie."
          },
          "en": {
            "label": "Approval required",
            "action": "Request a decision from an authorized person."
          }
        }
      },
      {
        "id": "services-4",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Brak właściciela sprawy",
            "action": "Przypisz osobę odpowiedzialną."
          },
          "en": {
            "label": "Missing owner",
            "action": "Assign a responsible owner."
          }
        }
      }
    ]
  },
  {
    "id": "administration",
    "defaultPattern": "approval-flow",
    "proof": "workflow-access",
    "copy": {
      "pl": {
        "name": "Organizacja / administracja",
        "flow": [
          "Formularz / dokument",
          "System / CRM",
          "Akceptacja",
          "Płatność / status",
          "Raportowanie"
        ],
        "manual": [
          "Odczytaj formularz",
          "Sprawdź dokumenty i zgody",
          "Uzyskaj decyzję osoby uprawnionej",
          "Zapisz decyzję i sprawdź status"
        ],
        "comparisonSources": [
          "Rejestr spraw",
          "Rejestr płatności"
        ]
      },
      "en": {
        "name": "Organization / administration",
        "flow": [
          "Form / document",
          "System / CRM",
          "Approval",
          "Payment / status",
          "Reporting"
        ],
        "manual": [
          "Read the form",
          "Check documents and consents",
          "Obtain an authorized decision",
          "Record the decision and check status"
        ],
        "comparisonSources": [
          "Case register",
          "Payment register"
        ]
      }
    },
    "rules": [
      {
        "id": "administration-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Brak zgody lub dokumentu",
            "action": "Uzupełnij wymagane potwierdzenie."
          },
          "en": {
            "label": "Missing consent or document",
            "action": "Provide the required confirmation."
          }
        }
      },
      {
        "id": "administration-2",
        "kind": "invalid",
        "copy": {
          "pl": {
            "label": "Nieprawidłowe dane",
            "action": "Sprawdź i popraw dane."
          },
          "en": {
            "label": "Invalid data",
            "action": "Check and correct the data."
          }
        }
      },
      {
        "id": "administration-3",
        "kind": "approval",
        "copy": {
          "pl": {
            "label": "Wymagana decyzja",
            "action": "Uzyskaj decyzję osoby uprawnionej."
          },
          "en": {
            "label": "Approval required",
            "action": "Obtain an authorized decision."
          }
        }
      },
      {
        "id": "administration-4",
        "kind": "status",
        "copy": {
          "pl": {
            "label": "Niezgodność płatności lub statusu",
            "action": "Sprawdź aktualny stan sprawy."
          },
          "en": {
            "label": "Payment or status mismatch",
            "action": "Check the current case status."
          }
        }
      }
    ]
  },
  {
    "id": "other",
    "defaultPattern": "other",
    "proof": "data-quality",
    "copy": {
      "pl": {
        "name": "Inny proces",
        "flow": [
          "Źródło danych",
          "Walidacja",
          "Reguły",
          "System docelowy",
          "Wynik"
        ],
        "manual": [
          "Odczytaj dane źródłowe",
          "Sprawdź wartości i duplikaty",
          "Wyjaśnij rozbieżności",
          "Przekaż zaakceptowane dane"
        ],
        "comparisonSources": [
          "Zestaw A",
          "Zestaw B — uzgodniony wzorzec"
        ]
      },
      "en": {
        "name": "Another process",
        "flow": [
          "Data source",
          "Validation",
          "Rules",
          "Target system",
          "Result"
        ],
        "manual": [
          "Read source data",
          "Check values and duplicates",
          "Resolve discrepancies",
          "Transfer approved data"
        ],
        "comparisonSources": [
          "Dataset A",
          "Dataset B — agreed reference"
        ]
      }
    },
    "rules": [
      {
        "id": "other-1",
        "kind": "missing",
        "copy": {
          "pl": {
            "label": "Brak wymaganej wartości",
            "action": "Uzupełnij dane źródłowe."
          },
          "en": {
            "label": "Missing required value",
            "action": "Complete the source data."
          }
        }
      },
      {
        "id": "other-2",
        "kind": "mismatch",
        "copy": {
          "pl": {
            "label": "Niezgodne wartości",
            "action": "Wyjaśnij różnicę przed przekazaniem."
          },
          "en": {
            "label": "Mismatched values",
            "action": "Resolve the difference before transfer."
          }
        }
      },
      {
        "id": "other-3",
        "kind": "duplicate",
        "copy": {
          "pl": {
            "label": "Powtórzony rekord",
            "action": "Sprawdź wcześniejsze wykonanie."
          },
          "en": {
            "label": "Duplicate record",
            "action": "Check the earlier execution."
          }
        }
      },
      {
        "id": "other-4",
        "kind": "approval",
        "copy": {
          "pl": {
            "label": "Wymagana decyzja",
            "action": "Przekaż wyjątek do osoby odpowiedzialnej."
          },
          "en": {
            "label": "Decision required",
            "action": "Assign the exception to its owner."
          }
        }
      }
    ]
  }
] satisfies Preset[];
export const presets:readonly Preset[]=source.map(p=>({...p,copy:defineCopy('automation-preset-'+p.id,p.copy),rules:p.rules.map(r=>({...r,copy:defineCopy('automation-rule-'+r.id,r.copy)}))}));
export const patterns = [
{id:"data-entry",destinations:[1],code:"DATA_ENTRY",copy:defineCopy("automation-pattern-data-entry",{"pl": {"name": "Wprowadzanie danych", "action": "Import danych"}, "en": {"name": "Data entry", "action": "Data imported"}})},
{id:"data-sync",destinations:[1],code:"DATA_SYNC",copy:defineCopy("automation-pattern-data-sync",{"pl": {"name": "Synchronizacja danych", "action": "Synchronizacja rekordów"}, "en": {"name": "Data synchronization", "action": "Records synchronized"}})},
{id:"reconciliation",destinations:[],code:"RECONCILIATION",copy:defineCopy("automation-pattern-reconciliation",{"pl": {"name": "Uzgodnienie danych", "action": "Uzgodnienie par danych"}, "en": {"name": "Reconciliation", "action": "Data pairs reconciled"}})},
{id:"document-flow",destinations:[2, 3],code:"DOCUMENT_FLOW",copy:defineCopy("automation-pattern-document-flow",{"pl": {"name": "Obieg dokumentów", "action": "Przekazanie dokumentu"}, "en": {"name": "Document flow", "action": "Document routed"}})},
{id:"order-flow",destinations:[1, 2, 3],code:"ORDER_FLOW",copy:defineCopy("automation-pattern-order-flow",{"pl": {"name": "Obsługa zamówień", "action": "Przekazanie zamówienia"}, "en": {"name": "Order flow", "action": "Order routed"}})},
{id:"approval-flow",destinations:[2],code:"APPROVAL_FLOW",copy:defineCopy("automation-pattern-approval-flow",{"pl": {"name": "Obieg akceptacji", "action": "Rejestracja akceptacji"}, "en": {"name": "Approval flow", "action": "Approval recorded"}})},
{id:"status-sync",destinations:[4],code:"STATUS_SYNC",copy:defineCopy("automation-pattern-status-sync",{"pl": {"name": "Synchronizacja statusów", "action": "Aktualizacja statusu"}, "en": {"name": "Status synchronization", "action": "Status updated"}})},
{id:"exception-handling",destinations:[3],code:"EXCEPTION_HANDLING",copy:defineCopy("automation-pattern-exception-handling",{"pl": {"name": "Obsługa wyjątków", "action": "Klasyfikacja sprawy"}, "en": {"name": "Exception handling", "action": "Case classified"}})},
{id:"reporting",destinations:[4],code:"REPORTING",copy:defineCopy("automation-pattern-reporting",{"pl": {"name": "Raportowanie", "action": "Dodanie do raportu"}, "en": {"name": "Reporting", "action": "Added to report"}})},
{id:"end-to-end",destinations:[1, 2, 3, 4],code:"END_TO_END",copy:defineCopy("automation-pattern-end-to-end",{"pl": {"name": "Cały wydzielony proces", "action": "Przekazanie między etapami"}, "en": {"name": "End-to-end process", "action": "Handoff completed"}})},
{id:"other",destinations:[3],code:"OTHER",copy:defineCopy("automation-pattern-other",{"pl": {"name": "Inny schemat", "action": "Wykonanie uzgodnionej akcji"}, "en": {"name": "Other pattern", "action": "Agreed action completed"}})}] as const;
export type PatternId=typeof patterns[number]['id'];
