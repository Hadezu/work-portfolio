export type SourceOrder = {
  order_id: string;
  buyer_code: string;
  created_at: string;
  currency: string;
  status: string;
  lines: Array<{ sku: string; qty: number; unit_price: number }>;
};

export type TargetOrder = {
  externalId: string;
  customerCode: string;
  orderDate: string;
  currencyCode: string;
  lifecycle: 'NEW' | 'CONFIRMED' | 'SHIPPED';
  items: Array<{ productCode: string; quantity: number; unitPrice: number }>;
};

export const knownSkus = ['SKU-A100', 'SKU-B200', 'SKU-C300'];
const statusMapping: Record<string, TargetOrder['lifecycle']> = {
  new: 'NEW', confirmed: 'CONFIRMED', shipped: 'SHIPPED',
};

export const syntheticSourceOrders: SourceOrder[] = [
  { order_id: 'SRC-2026-001', buyer_code: 'BUYER-PL-01', created_at: '2026-09-10', currency: 'PLN', status: 'confirmed', lines: [{ sku: 'SKU-A100', qty: 4, unit_price: 32.5 }] },
  { order_id: 'SRC-2026-002', buyer_code: 'BUYER-PL-02', created_at: '2026-09-11', currency: 'PLN', status: 'new', lines: [{ sku: 'SKU-B200', qty: 1.25, unit_price: 18.4 }] },
  { order_id: 'SRC-2026-003', buyer_code: 'BUYER-PL-03', created_at: '2026-09-12', currency: 'PLN', status: 'shipped', lines: [{ sku: 'SKU-C300', qty: 2, unit_price: 74 }] },
];

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function mapSourceOrder(source: SourceOrder): TargetOrder {
  const lifecycle = statusMapping[source.status];
  if (!lifecycle) throw new Error(`Nieobsługiwany status źródłowy: ${source.status}`);
  return {
    externalId: source.order_id,
    customerCode: source.buyer_code,
    orderDate: source.created_at,
    currencyCode: source.currency,
    lifecycle,
    items: source.lines.map(line => ({ productCode: line.sku, quantity: Math.round(line.qty * 100) / 100, unitPrice: line.unit_price })),
  };
}

export function validateTargetOrder(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['payload musi być obiektem'];
  const row = value as Partial<TargetOrder>;
  const errors: string[] = [];
  if (!row.externalId) errors.push('externalId jest wymagane');
  if (!row.customerCode) errors.push('customerCode jest wymagane');
  if (!row.orderDate || !isIsoDate(row.orderDate)) errors.push('orderDate musi być poprawną datą YYYY-MM-DD');
  if (row.currencyCode !== 'PLN') errors.push('currencyCode musi mieć wartość PLN');
  if (!row.lifecycle || !['NEW', 'CONFIRMED', 'SHIPPED'].includes(row.lifecycle)) errors.push('lifecycle ma niedozwoloną wartość');
  if (!Array.isArray(row.items) || row.items.length === 0) errors.push('items musi zawierać co najmniej jedną pozycję');
  else row.items.forEach((item, index) => {
    if (!knownSkus.includes(item.productCode)) errors.push(`items[${index}].productCode jest nieznany`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || Math.round(item.quantity * 100) !== item.quantity * 100) errors.push(`items[${index}].quantity ma nieprawidłową precyzję`);
  });
  return errors;
}

export function isTargetResponse(value: unknown): value is { targetId: string; externalId: string; accepted: boolean } {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.targetId === 'string' && typeof row.externalId === 'string' && row.accepted === true;
}

export type ContractField = { path: string; type: 'string' | 'boolean'; required: boolean; enum?: string[] };
export type ApiContract = { version: string; fields: ContractField[] };
export type ContractScenario = { id: string; name: string; responseVersion: string; response: Record<string, unknown>; expected: 'PASS' | 'FAIL'; compatibility: 'baseline' | 'compatible' | 'breaking'; rule: string };
export type ContractResult = { id: string; name: string; status: 'PASS' | 'FAIL'; compatibility: string; contractVersion: string; responseVersion: string; field: string; rule: string; expected: string; actual: string; evidence: Record<string, unknown> };

export const targetResponseContract: ApiContract = {
  version: 'target-order-response/1.2',
  fields: [
    { path: 'targetId', type: 'string', required: true },
    { path: 'externalId', type: 'string', required: true },
    { path: 'accepted', type: 'boolean', required: true },
    { path: 'lifecycle', type: 'string', required: true, enum: ['NEW', 'CONFIRMED', 'SHIPPED'] },
    { path: 'diagnosticNote', type: 'string', required: false },
  ],
};

