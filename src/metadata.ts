import {practicalSlugs,practicalCopy} from './practical-copy';
import {guideSlugs,migrationGuides} from './migration-guides';
import {revenueCopy} from './revenue-copy';
import {aiCopy} from './ai-copy';
import {migrationCopy} from './migration-copy';
import {servicesCopy,serviceSlugs,serviceSearchCopy} from './services-copy';
import {inquiryCopy} from './inquiry-copy';
import {resolveLocale,type Locale} from './localization-contract';
import {metadataCopy} from './metadata-copy';
export const productionOrigin='https://work.matiushkin.com';
type PageMeta={title:string;description:string;label:string;image:string;locale:Locale;alternateBase:string};
export const pages:Record<string,PageMeta>={};
for(const locale of ['pl','en'] as const)for(const [slug,copy]of Object.entries(metadataCopy[locale])){const base=slug==='home'?'':slug;const path=(locale==='en'?'/en':'')+(base?'/'+base:locale==='pl'?'/':'');pages[path]={...copy,image:locale==='en'?slug+'-en':slug,locale,alternateBase:base};}
for(const locale of ['pl','en'] as const){
 const prefix=locale==='en'?'/en':'';
 for(const [i,slug] of guideSlugs.entries()){const a=migrationGuides[locale].articles[i];pages[prefix+'/'+slug]={title:a.title+' — Ivan Matiushkin',description:a.description,label:a.title,image:locale==='en'?'erp-sync-en':'erp-sync',locale,alternateBase:slug};}
 for(const [i,slug] of practicalSlugs.entries()){const c=practicalCopy[locale],a=i===2?c.sample:c.articles[i];pages[prefix+'/'+slug]={title:a.title+' — Ivan Matiushkin',description:a.description,label:a.title,image:locale==='en'?'home-en':'home',locale,alternateBase:slug};}
 const revenue=revenueCopy[locale];
 const ai=aiCopy[locale];
 pages[prefix+'/proof/ai-automation']={title:ai.title+' — Ivan Matiushkin',description:ai.intro,label:ai.title,image:locale==='en'?'home-en':'home',locale,alternateBase:'proof/ai-automation'};
 pages[prefix+'/proof/revenue-bi']={title:revenue.title+' — Ivan Matiushkin',description:revenue.intro,label:revenue.title,image:locale==='en'?'home-en':'home',locale,alternateBase:'proof/revenue-bi'};
 const migration=migrationCopy[locale];
 pages[prefix+'/proof/migration']={title:migration.title+' — Ivan Matiushkin',description:migration.intro,label:migration.title,image:locale==='en'?'erp-sync-en':'erp-sync',locale,alternateBase:'proof/migration'};
 for(const [index,slug] of serviceSlugs.entries()){const c=servicesCopy[locale].cards[index],search=serviceSearchCopy[locale].pages[index];pages[prefix+'/'+slug]={title:search.title+' — Ivan Matiushkin',description:search.description,label:c.title,image:locale==='en'?'home-en':'home',locale,alternateBase:slug};}
 for(const slug of ['contact','privacy']){const c=inquiryCopy[locale];const title=slug==='contact'?c.title:c.privacyTitle;pages[prefix+'/'+slug]={title:title+' — Ivan Matiushkin',description:slug==='contact'?c.intro:c.privacy,label:title,image:locale==='en'?'home-en':'home',locale,alternateBase:slug};}
}
export function metadata(path: string) {
  const locale = resolveLocale(path);
  const page = pages[path] ?? {title:locale==='en'?'Page not found — Ivan Matiushkin':'Nie znaleziono strony — Ivan Matiushkin',description:locale==='en'?'This page does not exist.':'Ta strona nie istnieje.',image:'home',label:locale==='en'?'Page not found':'Nie znaleziono strony',locale};
  const known = pages[path] ? path : '/';
  const url = productionOrigin + known;

  const base = page.alternateBase;
  const plHref = productionOrigin + (base ? `/${base}` : '/');
  const enHref = productionOrigin + (base ? `/en/${base}` : '/en');
  const alternates = [
    { lang: 'pl', href: plHref },
    { lang: 'en', href: enHref },
    { lang: 'x-default', href: plHref },
  ];
  return { page, url, alternates, tags: {
    description: page.description,
    keywords: locale === 'en' ? 'API integrations, data synchronization, integration repair, workflow automation, data migration, internal tools, ERP integrations, business automation, freelance integration developer, independent contractor' : 'integracje API, automatyzacja procesów, synchronizacja danych, integracje ERP, import eksport danych, naprawa integracji, migracja danych, systemy wewnętrzne',
    'og:title': page.title, 'og:description': page.description, 'og:url': url,
    'og:locale': locale === 'en' ? 'en_US' : 'pl_PL',
    'og:type': 'website', 'og:image': `${productionOrigin}/og/${page.image}.png`,
    'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': ['','contact','privacy',...serviceSlugs].includes(page.alternateBase??'') ? page.title : `${page.label} — Ivan Matiushkin. ${locale === 'en' ? 'Technical demonstration with synthetic data.' : 'Przykład techniczny — dane demonstracyjne.'}`,
    'twitter:card': 'summary_large_image', 'twitter:title': page.title,
    'twitter:description': page.description, 'twitter:image': `${productionOrigin}/og/${page.image}.png`,
    'twitter:image:alt': ['','contact','privacy',...serviceSlugs].includes(page.alternateBase??'') ? page.title : `${page.label} — ${locale === 'en' ? 'technical demonstration' : 'przykład techniczny'}`,
  } };
}
