export type Severity = 'wysoki' | 'średni' | 'niski';

export type OrderRecord = {
  id: string; external_id: string; sku: string; quantity: number; amount: number; date: string; status: string;
};
export type InvoiceRecord = {
  id: string; order_id: string; external_id: string; sku: string; quantity: number; amount: number; date: string; status: string;
};
export type WarehouseRecord = {
  id: string; order_id: string; sku: string; quantity: number; date: string;
};
export type Dataset = { orders: OrderRecord[]; invoices: InvoiceRecord[]; warehouse: WarehouseRecord[] };
export type DiscrepancyType =
  | 'Brak faktury' | 'Faktura bez zamówienia' | 'Niezgodna ilość' | 'Niezgodna kwota'
  | 'Nieznany SKU' | 'Duplikat ID' | 'Brak ID zewnętrznego' | 'Nieprawidłowa data'
  | 'Niezgodny status' | 'Niezgodność magazynowa';

export type Discrepancy = {
  id: string;
  type: DiscrepancyType;
  severity: Severity;
  sources: string;
  expected: string;
  actual: string;
  reason: string;
  action: string;
};

const SKUS = ['SKU-A100', 'SKU-B200', 'SKU-C300', 'SKU-D400', 'SKU-E500'];
const statusMap: Record<string, string> = { new: 'open', paid: 'paid', shipped: 'shipped' };

/** Shared field-level comparison for document and migration reconciliation. */
export function compareFields(expected: Record<string, unknown>, actual: Record<string, unknown> | null, tolerance: Record<string, number> = {}) {
  return Object.fromEntries(Object.entries(expected).filter(([key, value]) => {
    if (!actual) return true;
    if (typeof value === 'number' && typeof actual[key] === 'number' && key in tolerance)
      return Math.abs(value - (actual[key] as number)) > tolerance[key];
    return value !== actual[key];
  }).map(([key, value]) => [key, {expected: value, actual: actual?.[key] ?? null}]));
}

