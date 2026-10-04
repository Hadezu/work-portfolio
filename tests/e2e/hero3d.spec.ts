import{test,expect}from'@playwright/test';
for(const lang of ['en','pl'])test(`${lang}: homepage 3D selection, pause, context loss and retry`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:1440,height:1000});await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(lang==='en'?'/en':'/');
 const host=page.locator('.hero-webgl');await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});await expect(host.locator('canvas')).toBeVisible();expect(Number(await host.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(110);await expect(host).toHaveAttribute('data-artwork','fragmented-identity');await expect(host).toHaveAttribute('data-sculpture-phase',/letters|name|identity|transform|work-hold|release/);
 const box=await host.boundingBox();expect(box).not.toBeNull();
 await page.mouse.move(box!.x+box!.width-3,box!.y+box!.height/2);await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw')),{timeout:20000}).toBeGreaterThan(50);
 await page.mouse.move(box!.x+3,box!.y+box!.height/2);await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw')),{timeout:20000}).toBeLessThan(-50);
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
 await page.locator('.motion-toggle').click();await expect(host).toHaveAttribute('data-rendering','false');const colour=await host.getAttribute('data-scene-palette');const frames=await host.getAttribute('data-frames');await page.waitForTimeout(300);expect(await host.getAttribute('data-frames')).toBe(frames);expect(await host.getAttribute('data-scene-palette')).toBe(colour);
 await page.locator('.task-options button').nth(2).click();await expect(host).toHaveAttribute('data-mode','1');await page.locator('.task-options button').nth(3).click();await expect(host).toHaveAttribute('data-mode','2');
 await page.locator('.motion-toggle').click();await expect(host).toHaveAttribute('data-rendering','true');
 await host.locator('canvas').evaluate(canvas=>{const gl=(canvas as HTMLCanvasElement).getContext('webgl2')!;gl.getExtension('WEBGL_lose_context')!.loseContext();});await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','error');expect(await page.locator('.portfolio-hero').evaluate(el=>el.style.getPropertyValue('--scene-bg'))).toBe('');await expect(host.locator('canvas')).toHaveCount(0);await expect(page.locator('.hero-stage picture')).toBeVisible();
 await page.locator('.hero-3d-controls button').click();await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready');await page.emulateMedia({reducedMotion:'reduce'});await expect(host.locator('canvas')).toHaveCount(0);await expect(page.locator('.hero-stage picture')).toBeVisible();
});
for(const lang of ['en','pl'])test(`${lang}: mobile starts static and plays 3D only on request`,async({page})=>{
 const loads:string[]=[];page.on('request',r=>{if(/hero3d-(scene|field)|three\.core/.test(r.url()))loads.push(r.url());});await page.setViewportSize({width:390,height:844});await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.goto(lang==='en'?'/en':'/');await page.waitForTimeout(1200);expect(loads).toHaveLength(0);await expect(page.locator('.hero-3d-controls button')).toHaveCount(1);await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','static');await expect(page.locator('.hero-stage picture')).toBeVisible();await expect(page.locator('.hero-stage img')).toHaveJSProperty('complete',true);expect(await page.locator('.hero-stage img').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.hero-webgl canvas')).toHaveCount(0);
 await page.locator('.hero-3d-controls button').click();await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});await expect(page.locator('.hero-webgl canvas')).toBeVisible();await expect(page.locator('.hero-webgl')).toHaveAttribute('data-rendering','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.hero-3d-controls button').click();await expect(page.locator('.hero-webgl canvas')).toHaveCount(0);await expect(page.locator('.hero-stage picture')).toBeVisible();
});

test('desktop loading never flashes the old artwork',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 let release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/*hero3d-scene*.js',async route=>{await hold;await route.continue();});
 await page.goto('/en');await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','loading');
 await expect(page.locator('.hero-stage picture')).toBeHidden();release();await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});
});

test('resizing desktop to mobile disposes WebGL and keeps a still',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/en');await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});await page.setViewportSize({width:390,height:844});await expect(page.locator('.hero-webgl canvas')).toHaveCount(0);await expect(page.locator('.hero-stage picture')).toBeVisible();await expect(page.locator('.hero-3d-controls button')).toHaveCount(1);
});

test('initial reduced motion never imports the scene',async({page})=>{
 const loads:string[]=[];page.on('request',r=>{if(/hero3d-(scene|field)|three\.core/.test(r.url()))loads.push(r.url());});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/en');await page.waitForTimeout(600);expect(loads).toEqual([]);await expect(page.locator('.hero-stage picture')).toBeVisible();await expect(page.locator('.hero-webgl canvas')).toHaveCount(0);
});
for(const lang of ['en','pl'])test(`${lang}: touch orbit, retina resolution and vertical scroll`,async({browser,baseURL})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,reducedMotion:'no-preference'});
 const page=await context.newPage();await page.route('**/api/metrics',r=>r.fulfill({status:204}));await page.route('**/api/contact',r=>r.abort());await page.goto(baseURL+(lang==='en'?'/en':'/'));await page.locator('.hero-3d-controls button').click();const host=page.locator('.hero-webgl');await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});
 expect(await host.evaluate(e=>e.querySelector('canvas')!.width/e.clientWidth)).toBe(2);await host.scrollIntoViewIfNeeded();const box=(await host.boundingBox())!,x=box.x+box.width*.4,y=box.y+box.height*.5;const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*18,y}]});await page.waitForTimeout(30);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw')),{timeout:10000}).toBeGreaterThan(35);
 await page.screenshot({path:`qa-artifacts/mobile-touch-${lang}.png`});const before=await page.evaluate(()=>scrollY);const b=(await host.boundingBox())!,tx=b.x+b.width/2,ty=b.y+b.height*.75;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty-i*18}]});await page.waitForTimeout(30);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+30);await context.close();
});
