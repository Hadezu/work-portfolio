export type OrderRecord = {
  id: string;
  externalId: string;
  sku: string;
  quantity: number;
  createdAt: string;
  status: 'new' | 'processing' | 'shipped' | 'cancelled';
};

export type InventoryRecord = {
  id: string;
  orderId: string;
  sku: string;
  availableQuantity: number;
  allocatedQuantity: number;
};

export type ShipmentRecord = {
  id: string;
  orderId: string;
  trackingNumber: string;
  status: 'new' | 'processing' | 'shipped' | 'delivered';
  updatedAt: string;
};

export type BridgeDataset = {
  orders: OrderRecord[];
  inventory: InventoryRecord[];
  shipments: ShipmentRecord[];
};

export type NormalizedRecord = {
  orderId: string;
  externalId: string;
  sku: string;
  quantity: number;
  orderStatus: string;
  orderDate: string;
  inventoryId: string | null;
  availableQuantity: number | null;
  allocatedQuantity: number | null;
  shipmentId: string | null;
  shipmentStatus: string | null;
  trackingNumber: string | null;
  shipmentUpdatedAt: string | null;
};

export type BridgeException = {
  id: string;
  type: string;
  severity: 'wysoki' | 'średni' | 'niski';
  source: string;
  recordId: string;
  issue: string;
  detectedValue: string;
  recommendedAction: string;
  actionable: boolean;
};

export type BridgeRunMode = 'incremental-baseline' | 'incremental-new' | 'interrupted' | 'resume' | 'replay' | 'rate-limit' | 'webhook-valid' | 'webhook-duplicate' | 'webhook-invalid-signature' | 'webhook-stale' | 'webhook-repair' | 'snapshot';
export type BridgeBusinessRecord = { source_id: string; version: number; updated_at: string; status: string; payload: { amount: number; note: string } };
export type BridgeIssue = { id: string; category: string; ruleId: string; reason: string; expected: string; actual: string; attempts: number; runId: string; timestamp: string; replayEligible: boolean };
export type BridgeEventLog = { type: string; stage: string; entity: string; message: string; attempt?: number; cursor?: string };
export type BridgeExecutionReport = {
  runId: string;
  correlationId: string;
  mode: string;
  status: 'PASS' | 'FAIL' | 'INTERRUPTED' | 'IGNORED';
  startedAt: string;
  durationMs: number;
  input: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  duplicatesPrevented: number;
  checkpoint: string;
  attempts: number;
  contractVersion: string;
  summary: { input: number; inserted: number; updated: number; unchanged: number; rejected: number; duplicatesPrevented: number };
  target: BridgeBusinessRecord[];
  issues: BridgeIssue[];
  events: BridgeEventLog[];
  evidence: Record<string, unknown>;
};

const KNOWN_SKUS = new Set(['SKU-A100', 'SKU-B200', 'SKU-C300', 'SKU-D400']);
const DAY = 86_400_000;

export function createBridgeDataset(reference = false): BridgeDataset {
  const orders: OrderRecord[] = Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    return {
      id: `ORD-${String(number).padStart(3, '0')}`,
      externalId: `EXT-${String(8000 + number)}`,
      sku: ['SKU-A100', 'SKU-B200', 'SKU-C300', 'SKU-D400'][index % 4],
      quantity: (index % 5) + 1,
      createdAt: `2026-09-${String((index % 12) + 1).padStart(2, '0')}`,
      status: 'shipped',
    };
  });
  const inventory: InventoryRecord[] = orders.map((order, index) => ({
    id: `INV-${String(index + 1).padStart(3, '0')}`,
    orderId: order.id,
    sku: order.sku,
    availableQuantity: order.quantity + 10,
    allocatedQuantity: order.quantity,
  }));
  const shipments: ShipmentRecord[] = orders.map((order, index) => ({
    id: `SHP-${String(index + 1).padStart(3, '0')}`,
    orderId: order.id,
    trackingNumber: `TRK-2026-${String(index + 1).padStart(4, '0')}`,
    status: 'shipped',
    updatedAt: '2026-09-15',
  }));

  if(reference)return {orders,inventory,shipments};
  orders[0] = { ...orders[0], status: 'processing', createdAt: '2026-07-01' };
  shipments[0] = { ...shipments[0], status: 'processing', updatedAt: '2026-09-15' };
  orders[1] = { ...orders[1], externalId: '' };
  shipments[2] = { ...shipments[2], trackingNumber: '' };
  orders[3] = { ...orders[3], quantity: 10 };
  inventory[3] = { ...inventory[3], availableQuantity: 5, allocatedQuantity: 10 };
  shipments[4] = { ...shipments[4], status: 'processing' };
  inventory[5] = { ...inventory[5], allocatedQuantity: Math.max(0, orders[5].quantity - 1) };
  orders[6] = { ...orders[6], externalId: 'EXT-DUPLICATE' };
  orders[7] = { ...orders[7], externalId: 'EXT-DUPLICATE' };
  orders[8] = { ...orders[8], quantity: -1 };
  orders[9] = { ...orders[9], sku: 'SKU-UNKNOWN' };
  inventory[9] = { ...inventory[9], sku: 'SKU-UNKNOWN' };
  orders[10] = { ...orders[10], status: 'processing', createdAt: '2026-09-10' };
  shipments[10] = { ...shipments[10], status: 'processing', updatedAt: '2026-08-01' };
  shipments.splice(11, 1);

  return { orders, inventory, shipments };
}

