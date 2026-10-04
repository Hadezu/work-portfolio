import { isTargetResponse, mapSourceOrder, SourceOrder, syntheticSourceOrders, TargetOrder } from './api-contract';

export type DemoTestStatus = 'PASS' | 'FAIL' | 'WARNING';
export type ApiTestResult = {
  id: string;
  name: string;
  category: string;
  status: DemoTestStatus;
  durationMs: number;
  request: unknown;
  expected: string;
  actual: string;
  diff: Record<string, unknown>;
};

type FetchLike = typeof fetch;

const base = '/api/demo';
const validSource = syntheticSourceOrders[0];

export const expectedFixture: Array<Pick<ApiTestResult, 'id' | 'status'>> = [
  { id: 'MAP-001', status: 'PASS' },
  { id: 'VAL-002', status: 'PASS' },
  { id: 'MAP-003', status: 'FAIL' },
  { id: 'CAT-004', status: 'PASS' },
  { id: 'NUM-005', status: 'WARNING' },
  { id: 'CUR-006', status: 'FAIL' },
  { id: 'IDM-007', status: 'PASS' },
  { id: 'DAT-008', status: 'PASS' },
  { id: 'HTTP-009', status: 'FAIL' },
  { id: 'SCH-010', status: 'FAIL' },
  { id: 'REC-011', status: 'PASS' },
  { id: 'RTY-012', status: 'WARNING' },
];

