export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15));
}

/** Parse an ungrouped decimal typed with an English, French, or Arabic keyboard. */
export function parseLocalizedDecimal(value: string): number {
  const normalized = normalizeDigits(value.trim())
    .replace(/[,٫]/g, '.');

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}