export function normalizeBridgeData(dataset: BridgeDataset): NormalizedRecord[] {
  const inventoryByOrder = new Map(dataset.inventory.map((record) => [record.orderId, record]));
  const shipmentByOrder = new Map(dataset.shipments.map((record) => [record.orderId, record]));
  return dataset.orders.map((order) => {
    const inventory = inventoryByOrder.get(order.id);
    const shipment = shipmentByOrder.get(order.id);
    return {
      orderId: order.id,
      externalId: order.externalId.trim(),
      sku: order.sku.trim().toUpperCase(),
      quantity: Number(order.quantity),
      orderStatus: order.status,
      orderDate: order.createdAt,
      inventoryId: inventory?.id ?? null,
      availableQuantity: inventory?.availableQuantity ?? null,
      allocatedQuantity: inventory?.allocatedQuantity ?? null,
      shipmentId: shipment?.id ?? null,
      shipmentStatus: shipment?.status ?? null,
      trackingNumber: shipment?.trackingNumber.trim() || null,
      shipmentUpdatedAt: shipment?.updatedAt ?? null,
    };
  });
}

function daysBetween(earlier: string, later: string) {
  return (Date.parse(later) - Date.parse(earlier)) / DAY;
}

export function detectBridgeExceptions(dataset: BridgeDataset, asOf = '2026-09-16'): BridgeException[] {
  const normalized = normalizeBridgeData(dataset);
  const result: BridgeException[] = [];
  let sequence = 1;
  const add = (exception: Omit<BridgeException, 'id'>) => result.push({ id: `EX-${String(sequence++).padStart(3, '0')}`, ...exception });

  const duplicateRefs = new Map<string, string[]>();
  normalized.forEach((record) => {
    if (record.externalId) duplicateRefs.set(record.externalId, [...(duplicateRefs.get(record.externalId) ?? []), record.orderId]);
  });

  normalized.forEach((record) => {
    if (!record.externalId) add({ type: 'Brak external ID', severity: 'wysoki', source: 'zamówienia', recordId: record.orderId, issue: 'Rekord nie ma identyfikatora do połączenia z systemem docelowym.', detectedValue: 'externalId: pusty', recommendedAction: 'Uzupełnić identyfikator albo wykluczyć rekord z synchronizacji.', actionable: true });
    if (!Number.isFinite(record.quantity) || record.quantity <= 0 || Number.isNaN(Date.parse(record.orderDate))) add({ type: 'Nieprawidłowy rekord', severity: 'wysoki', source: 'zamówienia', recordId: record.orderId, issue: 'Rekord nie spełnia minimalnego kontraktu danych.', detectedValue: `ilość: ${record.quantity}, data: ${record.orderDate}`, recommendedAction: 'Poprawić rekord w źródle przed dalszym przetwarzaniem.', actionable: true });
    if (!KNOWN_SKUS.has(record.sku)) add({ type: 'Nierozpoznane SKU', severity: 'wysoki', source: 'zamówienia / magazyn', recordId: record.orderId, issue: 'SKU nie występuje w demonstracyjnym katalogu produktów.', detectedValue: record.sku, recommendedAction: 'Zweryfikować mapowanie SKU lub dodać pozycję do uzgodnionego katalogu.', actionable: true });
    if (record.orderStatus === 'processing' && daysBetween(record.orderDate, asOf) > 30) add({ type: 'Nieaktualny status', severity: 'średni', source: 'zamówienia', recordId: record.orderId, issue: 'Zamówienie pozostaje w statusie processing dłużej niż 30 dni.', detectedValue: `${record.orderStatus} od ${record.orderDate}`, recommendedAction: 'Potwierdzić bieżący stan z właścicielem procesu.', actionable: true });
    if (!record.shipmentId || !record.trackingNumber) add({ type: 'Brak wysyłki / trackingu', severity: 'wysoki', source: 'wysyłki', recordId: record.orderId, issue: record.shipmentId ? 'Wysyłka nie ma numeru śledzenia.' : 'Nie znaleziono rekordu wysyłki dla zamówienia.', detectedValue: record.shipmentId ? 'trackingNumber: pusty' : 'shipment: brak', recommendedAction: 'Sprawdzić utworzenie wysyłki i uzupełnić numer śledzenia.', actionable: true });
    if (record.availableQuantity !== null && record.availableQuantity < record.quantity) add({ type: 'Brak wymaganej ilości', severity: 'wysoki', source: 'magazyn', recordId: record.orderId, issue: 'Dostępny stan nie pokrywa ilości wymaganej przez zamówienie.', detectedValue: `wymagane ${record.quantity}, dostępne ${record.availableQuantity}`, recommendedAction: 'Zweryfikować rezerwację lub termin uzupełnienia stanu.', actionable: true });
    if (record.quantity > 0 && record.allocatedQuantity !== null && record.allocatedQuantity !== record.quantity) add({ type: 'Rozbieżność magazynowa', severity: 'średni', source: 'zamówienia / magazyn', recordId: record.orderId, issue: 'Ilość zaalokowana w magazynie różni się od ilości zamówionej.', detectedValue: `zamówienie ${record.quantity}, alokacja ${record.allocatedQuantity}`, recommendedAction: 'Porównać rezerwację magazynową z pozycją zamówienia.', actionable: true });
    if (record.shipmentStatus && record.orderStatus === 'shipped' && !['shipped', 'delivered'].includes(record.shipmentStatus)) add({ type: 'Niezgodność statusów', severity: 'wysoki', source: 'zamówienia / wysyłki', recordId: record.orderId, issue: 'Status zamówienia wskazuje wysyłkę, ale rekord przesyłki tego nie potwierdza.', detectedValue: `order: ${record.orderStatus}, shipment: ${record.shipmentStatus}`, recommendedAction: 'Zweryfikować mapowanie statusu i kolejność aktualizacji.', actionable: true });
    if (record.shipmentStatus === 'processing' && record.shipmentUpdatedAt && daysBetween(record.shipmentUpdatedAt, asOf) > 14) add({ type: 'Opóźniona pozycja', severity: 'średni', source: 'wysyłki', recordId: record.orderId, issue: 'Wysyłka nie była aktualizowana od ponad 14 dni.', detectedValue: `ostatnia aktualizacja: ${record.shipmentUpdatedAt}`, recommendedAction: 'Przekazać pozycję do ręcznej weryfikacji u operatora wysyłki.', actionable: true });
  });

  [...duplicateRefs.entries()].filter(([, ids]) => ids.length > 1).forEach(([externalId, ids]) => add({ type: 'Duplikat external ID', severity: 'wysoki', source: 'zamówienia', recordId: ids.join(', '), issue: 'Ten sam identyfikator zewnętrzny wskazuje więcej niż jedno zamówienie.', detectedValue: externalId, recommendedAction: 'Zatrzymać synchronizację i wskazać rekord nadrzędny.', actionable: true }));

  return result;
}

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

