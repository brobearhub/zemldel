import { describe, expect, it } from 'vitest';
import {
  isTerminalRequestStatus,
  normalizeCadastralNumberValue,
  normalizeCadastralNumbers,
  parseCadastralNumberIndex,
} from './request-cadastral-number.dto';

describe('request-cadastral-number.dto', () => {
  it('normalizeCadastralNumbers trims, drops empty and dedupes', () => {
    expect(
      normalizeCadastralNumbers([
        ' 50:12:0000000:51755 ',
        '',
        '50:12:0000000:51755',
        '50:12:0000000:51756',
      ]),
    ).toEqual(['50:12:0000000:51755', '50:12:0000000:51756']);
  });

  it('normalizeCadastralNumberValue returns null for blank input', () => {
    expect(normalizeCadastralNumberValue('   ')).toBeNull();
  });

  it('isTerminalRequestStatus detects terminal statuses', () => {
    expect(isTerminalRequestStatus('COMPLETED')).toBe(true);
    expect(isTerminalRequestStatus('NEW')).toBe(false);
  });

  it('parseCadastralNumberIndex accepts non-negative integers only', () => {
    expect(parseCadastralNumberIndex('0')).toBe(0);
    expect(parseCadastralNumberIndex('-1')).toBeNaN();
    expect(parseCadastralNumberIndex('abc')).toBeNaN();
  });
});
