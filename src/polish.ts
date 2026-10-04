export function counted(count: number, forms: readonly [string, string, string]): string {
  const last = count % 10, lastTwo = count % 100;
  const form = count === 1 ? forms[0] : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? forms[1] : forms[2];
  return `${count} ${form}`;
}
