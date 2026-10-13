import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { PasswordResetConfig } from './mail/create-mail-sender';
import type { MailSender } from './mail/mail-sender';

const RESET_TTL_MS = 60 * 60 * 1000;

export const FORGOT_PASSWORD_MESSAGE =
  'Если аккаунт с таким email есть, мы отправили ссылку для сброса пароля.';

const INVALID_TOKEN_MESSAGE = 'Ссылка недействительна или устарела';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailSender,
    private readonly config: PasswordResetConfig,
  ) {}

  async requestReset(emailInput: string): Promise<{ message: string }> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);
      const now = new Date();

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        }),
      ]);

      const link = `${this.config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await this.mail.send({
          to: email,
          subject: 'Сброс пароля — Земледел',
          text: `Чтобы задать новый пароль, откройте ссылку. Она действует 1 час:\n${link}\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.`,
        });
      } catch (error) {
        this.logger.error(
          `Не удалось отправить письмо сброса для пользователя ${user.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(token.trim());
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt },
      }),
    ]);

    return { message: 'Пароль обновлён. Войдите с новым паролем.' };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
