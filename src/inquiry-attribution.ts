import {defineCopy} from './localization-contract';
export const inquiryAttribution=defineCopy('inquiry-attribution',{
 en:{label:'How did you find me? (optional)',note:'This answer is included with your message. No tracking cookie is used.',options:['Prefer not to say','Google / another search engine','LinkedIn','Technical article / GitHub','Recommendation','Earlier conversation','Other'],prefix:'How you found me'},
 pl:{label:'Skąd o mnie wiesz? (opcjonalnie)',note:'Odpowiedź jest dołączana do wiadomości. Bez śledzących plików cookie.',options:['Wolę nie podawać','Google / inna wyszukiwarka','LinkedIn','Artykuł techniczny / GitHub','Polecenie','Wcześniejsza rozmowa','Inne źródło'],prefix:'Źródło kontaktu'}
});
export function attributionText(value:FormDataEntryValue|null,locale:'en'|'pl'){
 const index=typeof value==='string'&&/^[1-6]$/.test(value)?Number(value):0;
 const c=inquiryAttribution[locale];return index?'\n\n'+c.prefix+': '+c.options[index]:'';
}
