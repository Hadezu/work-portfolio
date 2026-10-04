import {defineCopy,selectCopy} from './localization-contract';
import {useLocale} from './locale';
import data from './domain-copy-data.json';
export const domainCopy=defineCopy<Record<string,string>>('domain-messages',data);
export const domainTemplates=defineCopy('domain-templates',{
 pl:{orderStatus:'zamówienie: {0}, przesyłka: {1}',duplicate:'Identyfikator występuje więcej niż raz w pliku {0}.',duplicateId:'powtórzone ID {0}',sku:'SKU z katalogu ({0})',quantity:'wymagane {0}, dostępne {1}',allocation:'zamówienie {0}, alokacja {1}',invalid:'ilość: {0}, data: {1}',updated:'ostatnia aktualizacja: {0}',processing:'w przetwarzaniu od {0}',reference:'{0} — nie znaleziono lub niezgodny typ',schema:'HTTP {0}; schemat {1}',currency:'HTTP {0} — EUR zaakceptowane',attempts:'Próba 1: {0}; próba 2: {1}'},
 en:{orderStatus:'order: {0}, shipment: {1}',duplicate:'The identifier occurs more than once in file {0}.',duplicateId:'duplicate ID {0}',sku:'SKU from catalog ({0})',quantity:'required {0}, available {1}',allocation:'order {0}, allocation {1}',invalid:'quantity: {0}, date: {1}',updated:'last updated: {0}',processing:'processing since {0}',reference:'{0} not found or wrong type',schema:'HTTP {0}; schema {1}',currency:'HTTP {0} — EUR accepted',attempts:'Attempt 1: {0}; attempt 2: {1}'},
});
// Legacy engine messages are matched as complete templates at the presentation
// boundary. No token substitution and no opposite-language fallback occur.
const patterns: Array<[keyof typeof domainTemplates.pl,RegExp]>=[
 ['orderStatus',/^order: (\w+), shipment: (\w+)$/],
 ['duplicate',/^Identyfikator występuje więcej niż raz w pliku (.+)\.$/],['duplicateId',/^powtórzone ID (.+)$/],
 ['sku',/^SKU z katalogu \((.+)\)$/],['quantity',/^wymagane (\S+), dostępne (\S+)$/],
 ['allocation',/^zamówienie (\S+), alokacja (\S+)$/],['invalid',/^ilość: (\S+), data: (\S+)$/],
 ['updated',/^ostatnia aktualizacja: (\S+)$/],['processing',/^processing od (\S+)$/],
 ['reference',/^(\S+) not found or wrong type$/],['schema',/^HTTP (\d+); schemat (zgodny|niezgodny)$/],
 ['currency',/^HTTP (\d+) — EUR zaakceptowane$/],['attempts',/^Próba 1: (\d+); próba 2: (\d+)$/],
];
export function formatDomain(locale:'pl'|'en',id:string,allowMachineValue=false):string{
 const copy=selectCopy(domainCopy,locale),templates=selectCopy(domainTemplates,locale);
  if(Object.hasOwn(copy,id))return copy[id];
  for(const [key,pattern]of patterns){const match=id.match(pattern);if(match){
   const args=match.slice(1);if(key==='orderStatus')args.forEach((arg,i)=>args[i]=formatDomain(locale,arg,true));if(key==='schema'&&locale==='en')args[1]=args[1]==='zgodny'?'valid':'invalid';
   return templates[key].replace(/\{(\d+)\}/g,(_,index:string)=>args[Number(index)]);
  }}
  // A typed evidence cell can contain arbitrary numeric data, identifiers or a
  // serialized contract object. These are data, not untranslated UI messages.
  if(allowMachineValue && (/^[\d\s.,:+−≥≤<>/=-]+$/.test(id)||/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(id)||/^[A-Z\d_]+(?:[-/|][A-Z\d_]+)*$/.test(id)||/^[\w]+(?:[./_-][\w]+)+$/.test(id)||/^HTTP \d+(; replay=(?:true|false))?$/.test(id)||/^(?:EXCEPTION|ALLOW|DENY): [a-z\d_.]+$/.test(id)||['string','number','boolean','true','false','null','undefined','—',''].includes(id)))return id;
  if(allowMachineValue&&/^[{[]/.test(id)){try{JSON.parse(id);return id;}catch{/* Not structured evidence. */}}
  if(allowMachineValue&&(/^[A-Za-z]+\d+$/.test(id)||/^\[(?:'[\w.-]+'(?:, )?)*\]$/.test(id)||/^[A-Z\d_.]+(?:[;|/]\s*[A-Z\d_.]+)+$/.test(id)))return id;
  if(allowMachineValue && /^\[Decimal\('-?\d+(?:\.\d+)?'\)(?:, Decimal\('-?\d+(?:\.\d+)?'\))*\]$/.test(id))return id;
  throw new Error(`Missing required domain translation: ${id}`);
}
function useFormatter(allowMachineValue:boolean){const locale=useLocale();return (id:string)=>formatDomain(locale,id,allowMachineValue);}
export function useDomainText(){return useFormatter(false);}
export function useDomainValue(){return useFormatter(true);}
