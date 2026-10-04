import {localizationArtifacts} from './localization-artifacts';
import {expect,test,type Page} from '@playwright/test';
import {languageLeaks} from '../../src/language-audit';
import type {Locale} from '../../src/localization-contract';

const proofs=['reconciliation','api-tests','data-bridge','transit-validation','workflow-access','healthcare-integration','erp-sync','operations-exceptions','data-quality'];
const tabCounts:Record<string,number>={'transit-validation':6,'workflow-access':7,'healthcare-integration':7,'erp-sync':8,'operations-exceptions':8,'data-quality':11};

async function buyerText(page:Page){
 return page.evaluate(()=>{
  const text:string[]=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,parent=node.parentElement;
   // JSON evidence and editable source data remain faithful to the contract.
   // Ordinary code labels, option text and accessible names are audited.
   if(!parent||parent.closest('script,style,pre,textarea')||(!parent.checkVisibility()&&parent.tagName!=='OPTION'))continue;
   if(node.nodeValue?.trim())text.push(node.nodeValue.trim());
  }
  document.querySelectorAll<HTMLElement>('[aria-label],[placeholder],[alt],[title]').forEach(el=>{
   if(el.checkVisibility())for(const attr of ['aria-label','placeholder','alt','title'])if(el.getAttribute(attr))text.push(el.getAttribute(attr)!);
  });
  return [...new Set(text)];
 });
}

for(const locale of ['pl','en'] as const)for(const slug of ['',...proofs]){
 const route=(locale==='en'?'/en':'')+(slug?'/'+slug:locale==='en'?'':'/');
 test(`${route}: bidirectional source-rendered UI and all acceptance states`,async({page},info)=>{
  test.setTimeout(180_000);
  const artifacts=localizationArtifacts(page,route);
  const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error(route,e.message);});
  const observations:Array<{state:string;matches:Array<{text:string;matches:string[]}>}>=[];
  async function audit(state:string){
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   await expect(page.locator('main h1')).toBeVisible();
   observations.push({state,matches:(await buyerText(page)).flatMap(text=>{const matches=languageLeaks(text,locale);return matches.length?[{text,matches}]:[];})});
  }
  async function click(name:RegExp){
   const control=page.getByRole('button',{name}).first();
   await expect(control).toBeVisible();await expect(control).toBeEnabled();await control.click();
   // The initial API run button changes its name; other controls retain their
   // names and are disabled until the complete asynchronous operation finishes.
   if(!(slug==='api-tests'&&/^\^?(Uruchom pakiet testów|Run test package)/.test(name.source)))await expect(control).toBeEnabled();
   await expect(page.locator('[role="alert"]')).toHaveCount(0);
  }
  async function tabs(state:string){
   const buttons=page.locator('.lab-tabs button');await expect(buttons).toHaveCount(tabCounts[slug]??0);
   for(let i=0;i<(tabCounts[slug]??0);i++){await buttons.nth(i).click();await audit(`${state}:tab:${i}`);if(state==='restored'&&i===(tabCounts[slug]??0)-1)await artifacts.state('architecture',page.locator('.lab-tabs'));}
  }
  await page.goto(route);await artifacts.layout();await audit('initial');await tabs('initial');
  if(slug){
   if(slug==='api-tests'){
    await click(locale==='pl'?/^Uruchom pakiet testów$/:/^Run test package$/);
    await expect(page.getByTestId('api-total')).toHaveText('12');await audit('API results');await artifacts.state('reference',page.getByTestId('api-total'));
    for(const name of ['JSON diff']){await page.getByRole('button',{name,exact:true}).first().click();await audit('API expanded');}
   }else{
    const run=locale==='pl'?/^Uruchom (referencję|pakiet|pakiet referencyjny)$/:/^Run (reference|package|the reference package)$/;
    const defect=locale==='pl'?/^Wprowadź kontrolowaną rozbieżność$/:/^Introduce (a )?controlled discrepancy$/;
    const restore=locale==='pl'?/^Przywróć konfigurację( referencyjną)?$/:/^Restore (reference )?configuration$/;
    const id:Record<string,string>={reconciliation:'reconciliation-overall','data-bridge':'bridge-overall','transit-validation':'lab-overall','workflow-access':'workflow-overall','healthcare-integration':'healthcare-overall','erp-sync':'erp-overall','operations-exceptions':'operations-overall','data-quality':'quality-overall'};
    for(const [state,button,status] of [['reference',run,'PASS'],['controlled defect',defect,'FAIL'],['restored',restore,'PASS']] as const){
     await click(button);await expect(page.getByTestId(id[slug]).first()).toContainText(status);await audit(state);await artifacts.state(state.replaceAll(' ','-'),page.getByTestId(id[slug]).first());await tabs(state);
     if(slug==='transit-validation'){await page.getByRole('button',{name:locale==='pl'?'Wyniki':'Results',exact:true}).click();await page.getByRole('combobox',{name:locale==='pl'?'Wynik':'Result',exact:true}).selectOption('ALL');await audit(state+':all checks');}
    }
   }
   if(['api-tests','healthcare-integration'].includes(slug))for(const [pl,en,status]of [['Uruchom referencję dodatku','Run supplement reference','PASS'],['Wprowadź regresję dodatku','Introduce supplement regression','FAIL'],['Przywróć referencję dodatku','Restore supplement reference','PASS']]){
    await click(new RegExp('^'+(locale==='pl'?pl:en)+'$'));await expect(page.getByTestId(slug==='api-tests'?'supplement-async':'supplement-healthcare').locator('strong')).toHaveText(status);await audit('supplement '+status);await artifacts.state('supplement-'+status,page.getByTestId(slug==='api-tests'?'supplement-async':'supplement-healthcare'));
   }
   if(slug==='data-bridge'){
    const controls=page.locator('.bridge-workspace').first().locator('.lab-toolbar button');await expect(controls).toHaveCount(12);
    for(let i=0;i<12;i++){await controls.nth(i).click();await audit('bridge mode '+i);}
   }
   if(['reconciliation','data-bridge'].includes(slug)){
    await click(locale==='pl'?/^Uruchom dane demonstracyjne$/:/^Run demo data$/);await audit('seeded demonstration');
    await page.getByRole('button',{name:locale==='pl'?/Szczegóły/:/Details/}).first().click();await audit('evidence dialog');
   }
  }
  artifacts.audit({route,locale,observations,errors});
  await info.attach('language-audit.json',{body:JSON.stringify({route,locale,observations,errors},null,2),contentType:'application/json'});
  expect(errors,'runtime errors').toEqual([]);
  expect(observations.flatMap(o=>o.matches.map(m=>({state:o.state,...m}))),'buyer-visible wrong-language matches').toEqual([]);
 });
}

test('same-tab EN → PL → EN navigation never retains translated DOM nodes',async({page})=>{
 for(const route of ['','/healthcare-integration','/api-tests','/data-quality','/erp-sync']){
  await page.goto('/en'+route);
  for(const locale of ['pl','en','pl'] as Locale[]){
   await page.getByRole('link',{name:locale.toUpperCase(),exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   const leaks=(await buyerText(page)).flatMap(text=>languageLeaks(text,locale));expect(leaks).toEqual([]);
  }
 }
});