export function bridgeExceptionsToCsv(exceptions: BridgeException[]) {
  const header = ['ID', 'Ważność', 'Źródło', 'Rekord', 'Typ', 'Problem', 'Wykryta wartość', 'Zalecane działanie'];
  return [header, ...exceptions.map((item) => [item.id, item.severity, item.source, item.recordId, item.type, item.issue, item.detectedValue, item.recommendedAction])]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}

const CLOCK = '2026-09-16T12:00:00.000Z';
const CONTRACT_VERSION = 'data-bridge-contract/1.1';
const SECRET = ['demo', 'webhook', 'secret', 'never', 'log'].join('-');
const REDACTED = 'demo-webhook-secr…redacted';
const baseTarget: BridgeBusinessRecord[] = [
  { source_id: 'SRC-1001', version: 1, updated_at: '2026-09-16T08:00:00Z', status: 'active', payload: { amount: 120, note: 'baseline' } },
  { source_id: 'SRC-1002', version: 1, updated_at: '2026-09-16T08:05:00Z', status: 'active', payload: { amount: 80, note: 'baseline' } },
];
const pageOne: BridgeBusinessRecord[] = [...baseTarget];
const pageTwo: BridgeBusinessRecord[] = [
  { source_id: 'SRC-1003', version: 1, updated_at: '2026-09-16T08:10:00Z', status: 'active', payload: { amount: 44, note: 'page-2' } },
  { source_id: 'SRC-1004', version: 1, updated_at: '2026-09-16T08:15:00Z', status: 'active', payload: { amount: 68, note: 'page-2' } },
];
const newPage: BridgeBusinessRecord[] = [
  { source_id: 'SRC-1005', version: 1, updated_at: '2026-09-16T09:00:00Z', status: 'active', payload: { amount: 95, note: 'after checkpoint' } },
  { source_id: 'SRC-1002', version: 2, updated_at: '2026-09-16T09:05:00Z', status: 'paused', payload: { amount: 80, note: 'status update' } },
];

