import {test,expect} from '@playwright/test';
for(const locale of ['en','pl']) for(const width of [1440,390]) for(const example of ['proof/migration','proof/revenue-bi','reconciliation','operations-exceptions']) {
  test(`outreach context ${locale} ${width} ${example}`,async({page})=>{
    const prefix=locale==='en'?'/en':'',path=prefix+'/'+example;
    const errors:string[]=[];let submissions=0;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/api/metrics',r=>r.fulfill({status:204}));
    await page.route('**/api/contact',r=>{submissions++;return r.abort();});
    await page.setViewportSize({width,height:900});
    const response=await page.goto(path+'?utm_source=cold_email&utm_campaign=migration_validation&utm_content=example');
    expect(response?.status()).toBe(200);
    await expect(page.locator('.proof-business-context')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://work.matiushkin.com'+path);
    const quick=page.locator('.proof-business-context a');
    if(await quick.count()) {
      expect((await quick.boundingBox())!.y).toBeLessThan(900);
      await quick.click();
      await expect(page).toHaveURL(/#proof-workspace$/);
      await expect(page.locator('#proof-workspace')).toBeInViewport();
    }
    if(example==='operations-exceptions')await expect(page.locator('main')).not.toContainText('XLSX');
    const cta=page.locator('.proof-next-step');
    await expect(cta).toContainText(locale==='en'?'If I sent you this example by email, you can simply reply there.':'Jeśli wysłałem Ci ten przykład w wiadomości, możesz po prostu na nią odpowiedzieć.');
    await expect(page.locator('.similar-task')).toHaveCount(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await cta.getByRole('link',{name:locale==='en'?'Describe your problem':'Opisz problem'}).click();
    expect(new URL(page.url()).searchParams.get('example')).toBe(example);
    await expect(page.locator('.buyer-context')).toBeVisible();
    await page.reload();await expect(page.locator('.buyer-context')).toBeVisible();
    await page.locator('.language-switch').getByRole('link',{name:locale==='en'?'PL':'EN',exact:true}).click();
    expect(new URL(page.url()).searchParams.get('example')).toBe(example);
    await expect(page.locator('.buyer-context')).toBeVisible();
    expect(submissions).toBe(0);expect(errors).toEqual([]);
  });
}
