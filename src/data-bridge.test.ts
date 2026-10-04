import { describe, expect, it } from 'vitest';
import { assertNoBridgeSecrets, bridgeExceptionsToCsv, bridgeExecutionReportJson, createBridgeDataset, detectBridgeExceptions, normalizeBridgeData, runBridgeExecution } from './data-bridge';

describe('read-only data bridge', () => {
  it('normalizes the three sources into one deterministic record per order', () => {
    const normalized = normalizeBridgeData(createBridgeDataset());
    expect(normalized).toHaveLength(30);
    expect(normalized[0]).toMatchObject({ orderId: 'ORD-001', inventoryId: 'INV-001', shipmentId: 'SHP-001' });
    expect(normalized.find((item) => item.orderId === 'ORD-012')?.shipmentId).toBeNull();
  });

  it('detects the complete seeded exception fixture', () => {
    const exceptions = detectBridgeExceptions(createBridgeDataset());
    expect(exceptions).toHaveLength(11);
    expect(new Set(exceptions.map((item) => item.type))).toEqual(new Set([
      'Nieaktualny status', 'Brak external ID', 'Brak wysyłki / trackingu', 'Brak wymaganej ilości',
      'Niezgodność statusów', 'Rozbieżność magazynowa', 'Duplikat external ID',
      'Nieprawidłowy rekord', 'Nierozpoznane SKU', 'Opóźniona pozycja',
    ]));
  });

  it('does not report predefined valid rows', () => {
    const exceptions = detectBridgeExceptions(createBridgeDataset());
    expect(exceptions.some((item) => item.recordId.includes('ORD-030'))).toBe(false);
  });

  it('exports exactly the same number of exceptions as the UI model', () => {
    const exceptions = detectBridgeExceptions(createBridgeDataset());
    const csv = bridgeExceptionsToCsv(exceptions);
    expect(csv.split('\r\n')).toHaveLength(exceptions.length + 1);
    expect(csv).toContain('"Duplikat external ID"');
  });

  it('executes paginated baseline import with checkpoint evidence', () => {
    const report = runBridgeExecution('incremental-baseline');
    expect(report.status).toBe('PASS');
    expect(report.summary.inserted).toBe(4);
    expect(report.checkpoint).toBe('2026-09-16T08:15:00Z');
    expect(report.events.filter(event => event.type === 'PAGE_FETCHED')).toHaveLength(2);
  });

  it('advances checkpoint only for new or changed records', () => {
    const report = runBridgeExecution('incremental-new');
    expect(report.summary.inserted).toBe(1);
    expect(report.summary.updated).toBe(1);
    expect(report.target.filter(row => row.source_id === 'SRC-1002')).toHaveLength(1);
    expect(report.checkpoint).toBe('2026-09-16T09:05:00Z');
  });

  it('records interruption and resumes without duplicate business records', () => {
    const interrupted = runBridgeExecution('interrupted');
    const resumed = runBridgeExecution('resume');
    expect(interrupted.status).toBe('INTERRUPTED');
    expect(interrupted.issues[0].replayEligible).toBe(true);
    expect(resumed.status).toBe('PASS');
    expect(new Set(resumed.target.map(row => row.source_id)).size).toBe(resumed.target.length);
  });

  it('keeps exact replay idempotent with zero duplicates', () => {
    const report = runBridgeExecution('replay');
    expect(report.summary.inserted).toBe(0);
    expect(report.summary.updated).toBe(0);
    expect(report.summary.duplicatesPrevented).toBe(2);
  });

  it('shows deterministic 429 bounded retry metadata', () => {
    const report = runBridgeExecution('rate-limit');
    expect(report.attempts).toBe(2);
    expect(report.events.map(event => event.type)).toContain('RATE_LIMITED');
    expect(report.status).toBe('PASS');
  });

  it('handles valid, duplicate, invalid and stale webhooks', () => {
    expect(runBridgeExecution('webhook-valid').status).toBe('PASS');
    expect(runBridgeExecution('webhook-duplicate').duplicatesPrevented).toBe(1);
    expect(runBridgeExecution('webhook-invalid-signature').issues[0].ruleId).toBe('WEBHOOK_SIGNATURE_VALID');
    expect(runBridgeExecution('webhook-stale').issues[0].ruleId).toBe('EVENT_VERSION_NEWER_THAN_TARGET');
  });

  it('repairs rejected webhook and keeps dead-letter evidence inspectable', () => {
    const rejected = runBridgeExecution('webhook-invalid-signature');
    const repaired = runBridgeExecution('webhook-repair');
    expect(rejected.issues[0]).toMatchObject({ category: 'authentication', replayEligible: true, attempts: 1 });
    expect(repaired.status).toBe('PASS');
    expect(repaired.issues).toHaveLength(0);
  });

  it('preserves two append-only snapshots', () => {
    const report = runBridgeExecution('snapshot');
    expect(report.evidence.snapshots).toHaveLength(2);
    expect(report.target).toHaveLength(4);
  });

  it('downloads a current-run JSON report without leaking secrets', () => {
    const report = runBridgeExecution('webhook-invalid-signature');
    const json = bridgeExecutionReportJson(report);
    expect(JSON.parse(json).runId).toBe(report.runId);
    expect(assertNoBridgeSecrets(json)).toBe(true);
  });
});