const cloneRecords = (rows: BridgeBusinessRecord[]) => rows.map(row => ({ ...row, payload: { ...row.payload } }));
const after = (rows: BridgeBusinessRecord[], checkpoint: string) => rows.filter(row => row.updated_at > checkpoint);
const sameBusiness = (a: BridgeBusinessRecord, b: BridgeBusinessRecord) => a.version === b.version && a.status === b.status && a.updated_at === b.updated_at && JSON.stringify(a.payload) === JSON.stringify(b.payload);
const reportName = (mode: BridgeRunMode) => `RUN-DB-${mode.toUpperCase().replaceAll('-', '_')}`;
const redacted = (value: string) => value === SECRET ? REDACTED : value.replace(/(.{8}).+/, '$1…redacted');

function upsert(target: Map<string, BridgeBusinessRecord>, record: BridgeBusinessRecord) {
  const current = target.get(record.source_id);
  if (!current) { target.set(record.source_id, { ...record, payload: { ...record.payload } }); return 'inserted'; }
  if (sameBusiness(current, record)) return 'unchanged';
  target.set(record.source_id, { ...record, payload: { ...record.payload } }); return 'updated';
}

function buildReport(mode: BridgeRunMode, target: BridgeBusinessRecord[], events: BridgeEventLog[], issues: BridgeIssue[], counts: Partial<BridgeExecutionReport>, evidence: Record<string, unknown>): BridgeExecutionReport {
  const input = counts.input ?? 0, inserted = counts.inserted ?? 0, updated = counts.updated ?? 0, unchanged = counts.unchanged ?? 0, rejected = counts.rejected ?? issues.length, duplicatesPrevented = counts.duplicatesPrevented ?? 0;
  return { runId: reportName(mode), correlationId: `CORR-${reportName(mode)}`, mode, status: counts.status ?? (issues.length ? 'FAIL' : 'PASS'), startedAt: CLOCK, durationMs: counts.durationMs ?? 24, input, inserted, updated, unchanged, rejected, duplicatesPrevented, checkpoint: String(counts.checkpoint ?? '2026-09-16T08:15:00Z'), attempts: counts.attempts ?? 1, contractVersion: CONTRACT_VERSION, summary: { input, inserted, updated, unchanged, rejected, duplicatesPrevented }, target: cloneRecords(target), issues, events, evidence };
}

