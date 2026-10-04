import { describe, expect, it, vi } from 'vitest';
import { isTargetResponse, mapSourceOrder, runContractCompatibilityPack, syntheticSourceOrders, validateContractResponse, validateTargetOrder, targetResponseContract } from './api-contract';
import { expectedFixture, runApiTest, runApiTestPack, exportResultsCsv } from './api-test-pack';

it('measures completed scenario time and exports the measured value', async () => {
  let now = 100;
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
  try {
    const fetcher = vi.fn(async () => {
      now += 17.25;
      return new Response(JSON.stringify({ targetId: 'TGT-1', externalId: 'SRC-2026-001', accepted: true }), { status: 201 });
    });
    const result = await runApiTest('MAP-001', fetcher);
    expect(result.durationMs).toBe(17.25);
    expect(exportResultsCsv([result])).toContain('"17.25"');
    now = 200;
    expect((await runApiTest('NUM-005', fetcher)).durationMs).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    clock.mockRestore();
  }
});

describe('mapowanie API', () => {
  it('mapuje poprawny rekord source do kontraktu target', () => {
    expect(mapSourceOrder(syntheticSourceOrders[0])).toMatchObject({ externalId: 'SRC-2026-001', customerCode: 'BUYER-PL-01', currencyCode: 'PLN', lifecycle: 'CONFIRMED' });
  });
  it('odrzuca nieuzgodniony status', () => {
    expect(() => mapSourceOrder({ ...syntheticSourceOrders[0], status: 'on_hold' })).toThrow(/Nieobsługiwany status/);
  });
});

describe('walidacja schematu', () => {
  it('akceptuje poprawny payload i odpowiedź', () => {
    const mapped = mapSourceOrder(syntheticSourceOrders[0]);
    expect(validateTargetOrder(mapped)).toEqual([]);
    expect(isTargetResponse({ targetId: 'TGT-1', externalId: mapped.externalId, accepted: true })).toBe(true);
  });
  it('wskazuje brak pola, walutę, datę, SKU i precyzję', () => {
    const invalid = { ...mapSourceOrder(syntheticSourceOrders[0]), customerCode: '', currencyCode: 'EUR', orderDate: '2026-02-30', items: [{ productCode: 'X', quantity: 1.257, unitPrice: 1 }] };
    expect(validateTargetOrder(invalid)).toHaveLength(5);
  });
});

describe('contract-first compatibility testing', () => {
  it('passes the baseline contract and compatible additive response', () => {
    const results = runContractCompatibilityPack();
    expect(results.find(row => row.id === 'CONTRACT-BASELINE')).toMatchObject({ status: 'PASS', contractVersion: 'target-order-response/1.2' });
    expect(results.find(row => row.id === 'CONTRACT-ADDITIVE')).toMatchObject({ status: 'PASS', compatibility: 'compatible' });
  });
  it('detects missing required field, wrong type and invalid enum with exact field evidence', () => {
    const results = runContractCompatibilityPack();
    expect(results.find(row => row.id === 'CONTRACT-MISSING')).toMatchObject({ status: 'FAIL', field: 'targetId', rule: 'CONTRACT_REQUIRED_FIELDS' });
    expect(results.find(row => row.id === 'CONTRACT-TYPE')).toMatchObject({ status: 'FAIL', field: 'targetId', rule: 'CONTRACT_FIELD_TYPE' });
    expect(results.find(row => row.id === 'CONTRACT-ENUM')).toMatchObject({ status: 'FAIL', field: 'lifecycle', rule: 'CONTRACT_ENUM_VALUE' });
  });
  it('classifies required removals or type changes as breaking', () => {
    const breaking = runContractCompatibilityPack().filter(row => row.compatibility === 'breaking');
    expect(breaking.map(row => row.id)).toEqual(['CONTRACT-MISSING', 'CONTRACT-TYPE', 'CONTRACT-ENUM', 'CONTRACT-BREAKING']);
  });
  it('validates a response directly against the visible contract version', () => {
    expect(targetResponseContract.version).toBe('target-order-response/1.2');
    expect(validateContractResponse(targetResponseContract, { targetId: 'TGT-1', externalId: 'SRC-1', accepted: true, lifecycle: 'NEW' })).toEqual([]);
  });
});

describe('deterministyczny fixture testów integracji', () => {
  it('zawiera 12 scenariuszy z zamierzonymi PASS, FAIL i WARNING', () => {
    expect(expectedFixture).toHaveLength(12);
    expect(expectedFixture.filter(x => x.status === 'PASS')).toHaveLength(6);
    expect(expectedFixture.filter(x => x.status === 'FAIL')).toHaveLength(4);
    expect(expectedFixture.filter(x => x.status === 'WARNING')).toHaveLength(2);
  });
  it('wyniki wykonania odpowiadają fixture, mimo zamierzonych FAIL', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const simulation = new URL(url, 'https://demo.local').searchParams.get('simulate');
      if (url.endsWith('/source/orders')) return new Response(JSON.stringify({ data: syntheticSourceOrders }), { status: 200 });
      if (simulation === 'unexpected-status') return new Response('{}', { status: 503 });
      if (simulation === 'invalid-schema') return new Response(JSON.stringify({ externalId: 'SRC-2026-001', accepted: true }), { status: 201 });
      if (simulation === 'duplicate') return new Response(JSON.stringify({ idempotentReplay: true }), { status: 200 });
      if (simulation === 'timeout') return new Response('{}', { status: (init?.headers as Record<string, string>)?.['x-demo-attempt'] === '1' ? 504 : 201 });
      const payload = JSON.parse(String(init?.body)); const errors = validateTargetOrder(payload);
      if (simulation !== 'accept-currency' && errors.length) return new Response(JSON.stringify({ errors }), { status: 422 });
      return new Response(JSON.stringify({ targetId: 'TGT-1', externalId: payload.externalId, accepted: true }), { status: 201 });
    }) as unknown as typeof fetch;
    const results = await runApiTestPack(fetcher);
    expect(results.map(({ id, status }) => ({ id, status }))).toEqual(expectedFixture);
  });
});
