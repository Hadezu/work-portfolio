import { useLocale } from './locale';
import { counted } from './polish';
import { defineCopy, selectCopy } from './localization-contract';
type Forms = readonly [string,string,string];
export const countCopy=defineCopy<Record<string,Forms>>('counts',{
  pl:{typ:['typ','typy','typów'],'sprawa wymaga uwagi':['sprawa wymaga uwagi','sprawy wymagają uwagi','spraw wymaga uwagi'],scenariusz:['scenariusz','scenariusze','scenariuszy'],rozbieżność:['rozbieżność','rozbieżności','rozbieżności'],pozycja:['pozycja','pozycje','pozycji'],wyjątek:['wyjątek','wyjątki','wyjątków'],błąd:['błąd','błędy','błędów'],sprawdzenie:['sprawdzenie','sprawdzenia','sprawdzeń']},
  en:{typ:['type','types','types'],'sprawa wymaga uwagi':['case requires attention','cases require attention','cases require attention'],scenariusz:['scenario','scenarios','scenarios'],rozbieżność:['discrepancy','discrepancies','discrepancies'],pozycja:['entry','entries','entries'],wyjątek:['exception','exceptions','exceptions'],błąd:['error','errors','errors'],sprawdzenie:['check','checks','checks']},
});
export function useCounted(){
  const copy=selectCopy(countCopy,useLocale());
  return (n:number,forms:Forms) => {
    const localized=copy[forms[0]];
    if(!localized)throw new Error(`Missing count translation: ${forms[0]}`);
    return counted(n,localized);
  };
}
