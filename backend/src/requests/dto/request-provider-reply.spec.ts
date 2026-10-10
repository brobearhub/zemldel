import { describe, expect, it } from 'vitest';
import {
  pickLatestCustomerMessage,
  pickLatestProviderMessage,
  type CustomerReplyCandidate,
  type ProviderReplyCandidate,
} from './request-provider-reply';

function message(
  overrides: Partial<ProviderReplyCandidate> &
    Pick<ProviderReplyCandidate, 'body' | 'createdAt' | 'senderUserId'>,
): ProviderReplyCandidate {
  return {
    requestId: 'r1',
    customerUserId: 'customer',
    conversationId: 'c1',
    conversationProviderId: 'provider-a',
    requestProviderId: 'provider-a',
    ...overrides,
  };
}

describe('pickLatestProviderMessage', () => {
  it('берёт реплику исполнителя, даже если заказчик написал позже', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'Жду документы',
        createdAt: new Date('2026-10-08T12:00:00.000Z'),
        senderUserId: 'customer',
      }),
      message({
        body: 'Могу выехать завтра',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user',
      }),
    ]);

    expect(picked.get('r1')).toEqual({
      body: 'Могу выехать завтра',
      customerBody: 'Жду документы',
      awaitingProviderReply: true,
    });
  });

  it('среди нескольких диалогов без фиксации берёт самую новую реплику исполнителя', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'Старый ответ',
        createdAt: new Date('2026-10-07T10:00:00.000Z'),
        senderUserId: 'provider-user-a',
        conversationProviderId: 'provider-a',
        requestProviderId: null,
      }),
      message({
        body: 'Свежий ответ',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user-b',
        conversationProviderId: 'provider-b',
        requestProviderId: null,
      }),
    ]);

    expect(picked.get('r1')?.body).toBe('Свежий ответ');
    expect(picked.get('r1')?.customerBody).toBeNull();
    expect(picked.get('r1')?.awaitingProviderReply).toBe(false);
  });

  it('при заданном исполнителе игнорирует более новый ответ другого', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'Чужой ответ',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'provider-user-b',
        conversationProviderId: 'provider-b',
        requestProviderId: 'provider-a',
      }),
      message({
        body: 'Ответ своего',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user-a',
        conversationProviderId: 'provider-a',
        requestProviderId: 'provider-a',
      }),
    ]);

    expect(picked.get('r1')?.body).toBe('Ответ своего');
  });

  it('пропускает пустое тело и схлопывает переносы строк', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: '   \n  ',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'provider-user',
      }),
      message({
        body: 'Первая\nстрока\n\nвторая',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user',
      }),
    ]);

    expect(picked.get('r1')?.body).toBe('Первая строка вторая');
  });

  it('не считает ответом сообщение заказчика в другом диалоге', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'Ответ своего',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user',
        conversationId: 'c-own',
      }),
      message({
        body: 'Это другой чат',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'customer',
        conversationId: 'c-other',
        conversationProviderId: 'provider-b',
      }),
    ]);

    expect(picked.get('r1')).toEqual({
      body: 'Ответ своего',
      customerBody: null,
      awaitingProviderReply: false,
    });
  });

  it('берёт вопрос заказчика из диалога ответа, а не из более нового чужого', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'Ответ своего',
        createdAt: new Date('2026-10-08T11:00:00.000Z'),
        senderUserId: 'provider-user',
        conversationId: 'c-own',
      }),
      message({
        body: 'Свой вопрос',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'customer',
        conversationId: 'c-own',
      }),
      message({
        body: 'Чужой вопрос',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'customer',
        conversationId: 'c-other',
        conversationProviderId: 'provider-b',
      }),
    ]);

    expect(picked.get('r1')).toEqual({
      body: 'Ответ своего',
      customerBody: 'Свой вопрос',
      awaitingProviderReply: false,
    });
  });

  it('обрезает превью до 300 символов', () => {
    const picked = pickLatestProviderMessage([
      message({
        body: 'а'.repeat(340),
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'provider-user',
      }),
    ]);

    expect(picked.get('r1')?.body).toHaveLength(300);
  });
});

function customerMessage(
  overrides: Partial<CustomerReplyCandidate> &
    Pick<CustomerReplyCandidate, 'body' | 'createdAt' | 'senderUserId'>,
): CustomerReplyCandidate {
  return {
    requestId: 'r1',
    conversationId: 'c1',
    customerUserId: 'customer',
    conversationProviderId: 'provider-a',
    actorProviderId: 'provider-a',
    ...overrides,
  };
}

describe('pickLatestCustomerMessage', () => {
  it('берёт реплику заказчика в своём диалоге', () => {
    const picked = pickLatestCustomerMessage([
      customerMessage({
        body: 'Могу завтра',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'provider-user',
        conversationProviderId: 'provider-b',
      }),
      customerMessage({
        body: 'Когда сможете?',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'customer',
      }),
    ]);

    expect(picked.get('r1')).toEqual({
      body: 'Когда сможете?',
      providerBody: null,
      awaitingCustomerReply: false,
      lastMessageAt: new Date('2026-10-08T10:00:00.000Z'),
    });
  });

  it('помечает ожидание, если исполнитель ответил позже', () => {
    const picked = pickLatestCustomerMessage([
      customerMessage({
        body: 'Когда сможете?',
        createdAt: new Date('2026-10-08T10:00:00.000Z'),
        senderUserId: 'customer',
      }),
      customerMessage({
        body: 'Завтра в десять',
        createdAt: new Date('2026-10-08T12:00:00.000Z'),
        senderUserId: 'provider-user',
      }),
    ]);

    expect(picked.get('r1')).toEqual({
      body: 'Когда сможете?',
      providerBody: 'Завтра в десять',
      awaitingCustomerReply: true,
      lastMessageAt: new Date('2026-10-08T12:00:00.000Z'),
    });
  });

  it('игнорирует диалог другого исполнителя', () => {
    const picked = pickLatestCustomerMessage([
      customerMessage({
        body: 'Чужой чат',
        createdAt: new Date('2026-10-09T10:00:00.000Z'),
        senderUserId: 'customer',
        conversationId: 'c-other',
        conversationProviderId: 'provider-b',
      }),
    ]);

    expect(picked.get('r1')).toBeUndefined();
  });
});
