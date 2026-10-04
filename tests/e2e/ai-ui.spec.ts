import {test,expect} from '@playwright/test';
import {aiCopy} from '../../src/ai-copy';
import {documentsFor,type Output} from '../../src/ai-lab-model';
import {initialRun,completeRun,decide} from '../../worker/ai-lab';
// UI contract test only. Real inference verification is separate in ai-live.spec.ts.
for(const locale of ['en','pl'] as const)test(`AI UI contract, review, exports and mobile: ${locale}`,async({page},info)=>{
 const c=aiCopy[locale],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture:Output={company_name:'Demo Northstar',contact_name:'Alex Demo',category:'integration',requested_outcome:'Synthetic test fixture',systems_mentioned:['HubSpot','Demo Billing API'],data_objects:['customers'],urgency:'normal',constraints:[],missing_information:[],suggested_next_step:'Review',confidence:.9,requires_human_review:false,claims:[{document_id:'API-01',quote:documentsFor(locale)[0].text}],proposed_tool:{name:'create_task',arguments:{summary:'Review'}}};
 let run=completeRun(initialRun('test-ui','clear',locale),JSON.stringify(fixture));
 await page.route('**/lab-api/ai-automation/**',async route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/runs'))return route.fulfill({json:[]});if(path.endsWith('/review'))run=decide(run,route.request().postDataJSON().decision)!;return route.fulfill({json:run});});
 await page.goto(locale==='en'?'/en/proof/ai-automation':'/proof/ai-automation');
 await expect(page.getByRole('heading',{name:c.title,exact:true})).toBeVisible();await expect(page.getByText(c.disclosure,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:c.run,exact:true}).click();await expect(page.getByTestId('ai-status')).toHaveText('READY');
 await page.getByRole('button',{name:'3. '+c.tabs[2],exact:true}).click();await expect(page.locator('blockquote').last()).toContainText('API-01');
 await page.getByRole('button',{name:'5. '+c.tabs[4],exact:true}).click();await page.getByTestId('ai-approve').click();await expect(page.getByTestId('ai-status')).toHaveText('EXECUTED');
 await page.getByRole('button',{name:'8. '+c.tabs[7],exact:true}).click();await expect(page.getByRole('link',{name:c.downloadJson})).toHaveAttribute('href','/lab-api/ai-automation/report/test-ui.json');
 await page.screenshot({path:info.outputPath('ai-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('ai-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:c.reset,exact:true}).click();await expect(page.getByTestId('ai-status')).toHaveCount(0);expect(errors).toEqual([]);
});
