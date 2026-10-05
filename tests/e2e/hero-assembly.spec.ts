import {test,expect,type Page} from '@playwright/test';

for(const lang of ['en','pl'])test(`${lang}: visual QA at four phases keeps dragging distortion bounded`,async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const host=await ready(page,lang);
  for(const phase of [1,35,51,66]){
    await expect.poll(async()=>Number(await host.getAttribute('data-cycle-time')),{timeout:25000,intervals:[100]}).toBeGreaterThanOrEqual(phase);
    await host.press('Enter');await expect(host).toHaveAttribute('data-assembly-centering','1.000');
    // Intentionally request the strongest old 'spire' deformation.
    for(let i=0;i<10;i++)await host.press('ArrowUp');
    let worst=0;const end=Date.now()+900;
    while(Date.now()<end){worst=Math.max(worst,Number(await host.getAttribute('data-assembly-deviation')));await page.waitForTimeout(40);}
    expect(worst).toBeLessThan(.28);
    await page.screenshot({path:`qa-artifacts/assembly/qa-v5-${lang}-${phase}.png`});
    await host.press('Escape');await expect(host).toHaveAttribute('data-assembly-interaction','ambient');
  }
  expect(errors).toEqual([]);
});

async function ready(page:Page,lang='en'){
  await page.setViewportSize({width:1000,height:800});
  await page.route('**/api/**',route=>route.abort());
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(lang==='en'?'/en':'/');
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});
  return page.locator('.hero-webgl');
}
test('stationary grab centers and keeps living; release resumes without a reset jump',async({page})=>{
  const host=await ready(page);
  const b=(await host.boundingBox())!;await page.mouse.move(b.x+b.width-3,b.y+b.height/2);
  await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw'))).toBeGreaterThan(45);
  await host.press('Enter');
  const frozenTime=await host.getAttribute('data-cycle-time');
  await expect.poll(async()=>Number(await host.getAttribute('data-assembly-pose-step'))).toBeGreaterThan(.005);
  await expect(host).toHaveAttribute('data-assembly-centering','1.000');
  expect(Number(await host.getAttribute('data-orbit-yaw'))).toBe(0);
  await expect.poll(async()=>Number(await host.getAttribute('data-assembly-glint')),{timeout:9000,intervals:[50]}).toBeGreaterThan(.1);
  await page.screenshot({path:'qa-artifacts/assembly-release/completion-glint.png'});
  await page.waitForTimeout(6000);
  await expect(host).toHaveAttribute('data-assembly-completion','resolved');
  expect(Number(await host.getAttribute('data-assembly-glint'))).toBe(0);
  await expect.poll(async()=>Number(await host.getAttribute('data-assembly-pose-step'))).toBeGreaterThan(.005);
  await expect(host).toHaveAttribute('data-assembly-story','recover');
  expect(Number(await host.getAttribute('data-orbit-yaw'))).toBe(0);
  expect(Number(await host.getAttribute('data-cycle-time'))-Number(frozenTime)).toBeGreaterThan(10);
  await host.press('Enter');
  // Observe the whole handoff, including its last frame; the old 14 s delay fails here.
  let maxStep=0;const deadline=Date.now()+1800;
  while(Date.now()<deadline){maxStep=Math.max(maxStep,Number(await host.getAttribute('data-assembly-pose-step')));await page.waitForTimeout(30);}
  await expect(host).toHaveAttribute('data-assembly-interaction','ambient',{timeout:1000});
  expect(maxStep).toBeLessThan(.65);
  expect(await host.getAttribute('data-cycle-time')).not.toBe(frozenTime);
  await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw'))).toBeGreaterThan(45);
  // Hovering the sculpture without a grab no longer freezes free orbit.
  await page.mouse.move(b.x+3,b.y+b.height/2);
  await expect.poll(async()=>Number(await host.getAttribute('data-orbit-yaw'))).toBeLessThan(-45);
});

test('can catch another fragment during the return blend',async({page})=>{
  const host=await ready(page);await host.press('Enter');await page.waitForTimeout(300);await host.press('Enter');
  await expect(host).toHaveAttribute('data-assembly-interaction','returning');
  await host.press('Enter');await expect(host).toHaveAttribute('data-assembly-interaction','held');
  await expect(host).toHaveAttribute('data-fragment-grabs','2');
  await host.press('Escape');await expect(host).toHaveAttribute('data-assembly-interaction','ambient',{timeout:2500});
});
test('one live score keeps evolving while held; a spare waits until the next assembly',async({page})=>{
  const host=await ready(page);await host.press('Enter');
  const palette=await host.getAttribute('data-scene-palette');
  await expect.poll(async()=>Number(await host.getAttribute('data-cycle-time')),{timeout:20000}).toBeGreaterThan(35);
  await expect(host).toHaveAttribute('data-assembly-recovery','resolved');
  expect(await host.getAttribute('data-scene-palette')).not.toBe(palette);
  await host.press('Enter');
  await expect(host).toHaveAttribute('data-fragment-parked-state','waiting');
  await expect(host).toHaveAttribute('data-assembly-interaction','ambient');
  await expect(host).toHaveAttribute('data-fragment-parked-state','waiting');
  await expect(host).toHaveAttribute('data-fragment-parked-state','none',{timeout:8000});
  await host.press('Enter');
  await expect.poll(async()=>Number(await host.getAttribute('data-assembly-live-morph')),{timeout:15000}).toBeGreaterThan(.5);
  await host.press('Escape');
});
for(const lang of ['en','pl'])test(`${lang}: keyboard grab changes form, regrabs and restores ambient score`,async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const host=await ready(page,lang);
  await host.focus();await host.press('Enter');await expect(host).toHaveAttribute('data-assembly-interaction','held');
  const time=await host.getAttribute('data-cycle-time');
  for(let i=0;i<14;i++){await host.press('ArrowRight');await page.waitForTimeout(50);}
  await expect(host).toHaveAttribute('data-assembly-form','chain');
  await expect.poll(async()=>Number(await host.getAttribute('data-bonds-broken'))).toBeGreaterThan(0);
  expect(Number(await host.getAttribute('data-cycle-time'))).toBeGreaterThan(Number(time));
  await host.press('Enter');await expect(host).toHaveAttribute('data-fragment-held','-1');
  await expect.poll(async()=>Number(await host.getAttribute('data-assembly-energy')),{timeout:30000}).toBeLessThan(.015);
  await host.press('Enter');await expect(host).toHaveAttribute('data-fragment-grabs','2');
  await host.press('Escape');await expect(host).toHaveAttribute('data-assembly-interaction','ambient',{timeout:10000});
  await expect.poll(()=>host.getAttribute('data-cycle-time')).not.toBe(time);
  expect(errors).toEqual([]);
});

