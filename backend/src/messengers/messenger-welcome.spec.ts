import { describe, expect, it, vi } from 'vitest';
import type { MessengerPlatform } from '@prisma/client';
import { MessengerService } from './messenger.service';

function setup(platform: MessengerPlatform) {
  const repository = {
    captureLink: vi.fn().mockResolvedValue(true),
    connection: vi.fn().mockResolvedValue(null),
    blocked: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn(),
  };
  const transport = { send: vi.fn().mockResolvedValue('sent-message') };
  const chat = { createMessage: vi.fn() };
  const siteUrl = 'https://site.example.com';
  const service = new MessengerService(
    repository as never,
    chat as never,
    { siteUrl } as never,
    transport as never,
  );
  const start = (payload?: string) =>
    service.receive(
      platform,
      platform === 'TELEGRAM'
        ? {
            message: {
              message_id: 1,
              from: { id: 42, first_name: 'Иван' },
              chat: { id: 42, type: 'private' },
              text: payload ? `/start ${payload}` : '/start',
            },
          }
        : {
            update_type: 'bot_started',
            chat_id: 42,
            user: { user_id: 42, first_name: 'Иван' },
            payload,
          },
    );
  return { repository, transport, chat, siteUrl, start };
}

describe.each(['TELEGRAM', 'MAX'] as const)('%s welcome flow', (platform) => {
  it('welcomes an unlinked user with connection and reply instructions', async () => {
    const ctx = setup(platform);
    await ctx.start();
    expect(ctx.transport.send).toHaveBeenCalledExactlyOnceWith(
      platform,
      '42',
      expect.stringContaining('👋 Здравствуйте! Это бот Земледела.'),
    );
    const text = ctx.transport.send.mock.calls[0][2] as string;
    expect(text).toContain('Как подключиться:');
    expect(text).toContain('«Ответить здесь»');
    expect(text).toContain('«Открыть чат на сайте»');
    expect(text).toContain(`🌿 Земледел — ${ctx.siteUrl}`);
    expect(ctx.repository.captureLink).not.toHaveBeenCalled();
    expect(ctx.chat.createMessage).not.toHaveBeenCalled();
  });

  it('welcomes a user from a valid link and still requires site confirmation', async () => {
    const ctx = setup(platform);
    await ctx.start('a'.repeat(32));
    expect(ctx.repository.captureLink).toHaveBeenCalledOnce();
    const text = ctx.transport.send.mock.calls[0][2] as string;
    expect(text).toContain('👋 Здравствуйте!');
    expect(text).toContain('вернитесь на сайт и подтвердите подключение');
    expect(text).toContain(ctx.siteUrl);
    expect(text).not.toContain('Ваш аккаунт уже подключён');
    expect(ctx.repository.confirm).not.toHaveBeenCalled();
    expect(ctx.chat.createMessage).not.toHaveBeenCalled();
  });

  it('keeps the expired-link recovery message instead of claiming success', async () => {
    const ctx = setup(platform);
    ctx.repository.captureLink.mockResolvedValue(false);
    await ctx.start('a'.repeat(32));
    expect(ctx.transport.send).toHaveBeenCalledExactlyOnceWith(
      platform,
      '42',
      expect.stringContaining('Ссылка уже использована или истекла.'),
    );
    expect(ctx.repository.confirm).not.toHaveBeenCalled();
  });

  it('welcomes a linked user without asking to connect again', async () => {
    const ctx = setup(platform);
    ctx.repository.connection.mockResolvedValue({ chatId: '42' });
    await ctx.start();
    const text = ctx.transport.send.mock.calls[0][2] as string;
    expect(text).toContain('👋 Здравствуйте!');
    expect(text).toContain('Ваш аккаунт уже подключён.');
    expect(text).not.toContain('Как подключиться:');
    expect(ctx.repository.blocked).toHaveBeenCalledExactlyOnceWith(
      platform,
      '42',
      false,
    );
    expect(ctx.repository.captureLink).not.toHaveBeenCalled();
  });
});
