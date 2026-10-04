import { describe, expect, test } from 'vitest';
import { apiProofCopy } from './ApiTestsPage';
import { dataQualityCopy } from './DataQualityPage';

type AnyRecord = Record<string, unknown>;
function flatten(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value as AnyRecord).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  return [];
}
function expectComplete(name: string, copy: { pl: unknown; en: unknown }) {
  const pl = new Map(flatten(copy.pl));
  const en = new Map(flatten(copy.en));
  expect(en.size, name).toBe(pl.size);
  for (const [key, plValue] of pl) {
    const enValue = en.get(key);
    expect(enValue, `${name}.${key} missing EN`).toBeTruthy();
    expect(enValue!.trim(), `${name}.${key} empty EN`).not.toBe('');
    if (plValue.length > 8 && /[ąćęłńóśźż]|\b(Przykład|Zakres|Wynik|Uruchom|Pobierz|Scenariusz|Oczekiwane|Rzeczywiste|Raport|reguły|dane|przebieg|referencyj)/i.test(plValue)) expect(enValue, `${name}.${key} falls back to PL`).not.toBe(plValue);
  }
}
describe('source-level proof localization completeness', () => {
  test('API Tests copy has complete PL/EN values', () => expectComplete('api-tests', apiProofCopy));
  test('Data Quality copy has complete PL/EN values', () => expectComplete('data-quality', dataQualityCopy));
});