/** Compare canonical records, retaining missing records on either side. */
export function reconcileRecords(source: Record<string, unknown>[], target: Record<string, unknown>[]) {
  const remaining = new Map(target.map(row=>[String(row.external_id),row]));
  const rows = source.map(expected=>{
    const id=String(expected.external_id),actual=remaining.get(id)??null;
    remaining.delete(id);
    const differences=compareFields(expected,actual);
    return {source_id:id as string|null,target_id:actual?'B-'+id:null,
      status:!actual?'MISSING TARGET':actual.version!==expected.version?'VERSION CONFLICT':Object.keys(differences).length?'DIFFERENCE':'MATCH',
      source:expected as Record<string,unknown>|null,target:actual,differences};
  });
  for(const [id,actual] of remaining) rows.push({source_id:null,target_id:'B-'+id,status:'MISSING SOURCE',source:null,target:actual,differences:{}});
  return rows;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function duplicateDiscrepancies<T extends { id: string }>(rows: T[], source: string): Discrepancy[] {
  const seen = new Set<string>();
  return rows.flatMap((row, index) => {
    if (!row.id || !seen.has(row.id)) {
      if (row.id) seen.add(row.id);
      return [];
    }
    return [{
      id: `duplicate-${source}-${row.id}-${index}`,
      type: 'Duplikat ID' as const,
      severity: 'wysoki' as const,
      sources: `${source}: ${row.id}`,
      expected: 'unikalny identyfikator',
      actual: `powtórzone ID ${row.id}`,
      reason: `Identyfikator występuje więcej niż raz w pliku ${source}.`,
      action: 'Ustalić rekord nadrzędny i usunąć lub scalić duplikat przed importem.',
    }];
  });
}

export function reconcile(data: Dataset): Discrepancy[] {
  const issues: Discrepancy[] = [
    ...duplicateDiscrepancies(data.orders, 'orders.csv'),
    ...duplicateDiscrepancies(data.invoices, 'invoices.csv'),
    ...duplicateDiscrepancies(data.warehouse, 'warehouse.csv'),
  ];
  const orderIds = new Set(data.orders.map((row) => row.id));
  const invoicesByOrder = new Map<string, InvoiceRecord>();
  const warehouseByOrder = new Map<string, WarehouseRecord>();
  data.invoices.forEach((row) => { if (!invoicesByOrder.has(row.order_id)) invoicesByOrder.set(row.order_id, row); });
  data.warehouse.forEach((row) => { if (!warehouseByOrder.has(row.order_id)) warehouseByOrder.set(row.order_id, row); });

  const add = (issue: Omit<Discrepancy, 'id'>, key: string) => issues.push({ id: `${key}-${issues.length + 1}`, ...issue });

  data.orders.forEach((order, index) => {
    const invoice = invoicesByOrder.get(order.id);
    const stock = warehouseByOrder.get(order.id);
    if (!order.external_id.trim()) add({ type: 'Brak ID zewnętrznego', severity: 'wysoki', sources: `orders.csv: ${order.id}`, expected: 'niepuste external_id', actual: 'brak wartości', reason: 'Rekordu nie można jednoznacznie powiązać z systemem źródłowym.', action: 'Uzupełnić ID w systemie źródłowym i ponowić eksport.' }, `external-${index}`);
    if (!validDate(order.date)) add({ type: 'Nieprawidłowa data', severity: 'średni', sources: `orders.csv: ${order.id}`, expected: 'poprawna data YYYY-MM-DD', actual: order.date || 'brak wartości', reason: 'Data jest pusta albo nie istnieje w kalendarzu.', action: 'Sprawdzić mapowanie formatu i wartość w źródle.' }, `date-order-${index}`);
    if (!SKUS.includes(order.sku)) add({ type: 'Nieznany SKU', severity: 'wysoki', sources: `orders.csv: ${order.id}`, expected: `SKU z katalogu (${SKUS.join(', ')})`, actual: order.sku || 'brak wartości', reason: 'Kod produktu nie występuje w uzgodnionym katalogu demonstracyjnym.', action: 'Zweryfikować mapowanie produktu albo dodać zatwierdzony SKU.' }, `sku-${index}`);
    if (!invoice) {
      add({ type: 'Brak faktury', severity: 'wysoki', sources: `orders.csv: ${order.id}`, expected: 'pasująca faktura', actual: 'nie znaleziono', reason: 'Dla zamówienia nie znaleziono faktury po order_id.', action: 'Sprawdzić proces fakturowania lub zakres dat eksportu.' }, `invoice-missing-${index}`);
    } else {
      const differences = compareFields({quantity: order.quantity, amount: order.amount, status: statusMap[order.status] ?? order.status}, invoice, {amount: 0.01});
      if ('quantity' in differences) add({ type: 'Niezgodna ilość', severity: 'wysoki', sources: `orders.csv: ${order.id} ↔ invoices.csv: ${invoice.id}`, expected: String(order.quantity), actual: String(invoice.quantity), reason: 'Ilość na fakturze różni się od ilości w zamówieniu.', action: 'Sprawdzić korekty, częściową realizację lub błąd importu.' }, `quantity-${index}`);
      if ('amount' in differences) add({ type: 'Niezgodna kwota', severity: 'wysoki', sources: `orders.csv: ${order.id} ↔ invoices.csv: ${invoice.id}`, expected: order.amount.toFixed(2), actual: invoice.amount.toFixed(2), reason: 'Kwota faktury nie odpowiada wartości zamówienia.', action: 'Zweryfikować rabaty, podatki, walutę i zasady zaokrągleń.' }, `amount-${index}`);
      if ('status' in differences) add({ type: 'Niezgodny status', severity: 'średni', sources: `orders.csv: ${order.id} ↔ invoices.csv: ${invoice.id}`, expected: statusMap[order.status] ?? order.status, actual: invoice.status, reason: 'Status dokumentu nie odpowiada uzgodnionemu mapowaniu statusów.', action: 'Sprawdzić kolejność synchronizacji i mapowanie statusów.' }, `status-${index}`);
      if (!validDate(invoice.date)) add({ type: 'Nieprawidłowa data', severity: 'średni', sources: `invoices.csv: ${invoice.id}`, expected: 'poprawna data YYYY-MM-DD', actual: invoice.date || 'brak wartości', reason: 'Data faktury jest pusta albo nieprawidłowa.', action: 'Poprawić datę dokumentu i ponowić eksport.' }, `date-invoice-${index}`);
    }
    if (!stock || stock.quantity !== order.quantity) add({ type: 'Niezgodność magazynowa', severity: 'średni', sources: `orders.csv: ${order.id}${stock ? ` ↔ warehouse.csv: ${stock.id}` : ''}`, expected: String(order.quantity), actual: stock ? String(stock.quantity) : 'brak rekordu', reason: stock ? 'Ilość wydana z magazynu różni się od ilości zamówionej.' : 'Nie znaleziono rekordu magazynowego dla zamówienia.', action: 'Sprawdzić kompletację, częściowe wydanie albo opóźnienie eksportu magazynowego.' }, `warehouse-${index}`);
  });

  data.invoices.forEach((invoice, index) => {
    if (!orderIds.has(invoice.order_id)) add({ type: 'Faktura bez zamówienia', severity: 'wysoki', sources: `invoices.csv: ${invoice.id}`, expected: `order_id istniejące w orders.csv`, actual: invoice.order_id, reason: 'Faktura wskazuje zamówienie nieobecne w dostarczonym eksporcie.', action: 'Sprawdzić zakres eksportu, identyfikator albo dokument utworzony ręcznie.' }, `orphan-${index}`);
  });

  return issues;
}

export function createDemoDataset(reference = false): Dataset {
  const orders: OrderRecord[] = Array.from({ length: 40 }, (_, i) => ({
    id: `ORD-${String(1001 + i)}`, external_id: `EXT-${String(i + 1).padStart(4, '0')}`,
    sku: SKUS[i % SKUS.length], quantity: (i % 4) + 1, amount: ((i % 4) + 1) * (25 + (i % 5) * 7.5),
    date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`, status: ['new', 'paid', 'shipped'][i % 3],
  }));
  if(reference)return {orders,invoices:orders.map((o,i)=>({id:`INV-${2001+i}`,order_id:o.id,external_id:`IEXT-${i+1}`,sku:o.sku,quantity:o.quantity,amount:o.amount,date:o.date,status:statusMap[o.status]})),warehouse:orders.map((o,i)=>({id:`WH-${3001+i}`,order_id:o.id,sku:o.sku,quantity:o.quantity,date:o.date}))};
  orders[4].external_id = '';
  orders[6].date = '2026-02-30';
  orders[8].sku = 'SKU-X999';
  orders[39].id = orders[2].id;

  const invoices: InvoiceRecord[] = orders.slice(0, 38).map((order, i) => ({
    id: `INV-${String(2001 + i)}`, order_id: order.id, external_id: `IEXT-${String(i + 1).padStart(4, '0')}`,
    sku: order.sku, quantity: order.quantity, amount: order.amount, date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
    status: statusMap[order.status] ?? order.status,
  }));
  invoices[10].quantity += 1;
  invoices[13].amount += 12.5;
  invoices[16].status = 'cancelled';
  invoices[19].date = '';
  invoices.push({ id: 'INV-2999', order_id: 'ORD-9999', external_id: 'IEXT-9999', sku: 'SKU-A100', quantity: 1, amount: 25, date: '2026-08-20', status: 'paid' });
  invoices.push({ ...invoices[2] });

  const warehouse: WarehouseRecord[] = orders.map((order, i) => ({
    id: `WH-${String(3001 + i)}`, order_id: order.id, sku: order.sku, quantity: order.quantity,
    date: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
  }));
  warehouse[22].quantity += 2;
  warehouse.splice(26, 1);
  warehouse.push({ ...warehouse[3] });
  return { orders, invoices, warehouse };
}

export function toCsv(issues: Discrepancy[]) {
  const header = ['id', 'typ', 'ważność', 'rekordy źródłowe', 'oczekiwane', 'rzeczywiste', 'powód', 'zalecane działanie'];
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [header, ...issues.map((i) => [i.id, i.type, i.severity, i.sources, i.expected, i.actual, i.reason, i.action])]
    .map((row) => row.map((value) => quote(String(value))).join(',')).join('\n');
}