test('mouse selects an actual fragment; drag outside, cancel and pause release ownership',async({page})=>{
  test.setTimeout(90000);
  const host=await ready(page);const b=(await host.boundingBox())!;
  // Hit-test visible fragments through real pointer events; never call internal scene code.
  let found=false;
  for(const y of [.5,.4,.6,.3,.7]){
    for(const x of [.5,.4,.6,.3,.7,.2,.8]){
      await page.mouse.move(b.x+b.width*x,b.y+b.height*y);await page.waitForTimeout(40);
      if(Number(await host.getAttribute('data-fragment-hover'))>=0&&await host.getAttribute('data-fragment-hover')!==null){found=true;break;}
    }if(found)break;
  }
  expect(found).toBe(true);await page.mouse.down();await expect(host).toHaveAttribute('data-assembly-interaction','held');
  await expect(host).toHaveAttribute('data-assembly-centering','1.000');
  const before=(await host.getAttribute('data-anchor-position'))!.split(',').map(Number);
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5,{steps:10});
  // Small subsequent motion after centering must not jump to an obsolete drag plane.
  const center=(await host.getAttribute('data-anchor-position'))!.split(',').map(Number);
  await page.mouse.move(b.x+b.width*.5+2,b.y+b.height*.5);await page.waitForTimeout(80);
  const after=(await host.getAttribute('data-anchor-position'))!.split(',').map(Number);
  expect(Math.hypot(...after.map((n,i)=>n-center[i]))).toBeLessThan(.15);
  expect(before.every(Number.isFinite)).toBe(true);
  await page.mouse.move(b.x+b.width*.82,b.y+b.height*.24,{steps:20});
  const moved=await host.getAttribute('data-anchor-position');await page.mouse.move(1400,30,{steps:8});await page.mouse.up();
  await expect(host).toHaveAttribute('data-fragment-held','-1');expect(moved).not.toBeNull();
  await host.press('Enter');await page.locator('.motion-toggle').click();await expect(host).toHaveAttribute('data-rendering','false');await expect(host).toHaveAttribute('data-fragment-held','-1');
  const frames=await host.getAttribute('data-frames');await page.waitForTimeout(300);expect(await host.getAttribute('data-frames')).toBe(frames);
  await page.locator('.motion-toggle').click();await host.press('Enter');await page.emulateMedia({reducedMotion:'reduce'});
  await expect(host.locator('canvas')).toHaveCount(0);await expect(host).not.toHaveAttribute('data-assembly-interaction');
});

test('mobile animation has no fragment interaction or keyboard controls',async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const page=await context.newPage();await page.route('**/api/**',r=>r.abort());await page.goto(baseURL+'/en');
  await page.locator('.hero-3d-controls button').click();const host=page.locator('.hero-webgl');
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready',{timeout:20000});
  await expect(host).not.toHaveAttribute('data-assembly-interaction');await expect(host).not.toHaveAttribute('tabindex');await expect(page.locator('.hero-assembly-hint')).toHaveCount(0);
  await expect(host).toHaveAttribute('aria-hidden','true');await context.close();
});

test('held fragment is disposed on context loss and on switching to mobile',async({page})=>{
  const host=await ready(page);await host.press('Enter');await expect(host).toHaveAttribute('data-assembly-interaction','held');
  await host.locator('canvas').evaluate(c=>{const gl=(c as HTMLCanvasElement).getContext('webgl2')!;gl.getExtension('WEBGL_lose_context')!.loseContext();});
  await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','error');await expect(host).not.toHaveAttribute('data-fragment-held');
  await page.locator('.hero-3d-controls button').click();await expect(page.locator('.hero-stage')).toHaveAttribute('data-state','ready');
  await host.press('Enter');await expect(host).toHaveAttribute('data-fragment-grabs','1');await page.setViewportSize({width:390,height:844});
  await expect(host.locator('canvas')).toHaveCount(0);await expect(host).not.toHaveAttribute('data-assembly-interaction');await expect(host).not.toHaveAttribute('tabindex');
});

