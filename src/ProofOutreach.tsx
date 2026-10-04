import {SimilarTask} from './BuyerJourney';
import {useLocale} from './locale';
import './proof-outreach.css';

type Example = 'proof/migration' | 'proof/revenue-bi' | 'reconciliation' | 'operations-exceptions';
const copy = {
  en: {
    context: {
      'proof/migration': 'Moving data into a new system is only part of the job. You also need to check what arrived, what failed and what changed.',
      'proof/revenue-bi': 'Historical spreadsheets and current systems can produce different revenue figures. This example shows how to explain those differences.',
      reconciliation: 'When orders, invoices and warehouse exports disagree, you need to find the affected records. This example lets you inspect each discrepancy and its source.',
      'operations-exceptions': 'Missing documents, inconsistent statuses and overdue records can be difficult to spot across separate exports. This example brings them together with a reason and source for each exception.',
    },
    try: 'Try a sample comparison', operationsTry: 'See which records need attention',
    title: 'Have a similar problem?',
    body: 'Describe how the process works in your company. No technical specification or introductory call is required.',
    cta: 'Describe your problem',
    reply: 'If I sent you this example by email, you can simply reply there.',
  },
  pl: {
    context: {
      'proof/migration': 'Przeniesienie danych do nowego systemu to tylko część zadania. Trzeba jeszcze sprawdzić, co trafiło do celu, co się nie udało i co się zmieniło.',
      'proof/revenue-bi': 'Historyczne arkusze i bieżące systemy mogą pokazywać różne kwoty przychodów. Ten przykład pokazuje, jak wyjaśnić te różnice.',
      reconciliation: 'Gdy zamówienia, faktury i eksporty magazynowe się nie zgadzają, trzeba znaleźć konkretne rekordy. W tym przykładzie możesz sprawdzić każdą rozbieżność i jej źródło.',
      'operations-exceptions': 'Brakujące dokumenty, niespójne statusy i przekroczone terminy trudno zauważyć w osobnych eksportach. Ten przykład zbiera je w jednym miejscu, wskazując przyczynę i źródło każdego wyjątku.',
    },
    try: 'Wypróbuj porównanie danych', operationsTry: 'Zobacz rekordy wymagające uwagi',
    title: 'Masz podobny problem?',
    body: 'Opisz, jak wygląda ten proces w Twojej firmie. Nie potrzebujesz specyfikacji technicznej ani rozmowy na początek.',
    cta: 'Opisz problem',
    reply: 'Jeśli wysłałem Ci ten przykład w wiadomości, możesz po prostu na nią odpowiedzieć.',
  },
};
export function ProofBusinessContext({example,quickStart=false}:{example:Example;quickStart?:boolean}) {
  const c=copy[useLocale()];
  return <div className="proof-business-context"><p>{c.context[example]}</p>{quickStart&&<a className="button secondary" href="#proof-workspace">{example==='operations-exceptions'?c.operationsTry:c.try} ↓</a>}</div>;
}
export function ProofNextStep({example}:{example:Example}) {
  const c=copy[useLocale()];
  return <section className="shell section proof-next-step" aria-labelledby="proof-next-step-title"><h2 id="proof-next-step-title">{c.title}</h2><p>{c.body}</p><SimilarTask example={example} label={c.cta}/><p className="proof-email-reply">{c.reply}</p></section>;
}
