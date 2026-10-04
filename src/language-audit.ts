import type { Locale } from './localization-contract';

// Secondary detectors: completeness is validated separately. Technical protocol
// names, identifiers, PASS/FAIL, retry, replay, checkpoint, schema drift and
// lineage intentionally are not suspicious by themselves.
const englishInPolish = /\b(?:Integration\s*(?:&|and)\s*Acceptance|Integrations and acceptance|API integration tests|Transit integration validation|Healthcare system integration validation|Access and workflow validation|View working example|Describe the scope|Technical demonstrations?|synthetic data|independent implementation|Explicit input|rules and scenarios|acceptance criteria|Error detection|Measurable acceptance|Clearly scoped technical components|Validation kontraktów|Reconciliation i (?:validation|walidacja)|Reports odbiorowe|Validation standardów|Validation data|Input|Processing|Report|Reports|Expected|Actual|Source|Target|Inserted|Updated|Rejected|Required|Optional|Download|Upload|Preview|Baseline import|Read-only|Exception View|Test cases|Acceptance|Result|Normalization|Output|Rules|Evidence|Data quality|breaking change|missing field|wrong type|fixture|complete|poll)\b/giu;
const polishInEnglish = /[ąćęłńóśźż]+|\b(?:Wszystkie|Przykład|Demonstracja|Walidacja|Wynik|Wejście|Uruchom|Przywróć|Opisać|Mapowanie|Synchronizacja|Raport|Architektura|Scenariusze|Rekordy|Dowód|Oczekiwane|Rzeczywiste|Zamknij|Pobierz|Brak|Reguła|Dane|Zegar|Typ|Wymagane|Kategoria|Kolejka|Zasób|Pole|Tak|Nie|oraz|według|względem|pozycji|rekordów|scenariuszy)\b/giu;
export function languageLeaks(value:string,locale:Locale):string[]{
  const text=value.trim();
  // Whole machine identifiers are not prose. This does not exempt a sentence
  // merely because it contains an identifier or an allowed technical term.
  if (/^[\w]+(?:[./_-][\w]+)+$/.test(text) || /^(?:EXCEPTION|ALLOW|DENY): [a-z\d_.]+$/.test(text)) return [];
  if(/^(GET|POST|PUT|PATCH|DELETE) \/[\w/.-]+$/.test(text))return []; // HTTP method + endpoint only.
  if(/^[{[]/.test(text))try{
    const structured:unknown=JSON.parse(text);
    return [...new Set(flattenCopy(structured).flatMap(([,v])=>languageLeaks(v,locale)))];
  }catch{/* Audit non-JSON prose normally. */}
  const pattern=locale==='pl'?englishInPolish:polishInEnglish;
  return [...new Set([...value.matchAll(pattern)].map(match=>match[0]))];
}
export function flattenCopy(value:unknown,path=''):Array<[string,string]>{
  if(typeof value==='string')return [[path,value]];
  if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,child])=>flattenCopy(child,path?`${path}.${key}`:key));
  return [];
}
