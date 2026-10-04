import { createContext, useContext } from 'react';

import { resolveLocale, type Locale } from './localization-contract';
export type { Locale } from './localization-contract';
export const LocaleContext = createContext<Locale | null>(null);
export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (locale === null) throw new Error('Localized UI requires the authoritative route LocaleContext');
  return locale;
}
export function isEnglishPath(pathname: string) { return resolveLocale(pathname)==='en'; }
export function stripLocale(pathname: string) { if (pathname === '/en') return '/'; return pathname.startsWith('/en/') ? pathname.slice(3) || '/' : pathname; }
export function localizedPath(pathname: string, locale: Locale) {
  const plain = stripLocale(pathname);
  if (locale === 'en') return plain === '/' ? '/en' : `/en${plain}`;
  return plain;
}
