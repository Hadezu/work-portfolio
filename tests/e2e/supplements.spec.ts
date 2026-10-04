import {test,expect} from '@playwright/test';
for(const [route,kind] of [['/api-tests','async'],['/healthcare-integration','healthcare']])test('supplement '+kind+' baseline, evidence, regression and reset',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route);const section=page.getByRole('region',{name:'Pakiet dodatkowy '+kind});
 await section.getByRole('button',{name:'Uruchom referencję dodatku'}).click();await expect(page.getByTestId('supplement-'+kind)).toContainText('5 PASS / 0 FAIL');
 await section.getByRole('button',{name:'Wprowadź regresję dodatku'}).click();await expect(page.getByTestId('supplement-'+kind)).toContainText('4 PASS / 1 FAIL');
 await section.locator('details').first().locator('summary').click();await expect(section.locator('details').first().locator('pre')).toBeVisible();
 await section.getByRole('button',{name:'Przywróć referencję dodatku'}).click();await expect(page.getByTestId('supplement-'+kind)).toContainText('5 PASS / 0 FAIL');
 const download=page.waitForEvent('download');await section.getByRole('button',{name:'Eksportuj raport dodatku JSON'}).click();expect((await download).suggestedFilename()).toBe(kind+'-acceptance.json');expect(errors).toEqual([]);
});
