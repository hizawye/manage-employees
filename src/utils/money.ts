// Payroll records and displays DZD to the nearest centime. Round each payable
// day once and add integer centimes so a settled balance is exactly zero.
export function toCentimes(amount: number): number {
  const scaled = Math.abs(amount) * 100;
  const rounded = Math.round(scaled + Math.min(scaled * Number.EPSILON, 0.0000001));
  return amount < 0 ? -rounded : rounded;
}

export function isCurrencyAmount(amount: number): boolean {
  const centimes = toCentimes(amount);
  return Number.isSafeInteger(centimes) && centimes / 100 === amount;
}
