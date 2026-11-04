import { describe, expect, it } from 'vitest';
import {
  incomingMessageUuid,
  parseMessengerEvent,
  splitMessage,
} from './messenger-events';

describe('messenger input boundaries', () => {
  it('parses Telegram replies and rejects groups, bots and edits', () => {
    const message = {
      message_id: 12,
      date: 123,
      from: { id: 42, first_name: 'Иван' },
      chat: { id: 42, type: 'private' },
      text: 'Ответ',
      reply_to_message: { message_id: 5 },
    };
    expect(parseMessengerEvent('TELEGRAM', { message })).toMatchObject({
      kind: 'message',
      externalUserId: '42',
      replyId: '5',
      timestamp: 123000,
    });
    expect(
      parseMessengerEvent('TELEGRAM', {
        message: { ...message, chat: { id: -1, type: 'group' } },
      }),
    ).toBeNull();
    expect(
      parseMessengerEvent('TELEGRAM', {
        message: { ...message, from: { id: 42, is_bot: true } },
      }),
    ).toBeNull();
    expect(
      parseMessengerEvent('TELEGRAM', { edited_message: message }),
    ).toBeNull();
  });
  it('parses MAX reply context, not forwards', () => {
    const message = {
      sender: { user_id: 42, first_name: 'Иван' },
      recipient: { chat_id: 10, chat_type: 'dialog' },
      body: { mid: 'incoming', text: 'Ответ' },
      timestamp: 123000,
      link: { type: 'reply', message: { mid: 'outgoing' } },
    };
    expect(
      parseMessengerEvent('MAX', { update_type: 'message_created', message }),
    ).toMatchObject({ replyId: 'outgoing', chatId: '10' });
    expect(
      parseMessengerEvent('MAX', {
        update_type: 'message_created',
        message: {
          ...message,
          link: { type: 'forward', message: { mid: 'outgoing' } },
        },
      })?.replyId,
    ).toBeUndefined();
    expect(
      parseMessengerEvent('MAX', {
        update_type: 'message_created',
        message: { ...message, recipient: { chat_id: 10, chat_type: 'chat' } },
      }),
    ).toBeNull();
  });
  it('uses a stable UUID for redelivery without mixing platforms or chats', () => {
    const id = incomingMessageUuid('TELEGRAM', '42', '5');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(incomingMessageUuid('TELEGRAM', '42', '5')).toBe(id);
    expect(incomingMessageUuid('MAX', '42', '5')).not.toBe(id);
    expect(incomingMessageUuid('TELEGRAM', '43', '5')).not.toBe(id);
  });
  it('splits long Unicode text without losing text or breaking surrogate pairs', () => {
    const text = '😀Привет'.repeat(2000);
    const parts = splitMessage(text);
    expect(parts.join('')).toBe(text);
    expect(parts.every((part) => part.length <= 3000)).toBe(true);
  });
});
