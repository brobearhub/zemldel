import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StoriesService } from './stories.service';

const USER_ID = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';
const CITY_ID = '55555555-5555-4555-8555-555555555555';

function makeService(prisma: object, s3: object = {}) {
  return new StoriesService(prisma as never, s3 as never);
}

function storyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'story-1',
    authorType: 'USER',
    authorUserId: USER_ID,
    providerId: null,
    cityId: CITY_ID,
    text: 'Привет',
    imageUrl: null,
    durationDays: 1,
    publishedAt: new Date('2026-10-06T10:00:00.000Z'),
    expiresAt: new Date('2027-10-07T10:00:00.000Z'),
    authorUser: { name: 'Анна Кузнецова', image: null },
    provider: null,
    ...overrides,
  };
}

describe('StoriesService.listPublic', () => {
  it('без города отдаёт только неистёкшие по дате', async () => {
    const prisma = {
      story: {
        findMany: vi.fn().mockResolvedValue([storyRow()]),
      },
    };

    const result = await makeService(prisma).listPublic();

    expect(prisma.story.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { withdrawnAt: null, expiresAt: { gt: expect.any(Date) } },
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.authorName).toBe('Анна Кузнецова');
    expect(result.items[0]?.authorHref).toBeNull();
  });

  it('с городом ставит городские сторис первыми', async () => {
    const prisma = {
      story: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([storyRow({ id: 'city-old' })])
          .mockResolvedValueOnce([
            storyRow({
              id: 'other-new',
              cityId: null,
              authorType: 'PROVIDER',
              providerId: PROVIDER_ID,
              provider: { name: 'Межа', slug: 'mezha', image: null },
              authorUser: { name: 'Иван', image: null },
            }),
          ]),
      },
    };

    const result = await makeService(prisma).listPublic(CITY_ID);

    expect(result.items.map((item) => item.id)).toEqual(['city-old', 'other-new']);
    expect(result.items[1]?.authorName).toBe('Межа');
    expect(result.items[1]?.authorHref).toBe('/providers/mezha');
  });

  it('по providerId отдаёт только сторис этого провайдера в показе', async () => {
    const prisma = {
      story: {
        findMany: vi.fn().mockResolvedValue([
          storyRow({
            id: 'provider-story',
            authorType: 'PROVIDER',
            providerId: PROVIDER_ID,
            provider: { name: 'Межа', slug: 'mezha', image: null },
          }),
        ]),
      },
    };

    const result = await makeService(prisma).listPublic(CITY_ID, null, PROVIDER_ID);

    expect(prisma.story.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          withdrawnAt: null,
          expiresAt: { gt: expect.any(Date) },
          authorType: 'PROVIDER',
          providerId: PROVIDER_ID,
        },
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
    );
    expect(result.items.map((item) => item.id)).toEqual(['provider-story']);
  });

  it('невалидный providerId даёт пустой список и не ходит в базу', async () => {
    const prisma = { story: { findMany: vi.fn() } };

    const result = await makeService(prisma).listPublic(null, null, 'not-a-uuid');

    expect(result.items).toEqual([]);
    expect(prisma.story.findMany).not.toHaveBeenCalled();
  });
});

