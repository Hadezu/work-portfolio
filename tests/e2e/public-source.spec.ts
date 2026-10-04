import {test,expect} from '@playwright/test';
test('local source serves EN/PL and refuses external actions',async({page,request})=>{
  for(const route of ['/','/en','/en/api-tests','/en/proof/migration','/en/proof/revenue-bi']){
    const response=await page.goto(route);expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  }
  expect((await request.post('/api/contact',{data:{}})).status()).toBe(503);
  expect((await request.post('/api/metrics',{data:{}})).status()).toBe(204);
  expect((await request.post('/lab-api/ai-automation/run',{data:{}})).status()).toBe(503);
});
test('API scenarios run against the local synthetic endpoints and export measured times',async({page})=>{
  await page.goto('/en/api-tests');
  await page.getByRole('button',{name:'Run test package',exact:true}).click();
  await expect(page.getByTestId('api-total')).toHaveText('12');
  await expect(page.getByTestId('api-pass')).toHaveText('6');
  await expect(page.getByText('Total scenario time')).toBeVisible();
});
