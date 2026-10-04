import {test,expect} from '@playwright/test';
import {guideSlugs,migrationGuides} from '../../src/migration-guides';
for(const locale of ['en','pl'] as const)test(`migration service and guides: ${locale}`,async({page,request})=>{
 const prefix=locale==='en'?'/en':'',c=migrationGuides[locale],errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(prefix+'/services/data-migration');
 await expect(page.getByRole('heading',{name:c.offerTitle,exact:true})).toBeVisible();
 for(const [i,slug] of guideSlugs.entries()){
  await page.locator('main').getByRole('link',{name:c.articles[i].title+' →',exact:true}).click();
  await expect(page.locator('h1')).toHaveText(c.articles[i].title);
  const r=await request.get(prefix+'/'+slug),html=await r.text();expect(r.status()).toBe(200);expect(html).toContain(c.articles[i].sections[0][1]);expect(html).toContain('hreflang="en"');expect(html).toContain('hreflang="pl"');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://work.matiushkin.com'+prefix+'/'+slug);
  await page.locator('.language-switch').getByRole('link',{name:locale==='en'?'PL':'EN',exact:true}).click();await expect(page.locator('h1')).toHaveText(migrationGuides[locale==='en'?'pl':'en'].articles[i].title);
  await page.locator('.language-switch').getByRole('link',{name:locale.toUpperCase(),exact:true}).click();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('main .button.primary')).toHaveAttribute('href',prefix+'/proof/migration');
  await page.locator('main .button.secondary').click();await expect(page.locator('select[name=service]')).toHaveValue('data-migration');await expect(page.locator('.buyer-context')).toBeVisible();
  await page.goto(prefix+'/services/data-migration');
 }
 const sitemap=await(await request.get('/sitemap.xml')).text();for(const slug of guideSlugs)expect(sitemap).toContain('https://work.matiushkin.com'+prefix+'/'+slug);
 expect(errors).toEqual([]);
});
