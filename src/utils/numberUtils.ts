/** Parse an ungrouped decimal typed with an English, French, or Arabic keyboard. */
export function parseLocalizedDecimal(value: string): number {
  const normalized = value.trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[,٫]/g, '.');

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}
