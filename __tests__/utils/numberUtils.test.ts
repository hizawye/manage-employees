import { parseLocalizedDecimal } from '../../src/utils/numberUtils';

describe('parseLocalizedDecimal', () => {
  it.each([
    ['3.5', 3.5], ['٣٫٥', 3.5], [' ۳,۵ ', 3.5], ['.5', 0.5], ['-٢٠,٢٥', -20.25], ['0', 0],
  ])('parses %s as %s', (input, expected) => {
    expect(parseLocalizedDecimal(String(input))).toBe(expected);
  });

  it.each(['', ' ', 'hours', '3hours', '3,5.0', '1٬000', '1e3', 'Infinity', '9'.repeat(310)])(
    'rejects malformed or nonfinite input %s', input => {
      expect(parseLocalizedDecimal(input)).toBeNaN();
    }
  );
});
