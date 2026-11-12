import { describe, expect, it } from 'vitest';
import { messengerEmailHint } from './messenger-email-hint';

describe('messenger account email hints', () => {
  it.each([
    ['brown@gmail.com', 'br***@gmail.com'],
    ['ab@example.com', 'a***@example.com'],
    ['a@example.com', '***@example.com'],
    ['not-an-email', null],
    ['@example.com', null],
  ])('masks %s without exposing the full local part', (email, expected) => {
    expect(messengerEmailHint(email)).toBe(expected);
  });
});
