import {expect,test} from '@playwright/test';
test('Healthcare baseline, controlled regression, evidence, contracts, graph, export and restore',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/healthcare-integration');await page.reload();
  await expect(page.getByRole('heading',{name:'Walidacja integracji systemów medycznych',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Uruchom pakiet referencyjny',exact:true}).click();
  await expect(page.getByTestId('healthcare-overall')).toHaveText('PASS');
  await expect(page.getByTestId('healthcare-mode')).toContainText('KONFIGURACJA REFERENCYJNA');
  await expect(page.getByTestId('healthcare-row')).toHaveCount(19);
  const negative=page.getByTestId('healthcare-row').filter({hasText:'unknown-patient'});
  await expect(negative).toContainText('REJECT');await expect(negative).toContainText('PASS');
  await page.getByRole('button',{name:'Wprowadź kontrolowaną rozbieżność'}).click();
  await expect(page.getByTestId('healthcare-overall')).toHaveText('FAIL');await expect(page.getByTestId('healthcare-row')).toHaveCount(1);
  await expect(page.getByTestId('healthcare-mode')).toContainText('Patient/p001 → Patient/p999');
  await expect(page.getByTestId('healthcare-row')).toContainText('Patient/p999 — nie znaleziono');
  await page.getByRole('button',{name:'Dowód',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('resolved_target');await expect(page.getByRole('dialog')).toContainText('reference.patient');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Ponów',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('valid-Observation');await page.getByRole('button',{name:'Zamknij dowód'}).click();
  await page.getByLabel('Wynik testu',{exact:true}).selectOption('PASS');await expect(page.getByTestId('healthcare-row')).toHaveCount(18);
  await page.getByLabel('Typ zasobu').selectOption('Patient');await page.getByLabel('Typ reguły').selectOption('identifier');await expect(page.getByTestId('healthcare-row')).toHaveCount(1);
  await page.getByLabel('Szukaj scenariusza').fill('not-present');await expect(page.getByTestId('healthcare-row')).toHaveCount(0);
  await page.getByRole('button',{name:'Interfejsy',exact:true}).click();await page.getByRole('button',{name:'Kontrakt Observation',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('required_fields');await expect(page.getByRole('dialog')).toContainText('reference_rules');await expect(page.getByRole('dialog')).toContainText('example_payload');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Referencje',exact:true}).click();
  const broken=page.getByTestId('reference-edge').filter({hasText:'Patient/p999'});await expect(broken).toContainText('NIE ROZWIĄZANO');await broken.getByRole('button').click();await expect(page.getByRole('dialog')).toContainText('resolved_target');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Raport',exact:true}).click();
  for(const format of ['JSON','CSV']){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:`Pobierz ${format}`}).click()]);expect(download.suggestedFilename()).toBe(`healthcare-acceptance.${format.toLowerCase()}`);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Referencje',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Przywróć konfigurację referencyjną'}).click();await expect(page.getByTestId('healthcare-overall')).toHaveText('PASS');await expect(page.getByTestId('healthcare-row')).toHaveCount(19);
  await page.getByRole('button',{name:'Referencje',exact:true}).click();await expect(page.getByTestId('reference-edge').filter({hasText:'NIE ROZWIĄZANO'})).toHaveCount(0);
  await page.getByRole('button',{name:'Architektura',exact:true}).click();await expect(page.getByRole('link',{name:'OpenAPI / dokumentacja API →'})).toHaveAttribute('href','/lab-api/docs');
  expect(errors).toEqual([]);
});
test('Healthcare malformed editor input is recoverable without altering reference data',async({page})=>{
  await page.goto('/healthcare-integration');await expect(page.getByRole('button',{name:'Uruchom pakiet referencyjny',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Wejście',exact:true}).click();await page.getByLabel('Wejście JSON integracji medycznej').fill('{');await page.getByRole('button',{name:'Waliduj wejście',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Przywróć konfigurację referencyjną'}).click();await expect(page.getByTestId('healthcare-overall')).toHaveText('PASS');
});
