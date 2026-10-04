import {expect,test} from '@playwright/test';
test('Operations waits for initial fixture before selecting CSV',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/lab-api/operations-exceptions/fixtures',async route=>{const response=await route.fetch();await gate;await route.fulfill({response});});
  await page.goto('/operations-exceptions');await page.getByRole('button',{name:'Wejście',exact:true}).click();
  await expect(page.getByRole('button',{name:'Załaduj referencję CSV'})).toBeDisabled();
  release();await page.getByRole('button',{name:'Załaduj referencję CSV'}).click();
  await expect(page.getByRole('button',{name:'Pobierz orders.csv',exact:true})).toBeVisible();
});
test('Operations controls: baseline, catalog, negative evidence, controlled document failure, source and reset',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/operations-exceptions');await page.reload();await expect(page.getByRole('heading',{name:'Kontrola wyjątków w procesach operacyjnych',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Uruchom pakiet referencyjny',exact:true}).click();await expect(page.getByTestId('operations-overall')).toHaveText('PASS');await expect(page.getByTestId('operations-result')).toHaveCount(17);
  const negative=page.getByTestId('operations-result').filter({hasText:'order.overdue'});await expect(negative).toContainText('PASS');await negative.getByRole('button',{name:'Dowód',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('expected_rules');await expect(page.getByRole('dialog')).toContainText('order.overdue');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Reguły',exact:true}).click();await expect(page.getByTestId('operations-rule')).toHaveCount(14);
  await page.getByRole('button',{name:'Wprowadź kontrolowaną rozbieżność'}).click();await expect(page.getByTestId('operations-overall')).toHaveText('FAIL');await expect(page.getByTestId('operations-result')).toHaveCount(1);await expect(page.getByTestId('operations-mode')).toContainText('DOC-C204');
  await page.getByRole('button',{name:'Dowód',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('COMMERCIAL_INVOICE');await expect(page.getByRole('dialog')).toContainText('documents_found');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Dokumenty',exact:true}).click();await expect(page.getByTestId('operations-document')).toContainText('BRAK: COMMERCIAL_INVOICE');await expect(page.getByTestId('operations-document')).toContainText('PACKING_LIST');
  await page.getByRole('button',{name:'Wyjątki',exact:true}).click();await expect(page.getByTestId('operations-exception')).toHaveCount(1);await expect(page.getByTestId('operations-exception')).toContainText('Sprawdź dokument');
  await page.getByRole('button',{name:'Źródło rekordu',exact:true}).click();await expect(page.getByTestId('operations-trace')).toContainText('orders.json');await expect(page.getByTestId('operations-trace')).toContainText('normalized_field');await expect(page.getByTestId('operations-trace')).toContainText('documents.json');
  await page.getByLabel('Priorytet',{exact:true}).selectOption('LOW');await expect(page.getByTestId('operations-exception')).toHaveCount(0);await page.getByLabel('Priorytet',{exact:true}).selectOption('HIGH');await page.getByLabel('Szukaj wyjątku').fill('ORD-204');await expect(page.getByTestId('operations-exception')).toHaveCount(1);
  await page.getByRole('button',{name:'Przywróć konfigurację referencyjną'}).click();await expect(page.getByTestId('operations-overall')).toHaveText('PASS');
  await page.getByRole('button',{name:'Raport',exact:true}).click();for(const format of ['JSON','CSV']){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:`Pobierz ${format}`}).click()]);expect(download.suggestedFilename()).toBe(`operations-acceptance.${format.toLowerCase()}`);}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Wprowadź kontrolowaną rozbieżność'}).click();await expect(page.getByTestId('operations-overall')).toHaveText('FAIL');await page.getByRole('button',{name:'Wyjątki',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('Operations imports CSV and JSON exports with physical source row trace',async({page})=>{
  await page.goto('/operations-exceptions');await page.getByRole('button',{name:'Wejście',exact:true}).click();await page.getByRole('button',{name:'Załaduj referencję CSV'}).click();await expect(page.getByRole('button',{name:'Pobierz orders.csv',exact:true})).toBeVisible();
  await page.getByLabel('Wczytaj CSV/JSON').setInputFiles({name:'documents.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{document_id:'DOC-P204',order_id:'ORD-204',shipment_id:'SH-204',type:'PACKING_LIST',valid_until:'2026-12-31'}]))});
  await page.getByRole('button',{name:'Sprawdź wczytane pliki'}).click();await expect(page.getByTestId('operations-overall')).toHaveText('FAIL');await expect(page.getByTestId('operations-result')).toHaveCount(1);await page.getByRole('button',{name:'Wyjątki',exact:true}).click();await page.getByRole('button',{name:'Źródło rekordu'}).click();await expect(page.getByTestId('operations-trace')).toContainText('orders.csv');await expect(page.getByTestId('operations-trace')).toContainText('"row": 2');
  await page.getByRole('button',{name:'Wejście',exact:true}).click();await page.getByLabel('Wczytaj CSV/JSON').setInputFiles({name:'orders.csv',mimeType:'text/csv',buffer:Buffer.from('order_id,customer\nonly-one-column')});await page.getByRole('button',{name:'Sprawdź wczytane pliki'}).click();await expect(page.getByRole('alert')).toContainText('422');await page.getByRole('button',{name:'Przywróć konfigurację referencyjną'}).click();await expect(page.getByTestId('operations-overall')).toHaveText('PASS');
});
