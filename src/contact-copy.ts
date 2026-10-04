import {defineCopy,selectCopy} from './localization-contract';
import {useLocale} from './locale';
export const contactCopy=defineCopy('contact',{pl:{subject:'Wydzielony zakres integracji lub automatyzacji'},en:{subject:'Scoped integration or automation work'}});
export function useContactHref(){return 'mailto:ivan@matiushkin.com?subject='+encodeURIComponent(selectCopy(contactCopy,useLocale()).subject);}
