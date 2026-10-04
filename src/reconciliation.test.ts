import { describe, expect, it } from 'vitest';
import { createDemoDataset, Dataset, reconcile, toCsv } from './reconciliation';

describe('reguły uzgadniania', () => {
  it('nie zgłasza błędów dla poprawnego, zgodnego kompletu', () => {
    const data: Dataset = {
      orders: [{ id: 'ORD-1', external_id: 'EXT-1', sku: 'SKU-A100', quantity: 2, amount: 50, date: '2026-08-01', status: 'paid' }],
      invoices: [{ id: 'INV-1', order_id: 'ORD-1', external_id: 'IEXT-1', sku: 'SKU-A100', quantity: 2, amount: 50, date: '2026-08-01', status: 'paid' }],
      warehouse: [{ id: 'WH-1', order_id: 'ORD-1', sku: 'SKU-A100', quantity: 2, date: '2026-08-01' }],
    };
    expect(reconcile(data)).toEqual([]);
  });

  it('wykrywa brak faktury, rekord magazynowy i fakturę bez zamówienia', () => {
    const data: Dataset = {
      orders: [{ id: 'ORD-1', external_id: 'EXT-1', sku: 'SKU-A100', quantity: 1, amount: 25, date: '2026-08-01', status: 'new' }],
      invoices: [{ id: 'INV-X', order_id: 'ORD-X', external_id: 'IEXT-X', sku: 'SKU-A100', quantity: 1, amount: 25, date: '2026-08-01', status: 'open' }],
      warehouse: [],
    };
    expect(reconcile(data).map(i => i.type)).toEqual(expect.arrayContaining(['Brak faktury', 'Niezgodność magazynowa', 'Faktura bez zamówienia']));
  });

  it('obsługuje przypadki brzegowe: duplikat, brak ID, złą datę i nieznany SKU', () => {
    const data = createDemoDataset();
    const types = reconcile(data).map(i => i.type);
    expect(types).toEqual(expect.arrayContaining(['Duplikat ID', 'Brak ID zewnętrznego', 'Nieprawidłowa data', 'Nieznany SKU']));
  });
});

describe('fixture demonstracyjny', () => {
  it('daje deterministycznie 18 rozbieżności we wszystkich 10 kategoriach', () => {
    const issues = reconcile(createDemoDataset());
    expect(issues).toHaveLength(18);
    expect(new Set(issues.map(i => i.type))).toHaveLength(10);
  });

  it('eksport zawiera dokładnie tyle pozycji co interfejs', () => {
    const issues = reconcile(createDemoDataset());
    expect(toCsv(issues).split('\n')).toHaveLength(issues.length + 1);
  });
});