export const contractScenarios: ContractScenario[] = [
  { id: 'CONTRACT-BASELINE', name: 'Baseline contract', responseVersion: 'target-order-response/1.2', response: { targetId: 'TGT-1001', externalId: 'SRC-2026-001', accepted: true, lifecycle: 'CONFIRMED' }, expected: 'PASS', compatibility: 'baseline', rule: 'CONTRACT_REQUIRED_FIELDS' },
  { id: 'CONTRACT-MISSING', name: 'Brak wymaganego pola', responseVersion: 'target-order-response/1.2-bad-missing', response: { externalId: 'SRC-2026-001', accepted: true, lifecycle: 'CONFIRMED' }, expected: 'FAIL', compatibility: 'breaking', rule: 'CONTRACT_REQUIRED_FIELDS' },
  { id: 'CONTRACT-TYPE', name: 'Nieprawidłowy typ pola', responseVersion: 'target-order-response/1.2-bad-type', response: { targetId: 1001, externalId: 'SRC-2026-001', accepted: true, lifecycle: 'CONFIRMED' }, expected: 'FAIL', compatibility: 'breaking', rule: 'CONTRACT_FIELD_TYPE' },
  { id: 'CONTRACT-ENUM', name: 'Nieprawidłowa wartość enum', responseVersion: 'target-order-response/1.2-bad-enum', response: { targetId: 'TGT-1001', externalId: 'SRC-2026-001', accepted: true, lifecycle: 'ARCHIVED' }, expected: 'FAIL', compatibility: 'breaking', rule: 'CONTRACT_ENUM_VALUE' },
  { id: 'CONTRACT-ADDITIVE', name: 'Dodane pole opcjonalne', responseVersion: 'target-order-response/1.3-compatible', response: { targetId: 'TGT-1001', externalId: 'SRC-2026-001', accepted: true, lifecycle: 'CONFIRMED', diagnosticNote: 'optional field', traceId: 'TRACE-1' }, expected: 'PASS', compatibility: 'compatible', rule: 'CONTRACT_ADDITIVE_OPTIONAL' },
  { id: 'CONTRACT-BREAKING', name: 'Zmiana łamiąca kontrakt', responseVersion: 'target-order-response/2.0-breaking', response: { targetId: 'TGT-1001', externalId: 'SRC-2026-001', accepted: 'yes', lifecycle: 'CONFIRMED' }, expected: 'FAIL', compatibility: 'breaking', rule: 'CONTRACT_FIELD_TYPE' },
];

export function validateContractResponse(contract: ApiContract, response: Record<string, unknown>) {
  const errors: Array<{ field: string; rule: string; expected: string; actual: string }> = [];
  for (const field of contract.fields) {
    const actual = response[field.path];
    if (field.required && actual === undefined) { errors.push({ field: field.path, rule: 'CONTRACT_REQUIRED_FIELDS', expected: 'present', actual: 'missing' }); continue; }
    if (actual === undefined) continue;
    if (typeof actual !== field.type) errors.push({ field: field.path, rule: 'CONTRACT_FIELD_TYPE', expected: field.type, actual: typeof actual });
    if (field.enum && typeof actual === 'string' && !field.enum.includes(actual)) errors.push({ field: field.path, rule: 'CONTRACT_ENUM_VALUE', expected: field.enum.join('|'), actual });
  }
  return errors;
}

export function runContractScenario(scenario: ContractScenario): ContractResult {
  const errors = validateContractResponse(targetResponseContract, scenario.response);
  const passed = errors.length === 0;
  const first = errors[0];
  return { id: scenario.id, name: scenario.name, status: passed ? 'PASS' : 'FAIL', compatibility: passed ? scenario.compatibility : 'breaking', contractVersion: targetResponseContract.version, responseVersion: scenario.responseVersion, field: first?.field ?? 'response', rule: first?.rule ?? scenario.rule, expected: first?.expected ?? 'response compatible with contract', actual: first?.actual ?? 'compatible', evidence: { response: scenario.response, errors, additivePolicy: 'Nieznane pola opcjonalne są dozwolone, pola wymagane i typy pozostają zgodne.' } };
}

export function runContractCompatibilityPack() {
  return contractScenarios.map(runContractScenario);
}
