import { expect,test } from '@playwright/test';
test('Workflow acceptance, evidence, matrix, transitions, reports and mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/workflow-access');await page.reload();
  await expect(page.getByRole('heading',{name:'Walidacja uprawnień i przepływu pracy',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Uruchom pakiet',exact:true}).click();
  await expect(page.getByTestId('workflow-overall')).toHaveText('PASS');
  await expect(page.getByTestId('workflow-mode')).toContainText('KONFIGURACJA REFERENCYJNA');
  await expect(page.getByTestId('workflow-row')).toHaveCount(19);
  const negative=page.getByTestId('workflow-row').filter({hasText:'missing-permission'});
  await expect(negative).toContainText('DENY');await expect(negative).toContainText('PASS');
  await page.getByRole('button',{name:'Wprowadź kontrolowaną rozbieżność'}).click();
  await expect(page.getByTestId('workflow-overall')).toHaveText('FAIL');await expect(page.getByTestId('workflow-row')).toHaveCount(1);
  await expect(page.getByTestId('workflow-mode')).toContainText('KONTROLOWANA ROZBIEŻNOŚĆ');
  await expect(page.getByTestId('workflow-row')).toContainText('ALLOW');
  await page.getByRole('button',{name:'Dowód',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('evaluated_rule');await expect(page.getByRole('dialog')).toContainText('rbac.grant');
  await page.getByRole('button',{name:'Zamknij dowód'}).click();
  await page.getByRole('button',{name:'Ponów',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('missing-permission');await page.keyboard.press('Escape');
  await page.getByLabel('Wynik scenariusza').selectOption('PASS');await expect(page.getByTestId('workflow-row')).toHaveCount(18);
  await page.getByLabel('Typ reguły').selectOption('approval');await expect(page.getByTestId('workflow-row')).toHaveCount(5);
  await page.getByLabel('Szukaj scenariusza').fill('self-approval');await expect(page.getByTestId('workflow-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Macierz uprawnień',exact:true}).click();
  await page.getByRole('button',{name:'pracownik configuration/administer: ALLOW',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('roles.employee.permissions');await expect(page.getByRole('dialog')).toContainText('readers');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Przepływ pracy',exact:true}).click();await expect(page.locator('.wf-denied')).not.toHaveCount(0);await expect(page.locator('main')).toContainText('approval.security.required');
  await page.getByRole('button',{name:'Raport',exact:true}).click();
  for(const format of ['JSON','CSV']){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:`Pobierz ${format}`}).click()]);expect(download.suggestedFilename()).toBe(`workflow-acceptance.${format.toLowerCase()}`);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Wyniki',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Przywróć konfigurację referencyjną',exact:true}).click();await page.getByRole('button',{name:'Uruchom pakiet',exact:true}).click();await expect(page.getByTestId('workflow-overall')).toHaveText('PASS');
  expect(errors).toEqual([]);
});
test('Workflow input errors are visible and recoverable',async({page})=>{
  await page.goto('/workflow-access');await expect(page.getByRole('button',{name:'Uruchom pakiet',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Wejście',exact:true}).click();await page.getByLabel('Wejście JSON przepływu pracy').fill('{');await page.getByRole('button',{name:'Uruchom pakiet',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Przywróć konfigurację referencyjną',exact:true}).click();await page.getByRole('button',{name:'Uruchom pakiet',exact:true}).click();await expect(page.getByTestId('workflow-overall')).toHaveText('PASS');
});
