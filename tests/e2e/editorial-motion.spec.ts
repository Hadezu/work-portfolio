import {test,expect} from '@playwright/test';
// These tests exercise the preserved lightweight fallback; WebGL has separate coverage.
test.beforeEach(async({page})=>{await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));});
test('reduced-motion starts static without fetching optional motion CSS',async({page})=>{
 const motionStyles:string[]=[];page.on('request',r=>{if(/editorial-motion.*\.css/.test(r.url()))motionStyles.push(r.url());});
 await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/en');
 await expect(page.locator('.task-options button').first()).toBeVisible();await expect(page.locator('.portfolio-home')).toHaveAttribute('data-motion','off');expect(motionStyles).toHaveLength(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('.motion-toggle')).toBeVisible();await expect.poll(()=>motionStyles.length).toBe(1);
 await expect.poll(()=>page.locator('.hero-material picture').evaluate(el=>el.getAnimations().some(a=>a.playState==='running'))).toBe(true);
});
for(const locale of ['en','pl'] as const)test(`${locale}: motion pause, reactive signature and reduced-motion override`,async({page})=>{
 await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(locale==='en'?'/en':'/');
 const root=page.locator('.portfolio-home'),toggle=page.locator('.motion-toggle'),picture=page.locator('.hero-material picture');
 await expect(root).toHaveAttribute('data-motion','on');await expect(root).toHaveAttribute('data-ambient','on');
 await expect.poll(()=>picture.evaluate(el=>el.getAnimations().some(a=>a.playState==='running'))).toBe(true);
 await page.mouse.move(1000,300);await expect.poll(()=>picture.evaluate(el=>el.style.getPropertyValue('--mx'))).not.toBe('');
 await toggle.click();await expect(root).toHaveAttribute('data-motion','off');await expect.poll(()=>root.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
 await toggle.click();await page.locator('.task-options button').nth(3).focus();await expect.poll(()=>root.evaluate(el=>el.style.getPropertyValue('--signal'))).toBe('0.5');
 await page.locator('.contact-form').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-ambient','off');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(root).toHaveAttribute('data-motion','off');await expect(toggle).toHaveCount(0);await expect.poll(()=>root.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
});
test('touch does not activate pointer parallax',async({browser})=>{
 const context=await browser.newContext({baseURL:test.info().project.use.baseURL,hasTouch:true,isMobile:true,viewport:{width:390,height:844},reducedMotion:'no-preference'});const p=await context.newPage();await p.route('**/api/metrics',r=>r.fulfill({status:204}));await p.goto('/en');await expect(p.locator('.portfolio-home')).toHaveAttribute('data-motion','on');await p.mouse.move(300,300);expect(await p.locator('.hero-material picture').evaluate(el=>el.style.getPropertyValue('--mx'))).toBe('');expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
for(const locale of ['en','pl'] as const)test(`${locale}: perceptible ambient travel and separated footer links`,async({page})=>{
 await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(locale==='en'?'/en':'/');const picture=page.locator('.hero-material picture');await expect.poll(()=>picture.evaluate(el=>el.getAnimations().some(a=>a.playState==='running'))).toBe(true);
 const first=await picture.evaluate(el=>getComputedStyle(el).translate);await page.waitForTimeout(2400);const next=await picture.evaluate(el=>getComputedStyle(el).translate);expect(Math.abs(parseFloat(next.split(' ')[1])-parseFloat(first.split(' ')[1]))).toBeGreaterThan(1);
 for(const width of [390,1440,1920]){await page.setViewportSize({width,height:950});const footer=page.locator('footer.editorial-footer');await footer.scrollIntoViewIfNeeded();const links=await footer.locator(':scope > a').all();const a=(await links[0].boundingBox())!,b=(await links[1].boundingBox())!;expect(a.x+a.width+12<=b.x||a.y+a.height+12<=b.y).toBe(true);expect(await footer.evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<2)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('narrative thread follows sections even with reduced motion',async({page})=>{await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/en');const root=page.locator('.portfolio-home');await expect(root).toHaveAttribute('data-phase','source');for(const [selector,phase]of [['.task-fit','structure'],['.buyer-examples','verify'],['.task-fit','structure']]){await page.locator(selector).evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await expect(root).toHaveAttribute('data-phase',phase);}await expect(root).toHaveAttribute('data-motion','off');expect(await root.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);});
