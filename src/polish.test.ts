import { expect, test } from 'vitest';
import { counted } from './polish';
test('Polish counts handle singular, plural and teen exceptions', () => {
  const forms = ['błąd', 'błędy', 'błędów'] as const;
  for (const [n, expected] of [[0,'0 błędów'],[1,'1 błąd'],[2,'2 błędy'],[5,'5 błędów'],[12,'12 błędów'],[22,'22 błędy'],[101,'101 błędów'],[112,'112 błędów']] as const) expect(counted(n,forms)).toBe(expected);
  expect(counted(1,['sprawdzenie','sprawdzenia','sprawdzeń'])).toBe('1 sprawdzenie');
});
