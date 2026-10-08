import { describe, expect, it } from 'vitest';
import { buildInbox, formatInboxPreview, type InboxReplyRow } from './story-inbox';

const ME = '22222222-2222-4222-8222-222222222222';
const ANNA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ILYA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROVIDER = '11111111-1111-4111-8111-111111111111';

function reply(overrides: Partial<InboxReplyRow> & Pick<InboxReplyRow, 'id' | 'authorUserId' | 'createdAt'>): InboxReplyRow {
  const { story, messages, ...rest } = overrides;
  return {
    text: 'Привет',
    authorName: 'Анна Ким',
    authorImageUrl: null,
    authorCityName: 'Москва',
    ...rest,
    story: {
      id: 'story-1',
      text: 'Закат на Исети',
      authorType: 'USER',
      authorUserId: ME,
      authorName: 'Я',
      authorImageUrl: null,
      authorCityName: 'Екатеринбург',
      providerId: null,
      providerName: null,
      providerImageUrl: null,
      providerCityName: null,
      ...story,
    },
    messages: (messages ?? []).map((message) => ({ senderImageUrl: null, ...message })),
  };
}

describe('buildInbox', () => {
  it('собирает ответы одного человека по разным историям в один диалог', () => {
    const result = buildInbox({
      scope: 'user',
      actorUserId: ME,
      providerId: null,
      readAtByCounterpart: new Map(),
      replies: [
        reply({
          id: 'reply-sunset',
          authorUserId: ANNA,
          text: 'Очень красиво! Где это?',
          createdAt: new Date('2026-10-07T13:40:00.000Z'),
          story: {
            id: 'story-sunset',
            text: 'Закат на Исети',
            authorType: 'USER',
            authorUserId: ME,
            authorName: 'Я',
            authorCityName: null,
            providerId: null,
            providerName: null,
            providerCityName: null,
          },
        }),
        reply({
          id: 'reply-coffee',
          authorUserId: ANNA,
          authorImageUrl: 'https://cdn.example/anna.jpg',
          text: 'Хочу туда',
          createdAt: new Date('2026-10-07T14:13:00.000Z'),
          story: {
            id: 'story-coffee',
            text: 'Утренний кофе',
            authorType: 'USER',
            authorUserId: ME,
            authorName: 'Я',
            authorCityName: null,
            providerId: null,
            providerName: null,
            providerCityName: null,
          },
          messages: [
            {
              id: 'msg-cafe',
              text: 'А что за кофейня?',
              createdAt: new Date('2026-10-07T14:12:00.000Z'),
              senderUserId: ME,
              senderImageUrl: 'https://cdn.example/me.jpg',
            },
          ],
        }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: `user:${ANNA}`,
      name: 'Анна Ким',
      imageUrl: 'https://cdn.example/anna.jpg',
      cityName: 'Москва',
      storyTitles: ['Закат на Исети', 'Утренний кофе'],
      preview: 'Хочу туда',
      unreadCount: 2,
      latestReplyId: 'reply-coffee',
    });
    expect(result[0]?.messages.map((message) => message.text)).toEqual([
      'Очень красиво! Где это?',
      'А что за кофейня?',
      'Хочу туда',
    ]);
    expect(result[0]?.messages.map((message) => message.imageUrl)).toEqual([
      null,
      'https://cdn.example/me.jpg',
      'https://cdn.example/anna.jpg',
    ]);
  });

  it('склеивает мой ответ автору и его ответ на мою историю', () => {
    const result = buildInbox({
      scope: 'user',
      actorUserId: ME,
      providerId: null,
      readAtByCounterpart: new Map(),
      replies: [
        reply({
          id: 'their-reply',
          authorUserId: ANNA,
          text: 'Класс',
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
        }),
        reply({
          id: 'my-reply',
          authorUserId: ME,
          authorName: 'Я',
          text: 'Где снимали?',
          createdAt: new Date('2026-10-07T12:00:00.000Z'),
          story: {
            id: 'anna-story',
            text: 'Велопрогулка',
            authorType: 'USER',
            authorUserId: ANNA,
            authorName: 'Анна Ким',
            authorCityName: 'Москва',
            providerId: null,
            providerName: null,
            providerCityName: null,
          },
        }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(`user:${ANNA}`);
    expect(result[0]?.storyTitles).toEqual(['Закат на Исети', 'Велопрогулка']);
    expect(result[0]?.preview).toBe('Вы: Где снимали?');
    expect(result[0]?.unreadCount).toBe(1);
    expect(result[0]?.latestReplyId).toBe('my-reply');
  });

  it('не считает свои сообщения и сообщения коллег непрочитанными', () => {
    const readAt = new Date('2026-10-07T11:00:00.000Z');
    const result = buildInbox({
      scope: 'provider',
      actorUserId: ME,
      providerId: PROVIDER,
      readAtByCounterpart: new Map([[`user:${ANNA}`, readAt]]),
      replies: [
        reply({
          id: 'customer-reply',
          authorUserId: ANNA,
          text: 'Можно записаться?',
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
          story: {
            id: 'provider-story',
            text: 'Велопрогулка',
            authorType: 'PROVIDER',
            authorUserId: ILYA,
            authorName: 'Илья',
            authorCityName: null,
            providerId: PROVIDER,
            providerName: 'Межа',
            providerCityName: 'Екатеринбург',
          },
          messages: [
            {
              id: 'colleague',
              text: 'Да, завтра',
              createdAt: new Date('2026-10-07T12:00:00.000Z'),
              senderUserId: ILYA,
            },
            {
              id: 'customer-again',
              text: 'Скиньте трек',
              createdAt: new Date('2026-10-07T13:00:00.000Z'),
              senderUserId: ANNA,
            },
          ],
        }),
        reply({
          id: 'other-provider',
          authorUserId: ANNA,
          text: 'Чужое',
          createdAt: new Date('2026-10-07T15:00:00.000Z'),
          story: {
            id: 'foreign',
            text: 'Не наша',
            authorType: 'PROVIDER',
            authorUserId: ME,
            authorName: 'Я',
            authorCityName: null,
            providerId: '99999999-9999-4999-8999-999999999999',
            providerName: 'Другие',
            providerCityName: null,
          },
        }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.unreadCount).toBe(1);
    expect(result[0]?.preview).toBe('Скиньте трек');
    expect(result[0]?.messages.find((message) => message.id === 'colleague')?.mine).toBe(true);
  });

  it('продолжает тред, в котором было последнее сообщение', () => {
    const result = buildInbox({
      scope: 'user',
      actorUserId: ME,
      providerId: null,
      readAtByCounterpart: new Map(),
      replies: [
        reply({
          id: 'older-reply',
          authorUserId: ANNA,
          text: 'Первый',
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
          messages: [
            {
              id: 'late',
              text: 'Ещё здесь',
              createdAt: new Date('2026-10-08T10:00:00.000Z'),
              senderUserId: ANNA,
            },
          ],
        }),
        reply({
          id: 'newer-reply',
          authorUserId: ANNA,
          text: 'Второй',
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
        }),
      ],
    });

    expect(result[0]?.latestReplyId).toBe('older-reply');
    expect(result[0]?.preview).toBe('Ещё здесь');
  });

  it('не показывает чужой ответ, в котором я не участвую', () => {
    const result = buildInbox({
      scope: 'user',
      actorUserId: ME,
      providerId: null,
      readAtByCounterpart: new Map(),
      replies: [
        reply({
          id: 'foreign',
          authorUserId: ANNA,
          text: 'Не мне',
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
          story: {
            id: 'ilya-story',
            text: 'Чужая',
            authorType: 'USER',
            authorUserId: ILYA,
            authorName: 'Илья Орлов',
            authorCityName: null,
            providerId: null,
            providerName: null,
            providerCityName: null,
          },
        }),
      ],
    });

    expect(result).toEqual([]);
  });
});

describe('formatInboxPreview', () => {
  it('помечает своё последнее сообщение', () => {
    expect(formatInboxPreview('Спасибо!', true)).toBe('Вы: Спасибо!');
    expect(formatInboxPreview('Спасибо!', false)).toBe('Спасибо!');
  });
});