export function runBridgeExecution(mode: BridgeRunMode): BridgeExecutionReport {
  const target = new Map<string, BridgeBusinessRecord>(); const events: BridgeEventLog[] = [{ type: 'RUN_STARTED', stage: 'start', entity: 'run', message: 'Uruchomiono deterministyczny przebieg.' }];
  const issue = (id: string, category: string, ruleId: string, reason: string, expected: string, actual: string, attempts = 1, replayEligible = true): BridgeIssue => ({ id, category, ruleId, reason, expected, actual, attempts, runId: reportName(mode), timestamp: CLOCK, replayEligible });
  const commitPages = (pages: BridgeBusinessRecord[][], checkpoint = '') => {
    let inserted = 0, updated = 0, unchanged = 0, duplicatesPrevented = 0, last = checkpoint;
    for (const [index, page] of pages.entries()) {
      events.push({ type: 'PAGE_FETCHED', stage: 'poll', entity: `page-${index + 1}`, message: `${page.length} rekordy`, cursor: `cursor-${index + 1}` });
      for (const record of after(page, checkpoint)) {
        const result = upsert(target, record); if (result === 'inserted') inserted++; if (result === 'updated') updated++; if (result === 'unchanged') { unchanged++; duplicatesPrevented++; }
        events.push({ type: result === 'inserted' ? 'RECORD_INSERTED' : result === 'updated' ? 'RECORD_UPDATED' : 'DUPLICATE_IGNORED', stage: 'apply', entity: record.source_id, message: `wersja ${record.version}` });
        last = record.updated_at > last ? record.updated_at : last;
      }
      events.push({ type: 'CHECKPOINT_SAVED', stage: 'checkpoint', entity: 'cursor', message: last, cursor: last });
    }
    return { inserted, updated, unchanged, duplicatesPrevented, checkpoint: last };
  };

  if (mode === 'incremental-baseline') {
    const counts = commitPages([pageOne, pageTwo]);
    events.push({ type: 'RUN_COMPLETED', stage: 'complete', entity: 'run', message: 'Baseline import zakończony.' });
    return buildReport(mode, [...target.values()], events, [], { input: 4, ...counts }, { checkpointRule: 'Checkpoint zapisujemy po zakończonej stronie. Rekordy stosujemy idempotentnym upsert po source_id.' });
  }
  if (mode === 'incremental-new' || mode === 'replay') {
    commitPages([pageOne, pageTwo]); const before = [...target.values()];
    const counts = mode === 'replay' ? commitPages([pageTwo]) : commitPages([newPage], '2026-09-16T08:15:00Z');
    events.push({ type: 'RUN_COMPLETED', stage: 'complete', entity: 'run', message: mode === 'replay' ? 'Powtórzony batch nie zmienił stanu biznesowego.' : 'Przetworzono tylko dane po checkpoint.' });
    return buildReport(mode, [...target.values()], events, [], { input: mode === 'replay' ? 2 : 2, ...counts }, { before, after: [...target.values()], checkpointRule: 'Filtr updated_at > ostatni zapisany checkpoint; source_id pozostaje kluczem biznesowym.' });
  }
  if (mode === 'interrupted') {
    const counts = commitPages([pageOne]);
    const issues = [issue('DLQ-DB-INTERRUPT', 'transport', 'PAGE_FETCH_COMPLETED_BEFORE_CHECKPOINT', 'Przerwano po pierwszej poprawnie zapisanej stronie.', 'kolejna strona dostępna', 'symulowany błąd po page-1')];
    events.push({ type: 'EVENT_REJECTED', stage: 'page-2', entity: 'cursor-2', message: 'Symulowana przerwa po pierwszym batchu.' });
    return buildReport(mode, [...target.values()], events, issues, { input: 2, ...counts, status: 'INTERRUPTED', checkpoint: counts.checkpoint }, { stoppedAt: 'page-2', lastValidCheckpoint: counts.checkpoint });
  }
  if (mode === 'resume') {
    commitPages([pageOne]); const counts = commitPages([pageTwo], '2026-09-16T08:05:00Z');
    events.push({ type: 'RUN_COMPLETED', stage: 'complete', entity: 'run', message: 'Resume od ostatniego poprawnego checkpoint bez duplikatów.' });
    return buildReport(mode, [...target.values()], events, [], { input: 2, ...counts }, { resumeFrom: '2026-09-16T08:05:00Z', cleanCompleteCount: 4 });
  }
  if (mode === 'rate-limit') {
    const attempts = [{ attempt: 1, status: 429, decision: 'retry', backoffMs: 250 }, { attempt: 2, status: 201, decision: 'accept', backoffMs: 0 }];
    attempts.forEach(a => events.push({ type: a.status === 429 ? 'RATE_LIMITED' : 'RUN_COMPLETED', stage: 'target-write', entity: 'SRC-1005', attempt: a.attempt, message: `${a.status}; ${a.decision}; backoff=${a.backoffMs}` }));
    return buildReport(mode, [newPage[0]], events, [], { input: 1, inserted: 1, attempts: 2, checkpoint: newPage[0].updated_at }, { retryPolicy: 'maksymalnie 2 próby, deterministyczne metadane backoff, bez rzeczywistego czekania', attempts });
  }

  const existing = new Map<string, BridgeBusinessRecord>([[baseTarget[0].source_id, { ...baseTarget[0], version: 5, status: 'active', updated_at: '2026-09-16T10:00:00Z', payload: { amount: 120, note: 'current version' } }]]);
  const eventRecord = { source_id: 'SRC-2001', version: 1, updated_at: '2026-09-16T10:10:00Z', status: 'active', payload: { amount: 33, note: 'webhook' } };
  const signature = 'sha256=fake-valid-demo-signature';
  if (mode.startsWith('webhook')) {
    const logs = events;
    const applyEvent = (id: string, valid: boolean, record: BridgeBusinessRecord, duplicate = false) => {
      logs.push({ type: 'PAGE_FETCHED', stage: 'webhook-received', entity: id, message: 'event_id przyjęty do walidacji' });
      if (!valid) return { accepted: false, reason: 'invalid signature' };
      if (duplicate) return { accepted: false, duplicate: true, reason: 'duplicate event_id' };
      const current = existing.get(record.source_id);
      if (current && record.version <= current.version) return { accepted: false, stale: true, reason: `version ${record.version} <= current ${current.version}` };
      existing.set(record.source_id, record); return { accepted: true };
    };
    const duplicate = mode === 'webhook-duplicate';
    const invalid = mode === 'webhook-invalid-signature';
    const stale = mode === 'webhook-stale';
    const repaired = mode === 'webhook-repair';
    const record = stale ? { ...existing.get('SRC-1001')!, version: 4, status: 'cancelled' } : eventRecord;
    const decision = applyEvent(repaired ? 'EVT-REPAIRED-1' : 'EVT-2001', !invalid, record, duplicate);
    const issues = decision.accepted || decision.duplicate ? [] : [issue(invalid ? 'DLQ-WEBHOOK-SIG' : 'DLQ-WEBHOOK-STALE', invalid ? 'authentication' : 'ordering', invalid ? 'WEBHOOK_SIGNATURE_VALID' : 'EVENT_VERSION_NEWER_THAN_TARGET', invalid ? 'Podpis odrzucony przed mutacją danych.' : 'Starsze zdarzenie nie może nadpisać nowszego stanu.', invalid ? 'valid signature' : 'incoming version > target version', invalid ? redacted(SECRET) : 'version 4 <= 5', 1, invalid)];
    logs.push({ type: decision.accepted ? 'RECORD_INSERTED' : decision.duplicate ? 'DUPLICATE_IGNORED' : 'EVENT_REJECTED', stage: 'webhook-apply', entity: record.source_id, message: decision.reason ?? 'event applied once' });
    return buildReport(mode, [...existing.values()], logs, issues, { input: 1, inserted: decision.accepted && !existing.has(baseTarget[0].source_id) ? 1 : decision.accepted ? 1 : 0, rejected: issues.length, duplicatesPrevented: duplicate ? 1 : 0, unchanged: duplicate || stale ? 1 : 0, status: duplicate ? 'IGNORED' : issues.length ? 'FAIL' : 'PASS' }, { signature: invalid ? redacted(SECRET) : signature, versionRule: 'Zdarzenie może zmienić encję tylko wtedy, gdy incoming.version > current.version.', repair: repaired ? 'payload corrected and signed again' : null });
  }
  const firstSnapshot = cloneRecords(baseTarget).map(row => ({ ...row, updated_at: '2026-09-16T11:00:00Z' }));
  const secondSnapshot = cloneRecords(newPage).map(row => ({ ...row, updated_at: '2026-09-16T11:30:00Z' }));
  events.push({ type: 'RUN_COMPLETED', stage: 'snapshot', entity: 'snapshot-1', message: 'snapshot 1 preserved' }, { type: 'RUN_COMPLETED', stage: 'snapshot', entity: 'snapshot-2', message: 'snapshot 2 appended' });
  return buildReport('snapshot', [...firstSnapshot, ...secondSnapshot], events, [], { input: 4, inserted: 4, checkpoint: 'snapshot-2026-09-16T11:30:00Z' }, { snapshots: [{ id: 'SNAP-001', records: 2, timestamp: '2026-09-16T11:00:00Z' }, { id: 'SNAP-002', records: 2, timestamp: '2026-09-16T11:30:00Z' }], policy: 'Tryb snapshot dopisuje wersje historyczne, nie nadpisuje poprzedniej wartości.' });
}

export function bridgeExecutionReportJson(report: BridgeExecutionReport) {
  return JSON.stringify({
    runId: report.runId, mode: report.mode, status: report.status, contractVersion: report.contractVersion, checkpoint: report.checkpoint,
    summary: report.summary, issues: report.issues, events: report.events.slice(0, 20),
  }, null, 2);
}

export function assertNoBridgeSecrets(value: unknown) {
  return !JSON.stringify(value).includes(SECRET);
}