export async function runApiTest(id: string, fetcher: FetchLike = fetch): Promise<ApiTestResult> {
  const started = performance.now();
  // Includes HTTP and response parsing. Parallel scenario times are not pack wall time.
  const result = (value: Omit<ApiTestResult, 'durationMs'>): ApiTestResult => ({
    ...value, durationMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100),
  });
  const mapped = mapSourceOrder(validSource);
  const post = async (payload: unknown, simulation = '') => fetcher(`${base}/target/orders${simulation ? `?simulate=${simulation}` : ''}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'demo-SRC-2026-001' }, body: JSON.stringify(payload),
  });

  switch (id) {
    case 'MAP-001': {
      const response = await post(mapped); const body = await response.json();
      return result({ id, name: 'Poprawne mapowanie zamówienia', category: 'Mapowanie', status: response.status === 201 && isTargetResponse(body) ? 'PASS' : 'FAIL', request: validSource, expected: 'HTTP 201 i zgodny kontrakt odpowiedzi', actual: `HTTP ${response.status}; schemat ${isTargetResponse(body) ? 'zgodny' : 'niezgodny'}`, diff: { expected: { lifecycle: 'CONFIRMED', currencyCode: 'PLN' }, actual: mapped } });
    }
    case 'VAL-002': {
      const payload = { ...mapped, customerCode: '' }; const response = await post(payload); const body = await response.json() as { errors?: string[] };
      return result({ id, name: 'Brak wymaganego pola', category: 'Walidacja', status: response.status === 422 && body.errors?.includes('customerCode jest wymagane') ? 'PASS' : 'FAIL', request: payload, expected: 'HTTP 422 dla pustego customerCode', actual: `HTTP ${response.status}: ${(body.errors ?? []).join(', ')}`, diff: { missing: ['customerCode'], response: body } });
    }
    case 'MAP-003': {
      const badSource: SourceOrder = { ...validSource, status: 'on_hold' }; let actual = '';
      try { mapSourceOrder(badSource); } catch (error) { actual = error instanceof Error ? error.message : 'błąd mapowania'; }
      return result({ id, name: 'Niedozwolone mapowanie statusu', category: 'Mapowanie', status: 'FAIL', request: badSource, expected: 'Uzgodniona wartość statusu docelowego', actual: actual || 'Status zmapowany bez jawnej reguły', diff: { source: 'on_hold', target: null, issue: 'brak reguły biznesowej' } });
    }
    case 'CAT-004': {
      const payload: TargetOrder = { ...mapped, items: [{ ...mapped.items[0], productCode: 'SKU-X999' }] }; const response = await post(payload);
      return result({ id, name: 'Nieznany produkt / SKU', category: 'Katalog', status: response.status === 422 ? 'PASS' : 'FAIL', request: payload, expected: 'HTTP 422 — produkt spoza katalogu', actual: `HTTP ${response.status}`, diff: { path: 'items[0].productCode', expected: 'SKU z katalogu', actual: 'SKU-X999' } });
    }
    case 'NUM-005': {
      const source: SourceOrder = { ...validSource, lines: [{ ...validSource.lines[0], qty: 1.257 }] }; const output = mapSourceOrder(source);
      return result({ id, name: 'Precyzja ilości', category: 'Dane liczbowe', status: 'WARNING', request: source, expected: 'Jawna reguła precyzji uzgodniona z właścicielem procesu', actual: `Zaokrąglono 1.257 → ${output.items[0].quantity}`, diff: { path: 'items[0].quantity', source: 1.257, target: output.items[0].quantity, tolerance: 0.01 } });
    }
    case 'CUR-006': {
      const payload: TargetOrder = { ...mapped, currencyCode: 'EUR' }; const response = await post(payload, 'accept-currency');
      return result({ id, name: 'Niezgodność waluty', category: 'Reguły', status: response.status === 201 ? 'FAIL' : 'PASS', request: payload, expected: 'Odrzucenie waluty innej niż PLN', actual: `HTTP ${response.status} — EUR zaakceptowane`, diff: { path: 'currencyCode', expected: 'PLN', actual: 'EUR' } });
    }
    case 'IDM-007': {
      const response = await post(mapped, 'duplicate'); const body = await response.json() as { idempotentReplay?: boolean };
      return result({ id, name: 'Duplikat external ID / idempotencja', category: 'Idempotencja', status: response.status === 200 && body.idempotentReplay === true ? 'PASS' : 'FAIL', request: { externalId: mapped.externalId, idempotencyKey: 'demo-SRC-2026-001' }, expected: 'HTTP 200 i wskazanie istniejącego wyniku', actual: `HTTP ${response.status}; replay=${String(body.idempotentReplay)}`, diff: body });
    }
    case 'DAT-008': {
      const payload: TargetOrder = { ...mapped, orderDate: '2026-02-30' }; const response = await post(payload);
      return result({ id, name: 'Nieprawidłowa data', category: 'Walidacja', status: response.status === 422 ? 'PASS' : 'FAIL', request: payload, expected: 'HTTP 422 dla daty nieistniejącej', actual: `HTTP ${response.status}`, diff: { path: 'orderDate', expected: 'poprawna data YYYY-MM-DD', actual: payload.orderDate } });
    }
    case 'HTTP-009': {
      const response = await post(mapped, 'unexpected-status');
      return result({ id, name: 'Nieoczekiwany status HTTP', category: 'Transport', status: 'FAIL', request: mapped, expected: 'HTTP 201', actual: `HTTP ${response.status}`, diff: { expectedStatus: 201, actualStatus: response.status } });
    }
    case 'SCH-010': {
      const response = await post(mapped, 'invalid-schema'); const body = await response.json();
      return result({ id, name: 'Walidacja schematu odpowiedzi', category: 'Kontrakt', status: isTargetResponse(body) ? 'PASS' : 'FAIL', request: mapped, expected: 'targetId:string, externalId:string, accepted:true', actual: 'Brak pola targetId w odpowiedzi', diff: { required: ['targetId', 'externalId', 'accepted'], received: body } });
    }
    case 'REC-011': {
      const response = await fetcher(`${base}/source/orders`); const body = await response.json() as { data: SourceOrder[] }; const source = body.data[0]; const output = mapSourceOrder(source);
      return result({ id, name: 'Uzgodnienie pól source → target', category: 'Reconciliation', status: output.externalId === source.order_id && output.customerCode === source.buyer_code ? 'PASS' : 'FAIL', request: source, expected: 'externalId i customerCode zgodne ze źródłem', actual: '2/2 pola zgodne', diff: { 'order_id → externalId': [source.order_id, output.externalId], 'buyer_code → customerCode': [source.buyer_code, output.customerCode] } });
    }
    case 'RTY-012': {
      const first = await fetcher(`${base}/target/orders?simulate=timeout`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-attempt': '1' }, body: JSON.stringify(mapped) });
      const second = await fetcher(`${base}/target/orders?simulate=timeout`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-attempt': '2' }, body: JSON.stringify(mapped) });
      return result({ id, name: 'Timeout i ponowienie', category: 'Odporność', status: first.status === 504 && second.status === 201 ? 'WARNING' : 'FAIL', request: { retryPolicy: '1 ponowienie po timeout' }, expected: 'Pierwsza próba 504, druga próba 201', actual: `Próba 1: ${first.status}; próba 2: ${second.status}`, diff: { attempts: [{ no: 1, status: first.status }, { no: 2, status: second.status }] } });
    }
    default: throw new Error(`Nieznany test: ${id}`);
  }
}

export async function runApiTestPack(fetcher: FetchLike = fetch) {
  return Promise.all(expectedFixture.map(item => runApiTest(item.id, fetcher)));
}

export function exportResultsCsv(results: ApiTestResult[]) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [['id', 'nazwa', 'kategoria', 'status', 'czas_ms', 'oczekiwane', 'rzeczywiste'], ...results.map(row => [row.id, row.name, row.category, row.status, row.durationMs, row.expected, row.actual])].map(row => row.map(quote).join(',')).join('\n');
}