describe('StoriesService.create', () => {
  it('публикует пользовательскую сторис с городом заказчика', async () => {
    const created = storyRow();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: USER_ID,
          name: 'Анна Кузнецова',
          image: null,
          customerCityId: CITY_ID,
          activeProviderId: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      story: { create: vi.fn().mockResolvedValue(created) },
    };

    const dto = await makeService(prisma).create({
      actorUserId: USER_ID,
      scope: 'user',
      text: '  Привет  ',
      durationDays: 1,
    });

    expect(prisma.story.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorType: 'USER',
          authorUserId: USER_ID,
          providerId: null,
          cityId: CITY_ID,
          text: 'Привет',
          durationDays: 1,
        }),
      }),
    );
    expect(dto.expired).toBe(false);
  });

  it('провайдерская сторис берёт активный provider, а не клиентский id', async () => {
    const created = storyRow({
      authorType: 'PROVIDER',
      providerId: PROVIDER_ID,
      cityId: CITY_ID,
      provider: { name: 'Межа', slug: 'mezha', image: 'https://cdn/p.png' },
    });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: USER_ID,
          name: 'Анна',
          image: null,
          customerCityId: null,
          activeProviderId: PROVIDER_ID,
        }),
      },
      providerMember: {
        findFirst: vi.fn().mockResolvedValue({
          providerId: PROVIDER_ID,
          role: 'OWNER',
          provider: { id: PROVIDER_ID, name: 'Межа', slug: 'mezha', image: 'https://cdn/p.png', cityId: CITY_ID },
        }),
      },
      story: { create: vi.fn().mockResolvedValue(created) },
    };

    await makeService(prisma).create({
      actorUserId: USER_ID,
      scope: 'provider',
      text: 'Услуга готова',
      durationDays: 3,
    });

    expect(prisma.story.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorType: 'PROVIDER',
          providerId: PROVIDER_ID,
          cityId: CITY_ID,
        }),
      }),
    );
  });

  it('отклоняет пустой текст', async () => {
    await expect(
      makeService({}).create({
        actorUserId: USER_ID,
        scope: 'user',
        text: '   ',
        durationDays: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('запрещает публикацию от провайдера без membership', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: USER_ID,
          name: 'Анна',
          image: null,
          customerCityId: CITY_ID,
          activeProviderId: PROVIDER_ID,
        }),
      },
      providerMember: { findFirst: vi.fn().mockResolvedValue(null) },
    };

    await expect(
      makeService(prisma).create({
        actorUserId: USER_ID,
        scope: 'provider',
        text: 'Привет',
        durationDays: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('StoriesService.recordView', () => {
  it('не пишет просмотр, если сторис смотрит её автор', async () => {
    const prisma = {
      story: { findUnique: vi.fn().mockResolvedValue(storyRow()) },
      storyViewEvent: { create: vi.fn() },
    };

    const result = await makeService(prisma).recordView({ storyId: 'story-1', actorUserId: USER_ID });

    expect(result.counted).toBe(false);
    expect(prisma.storyViewEvent.create).not.toHaveBeenCalled();
  });
});

describe('StoriesService.remove', () => {
  it('запрещает удалять чужую пользовательскую сторис', async () => {
    const prisma = {
      story: { findUnique: vi.fn().mockResolvedValue(storyRow()) },
    };

    await expect(
      makeService(prisma).remove({ actorUserId: '99999999-9999-4999-8999-999999999999', storyId: 'story-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('StoriesService.replyMessages', () => {
  const REPLY_AUTHOR = '33333333-3333-4333-8333-333333333333';
  const STRANGER = '44444444-4444-4444-8444-444444444444';

  function replyRow() {
    return {
      id: 'reply-1',
      storyId: 'story-1',
      authorUserId: REPLY_AUTHOR,
      text: 'Очень красиво',
      createdAt: new Date('2026-10-07T09:00:00.000Z'),
    };
  }

  it('автор пишет в тред и не создаёт новый StoryReply', async () => {
    const prisma = {
      story: { findUnique: vi.fn().mockResolvedValue(storyRow()) },
      storyReply: { findFirst: vi.fn().mockResolvedValue(replyRow()), create: vi.fn() },
      storyReplyMessage: {
        create: vi.fn().mockResolvedValue({
          id: 'msg-1',
          senderUserId: USER_ID,
          text: 'Спасибо',
          createdAt: new Date('2026-10-07T12:00:00.000Z'),
        }),
      },
    };

    const result = await makeService(prisma).sendReplyMessage({
      storyId: 'story-1',
      replyId: 'reply-1',
      actorUserId: USER_ID,
      text: '  Спасибо  ',
    });

    expect(result).toMatchObject({ id: 'msg-1', text: 'Спасибо', mine: true });
    expect(prisma.storyReply.create).not.toHaveBeenCalled();
    expect(prisma.storyReplyMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storyReplyId: 'reply-1',
          senderUserId: USER_ID,
          text: 'Спасибо',
        }),
      }),
    );
  });

  it('посторонний не может писать в тред', async () => {
    const prisma = {
      story: { findUnique: vi.fn().mockResolvedValue(storyRow()) },
      storyReply: { findFirst: vi.fn().mockResolvedValue(replyRow()) },
      storyReplyMessage: { create: vi.fn() },
    };

    await expect(
      makeService(prisma).sendReplyMessage({
        storyId: 'story-1',
        replyId: 'reply-1',
        actorUserId: STRANGER,
        text: 'нет',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.storyReplyMessage.create).not.toHaveBeenCalled();
  });
});

describe('StoriesService.listAudience', () => {
  it('считает ответы только по своим сторис', async () => {
    const prisma = {
      storyAuthorFollow: { findMany: vi.fn().mockResolvedValue([]) },
      storyAuthorUnfollow: { findMany: vi.fn().mockResolvedValue([]) },
      storyReply: { count: vi.fn().mockResolvedValue(4) },
    };

    const result = await makeService(prisma).listAudience({ actorUserId: USER_ID, scope: 'user' });

    expect(prisma.storyReply.count).toHaveBeenCalledWith({
      where: { story: { authorType: 'USER', authorUserId: USER_ID } },
    });
    expect(result.replyCount).toBe(4);
  });
});

describe('StoriesService.conversations', () => {
  const ANNA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  function storyOf(id: string, text: string) {
    return {
      id,
      text,
      authorType: 'USER' as const,
      authorUserId: USER_ID,
      providerId: null,
      authorUser: { name: 'Я', image: null, customerCity: null },
      provider: null,
    };
  }

  function inboxPrisma(rows: unknown[]) {
    return {
      storyReply: { findMany: vi.fn().mockResolvedValue(rows) },
      user: { findUnique: vi.fn().mockResolvedValue({ image: 'https://cdn.example/me.jpg' }) },
      storyConversationRead: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      storyReplyMessage: {
        create: vi.fn().mockResolvedValue({
          id: 'created',
          text: 'Ответ',
          createdAt: new Date('2026-10-07T15:00:00.000Z'),
        }),
      },
    };
  }

  it('чужой диалог не открывается и не отмечается прочитанным', async () => {
    const prisma = inboxPrisma([]);

    await expect(
      makeService(prisma).listConversationMessages({
        actorUserId: USER_ID,
        scope: 'user',
        conversationId: `user:${ANNA}`,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.storyConversationRead.upsert).not.toHaveBeenCalled();
  });

  it('открытие треда отмечает прочитанным, отправка идёт в последний ответ', async () => {
    const prisma = inboxPrisma([
      {
        id: 'reply-1',
        text: 'Где это?',
        createdAt: new Date('2026-10-07T13:40:00.000Z'),
        authorType: 'USER' as const,
        authorUserId: ANNA,
        providerId: null,
        author: { name: 'Анна Ким', image: null, customerCity: { name: 'Москва' } },
        provider: null,
        messages: [],
        story: storyOf('story-1', 'Закат'),
      },
      {
        id: 'reply-2',
        text: 'Хочу туда',
        createdAt: new Date('2026-10-07T14:00:00.000Z'),
        authorType: 'USER' as const,
        authorUserId: ANNA,
        providerId: null,
        author: { name: 'Анна Ким', image: null, customerCity: { name: 'Москва' } },
        provider: null,
        messages: [],
        story: storyOf('story-2', 'Кофе'),
      },
    ]);

    const messages = await makeService(prisma).listConversationMessages({
      actorUserId: USER_ID,
      scope: 'user',
      conversationId: `user:${ANNA}`,
    });

    expect(messages.items.map((item) => item.text)).toEqual(['Где это?', 'Хочу туда']);
    expect(prisma.storyConversationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_inboxKey_counterpartKey: {
            userId: USER_ID,
            inboxKey: 'user',
            counterpartKey: `user:${ANNA}`,
          },
        },
      }),
    );

    const sent = await makeService(prisma).sendConversationMessage({
      actorUserId: USER_ID,
      scope: 'user',
      conversationId: `user:${ANNA}`,
      text: '  Ответ  ',
    });

    expect(prisma.storyReplyMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storyReplyId: 'reply-2',
          senderUserId: USER_ID,
          text: 'Ответ',
        }),
      }),
    );
    expect(sent).toMatchObject({ text: 'Ответ', mine: true, storyId: 'story-2', storyText: 'Кофе' });
  });
});

describe('StoriesService.likeComment', () => {
  it('не даёт лайкнуть свой комментарий', async () => {
    const prisma = {
      storyComment: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'comment-1',
          storyId: 'story-1',
          authorUserId: USER_ID,
        }),
      },
      storyCommentLike: { upsert: vi.fn() },
    };

    await expect(
      makeService(prisma).likeComment({
        storyId: 'story-1',
        commentId: 'comment-1',
        actorUserId: USER_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.storyCommentLike.upsert).not.toHaveBeenCalled();
  });

  it('ставит лайк чужому комментарию', async () => {
    const prisma = {
      storyComment: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'comment-1',
          storyId: 'story-1',
          authorUserId: '33333333-3333-4333-8333-333333333333',
        }),
      },
      storyCommentLike: { upsert: vi.fn().mockResolvedValue({}) },
    };

    await makeService(prisma).likeComment({
      storyId: 'story-1',
      commentId: 'comment-1',
      actorUserId: USER_ID,
    });

    expect(prisma.storyCommentLike.upsert).toHaveBeenCalledTimes(1);
  });
});
