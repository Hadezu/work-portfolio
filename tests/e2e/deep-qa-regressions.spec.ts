import {test,expect} from '@playwright/test';
const slugs=['reconciliation','api-tests','data-bridge','transit-validation','workflow-access','healthcare-integration','erp-sync','operations-exceptions','data-quality'];
test('canonical routes normalize trailing slashes without dropping query strings',async({request})=>{
 for(const route of ['/en',...slugs.flatMap(s=>['/'+s,'/en/'+s])])for(const method of ['GET','HEAD']){
  const r=await request.fetch(route+'/?source=email',{method,maxRedirects:0});expect(r.status()).toBe(308);expect(new URL(r.headers().location).pathname).toBe(route);expect(new URL(r.headers().location).search).toBe('?source=email');
 }
});
test('missing static assets return 404 instead of a successful app shell',async({request})=>{
 for(const path of ['/missing-qa.png','/assets/missing-qa.js','/missing-qa.css'])expect((await request.get(path)).status()).toBe(404);
});
test('invalid top-level demo payloads remain controlled in simulation modes',async({request})=>{
 for(const mode of ['duplicate','invalid-schema','accept-currency'])for(const data of [null,[],42,'invalid']){
  const r=await request.post('/api/demo/target/orders?simulate='+mode,{data:JSON.stringify(data),headers:{'content-type':'application/json'}});expect(r.status()).toBe(422);expect(r.headers()['content-type']).toContain('application/json');
 }
});
for(const locale of ['pl','en']){
 test(`${locale}: audited secondary text meets minimum contrast`,async({page})=>{
  for(const slug of ['', 'reconciliation','data-bridge','api-tests','transit-validation']){
   await page.goto((locale==='en'?'/en':'')+(slug?'/'+slug:locale==='pl'?'/':''));await expect(page.locator('main h1')).toBeVisible();
   const failures=await page.locator('.footer-identity > span,.uploads small,.upload-help,.empty-state p,.bridge-summary small,.api-callout strong,.accent small,.api-empty small,.api-summary span,th').evaluateAll(elements=>{
    const rgb=(color:string)=>color.match(/[\d.]+/g)!.map(Number);
    const luminance=(color:number[])=>color.slice(0,3).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return elements.filter(e=>e.checkVisibility()).flatMap(e=>{let p:Element|null=e;let bg=[255,255,255];while(p){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]===1){bg=c;break;}p=p.parentElement;}const foreground=luminance(rgb(getComputedStyle(e).color)),background=luminance(bg);const ratio=(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);return ratio<4.5?[{text:e.textContent,ratio}]:[];});
   });expect(failures,slug||'homepage').toEqual([]);
  }
 });
 test(`${locale}: error page preserves language and return destination`,async({page})=>{
  await page.goto((locale==='en'?'/en':'')+'/missing-qa');await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('main h1')).toHaveText(locale==='en'?'Page not found':'Nie znaleziono strony');await expect(page.locator('main a')).toHaveAttribute('href',locale==='en'?'/en':'/');
 });
 test(`${locale}: evidence modal traps keyboard and restores focus`,async({page})=>{
  await page.goto((locale==='en'?'/en':'')+'/transit-validation');await page.getByRole('button',{name:locale==='en'?'Introduce controlled discrepancy':'Wprowadź kontrolowaną rozbieżność',exact:true}).click();const details=page.getByRole('button',{name:locale==='en'?'Details':'Szczegóły',exact:true}).first();await details.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Tab');await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(details).toBeFocused();
 });
 test(`${locale}: 320px API layout and keyboard table access`,async({page})=>{
  await page.setViewportSize({width:320,height:900});for(const slug of ['api-tests','data-bridge']){await page.goto((locale==='en'?'/en':'')+'/'+slug);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);const table=page.locator('.table-scroll').first();await table.focus();await expect(table).toBeFocused();await page.keyboard.press('ArrowRight');await expect.poll(()=>table.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);}
 });
 test(`${locale}: mobile identity logo stays square`,async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(locale==='en'?'/en':'/');const logo=page.locator('.portfolio-identity img');await expect(logo).toBeVisible();const size=await logo.boundingBox();expect(size).not.toBeNull();expect(size!.width).toBeCloseTo(size!.height,2);
 });
}
test('all English proofs publish English-specific social images',async({page,request})=>{
 for(const slug of slugs){await page.goto('/en/'+slug);await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',`https://work.matiushkin.com/og/${slug}-en.png`);const image=await request.get(`/og/${slug}-en.png`);expect(image.status()).toBe(200);expect(image.headers()['content-type']).toContain('image/png');}
});
