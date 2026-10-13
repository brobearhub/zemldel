import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MailSender } from './mail/mail-sender';
import {
  FORGOT_PASSWORD_MESSAGE,
  PasswordResetService,
} from './password-reset.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeService(prisma: object, mail: MailSender = { send: vi.fn() }) {
  return new PasswordResetService(prisma as never, mail, {
    frontendUrl: 'http://localhost:4000',
  });
}

describe('PasswordResetService.requestReset', () => {
  it('не создаёт токен и отвечает так же, если аккаунта нет', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(),
    };
    const mail = { send: vi.fn() };

    const result = await makeService(prisma, mail).requestReset(
      'missing@example.com',
    );

    expect(result.message).toBe(FORGOT_PASSWORD_MESSAGE);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('для существующего аккаунта шлёт ссылку и не раскрывает это в ответе', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: USER_ID, passwordHash: 'hash' }),
      },
      passwordResetToken: {
        updateMany: vi.fn().mockReturnValue('update'),
        create: vi.fn().mockReturnValue('create'),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const mail = { send: vi.fn().mockResolvedValue(undefined) };

    const result = await makeService(prisma, mail).requestReset(
      ' User@Example.com ',
    );

    expect(result.message).toBe(FORGOT_PASSWORD_MESSAGE);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      select: { id: true, passwordHash: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mail.send).toHaveBeenCalledOnce();
    const sent = mail.send.mock.calls[0]?.[0] as { to: string; text: string };
    expect(sent.to).toBe('user@example.com');
    expect(sent.text).toContain('http://localhost:4000/reset-password?token=');
  });
});

describe('PasswordResetService.resetPassword', () => {
  it('отклоняет просроченный или использованный токен', async () => {
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'token-1',
          userId: USER_ID,
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
        }),
      },
    };

    await expect(
      makeService(prisma).resetPassword('a'.repeat(32), 'new-password'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('меняет пароль и помечает токен использованным', async () => {
    const tx = {
      user: { update: vi.fn().mockReturnValue('user') },
      passwordResetToken: { update: vi.fn().mockReturnValue('token') },
    };
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'token-1',
          userId: USER_ID,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
        }),
        update: tx.passwordResetToken.update,
      },
      user: { update: tx.user.update },
      $transaction: vi.fn().mockResolvedValue([]),
    };

    const result = await makeService(prisma).resetPassword(
      'a'.repeat(32),
      'new-password',
    );

    expect(result.message).toContain('Пароль обновлён');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { passwordHash: expect.any(String) },
    });
  });
});
