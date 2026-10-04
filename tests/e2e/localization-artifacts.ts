import {expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export function localizationArtifacts(page:Page,route:string){
 const directory=process.env.LOCALIZATION_ARTIFACTS;
 const id=(route.startsWith('/en')?'en':'pl')+'-'+(route.replace(/^\/en(?=\/|$)/,'').replace(/^\//,'')||'home');
 const path=(suffix:string)=>join(directory!,`${id}-${suffix}`);
 if(directory)mkdirSync(directory,{recursive:true});
 async function shot(name:string){if(directory)await page.screenshot({path:path(name+'.png')});}
 return {
  async layout(){
   if(!directory)return;
   await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>document.fonts.ready);
   for(const img of await page.locator('img').all()){
    await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
   }
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await shot('top');
   await page.evaluate(()=>scrollTo({top:(document.body.scrollHeight-innerHeight)/2,behavior:'instant'}));await shot('main');
   await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await shot('lower');
   if(route==='/'||route==='/en'){
    await page.screenshot({path:path('full.png'),fullPage:true});
    for(const width of [1440,390]){
     await page.setViewportSize({width,height:1000});
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     await page.locator('.automation-handover').screenshot({path:path(`risk-${width}.png`)});
    }
    await page.setViewportSize({width:1440,height:1000});
   }
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  },
  async state(name:string,anchor:Locator){
   if(!directory)return;
   await expect(anchor).toBeVisible();
   await anchor.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await shot(name);
  },
  audit(value:unknown){if(directory)writeFileSync(path('audit.json'),JSON.stringify(value,null,2));},
 };
}
