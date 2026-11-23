import { attachLegacySignedClients } from '../provider-clients/provider-client-record';
import { lockContactEmail } from '../common/contact-email';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AccountKind, Prisma } from '@prisma/client';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_SENDER, type MailSender } from './mail/mail-sender';

const MINUTE = 60_000;
const CODE_LIFETIME = 10 * MINUTE;
const REGISTRATION_LIFETIME = 60 * MINUTE;
const MAX_ATTEMPTS = 5;

const passwordStep = { status: 'password_required' } as const;

type VerificationStep = {
  status: 'verification_required';
  accountKind: AccountKind | null;
  resendAt: string;
  codeUnavailable?: true;
};

function registrationTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function codeHash(email: string, sentAt: Date, code: string) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      'INTERNAL_API_SECRET is not configured',
    );
  }
  return createHmac('sha256', secret)
    .update(
      JSON.stringify(['email-verification', email, sentAt.getTime(), code]),
    )
    .digest('hex');
}

export async function consumeRegistrationVerification(
  tx: Prisma.TransactionClient,
  email: string,
  registrationToken: string,
): Promise<Date> {
  await lockContactEmail(tx, email);
  const proof = await tx.emailVerification.findFirst({
    where: {
      email,
      userId: null,
      tokenHash: registrationTokenHash(registrationToken),
      verifiedAt: { gt: new Date(Date.now() - REGISTRATION_LIFETIME) },
    },
    select: { verifiedAt: true },
  });
  if (!proof?.verifiedAt) {
    throw new ForbiddenException(
      'Подтвердите email ещё раз, чтобы завершить регистрацию.',
    );
  }
  await tx.emailVerification.delete({ where: { email } });
  return proof.verifiedAt;
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
  ) {}

  async request(
    emailInput: string,
    origin: 'signup' | 'signin',
    kind?: AccountKind,
  ) {
    const email = emailInput.trim().toLowerCase();
    const result = await this.prisma.$transaction(async (tx) => {
      await lockContactEmail(tx, email);
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true },
      });
      if (user && origin === 'signup') {
        throw new ConflictException(
          'Этот email уже зарегистрирован. Войдите в аккаунт.',
        );
      }
      if (user?.emailVerified) return { step: passwordStep };

      const previous = await tx.emailVerification.findUnique({
        where: { email },
      });
      if (!user && !previous && origin === 'signin')
        return { step: passwordStep };

      const userId = user?.id ?? null;
      const sameOwner = previous?.userId === userId;
      const accountKind = user ? null : (kind ?? previous?.accountKind ?? null);
      const now = new Date();
      const sentAt = sameOwner && previous.sentAt ? previous.sentAt : null;
      if (sentAt && now.getTime() < sentAt.getTime() + MINUTE) {
        if (previous?.accountKind !== accountKind) {
          await tx.emailVerification.update({
            where: { email },
            data: { accountKind },
          });
        }
        return {
          step: this.verificationStep(
            accountKind,
            sentAt,
            !previous?.codeHash || previous.attempts >= MAX_ATTEMPTS,
          ),
        };
      }

      let code: string;
      do {
        code = randomInt(10_000).toString().padStart(4, '0');
      } while (
        previous?.sentAt &&
        previous.codeHash &&
        codeHash(email, previous.sentAt, code) === previous.codeHash
      );
      const hash = codeHash(email, now, code);
      const challenge = {
        userId,
        accountKind,
        codeHash: hash,
        sentAt: now,
        attempts: 0,
      };
      await tx.emailVerification.upsert({
        where: { email },
        create: { email, ...challenge },
        update: {
          ...challenge,
          // A resend must not invalidate a previously verified browser's form.
          ...(sameOwner ? {} : { verifiedAt: null, tokenHash: null }),
        },
      });
      return {
        step: this.verificationStep(accountKind, now),
        delivery: { code, hash },
      };
    });

    if (result.delivery) {
      try {
        await this.mail.send({
          to: email,
          subject: 'Код подтверждения почты — Земледел',
          text: `Ваш код подтверждения: ${result.delivery.code}\n\nКод действует 10 минут. Если вы не запрашивали код, проигнорируйте это письмо.`,
        });
      } catch {
        // Release only this delivery's cooldown. A later successful resend may already exist.
        await this.prisma.emailVerification.updateMany({
          where: { email, codeHash: result.delivery.hash },
          data: { sentAt: null, codeHash: null },
        });
        throw new ServiceUnavailableException(
          'Не удалось отправить письмо. Попробуйте ещё раз.',
        );
      }
    }
    return result.step;
  }

  private verificationStep(
    accountKind: AccountKind | null,
    sentAt: Date,
    codeUnavailable = false,
  ): VerificationStep {
    return {
      status: 'verification_required',
      ...(codeUnavailable && { codeUnavailable: true }),
      accountKind,
      resendAt: new Date(sentAt.getTime() + MINUTE).toISOString(),
    };
  }

  async verify(emailInput: string, code: string) {
    const email = emailInput.trim().toLowerCase();
    const verified = await this.prisma.$transaction(async (tx) => {
      await lockContactEmail(tx, email);
      const row = await tx.emailVerification.findUnique({ where: { email } });
      const now = new Date();
      if (
        !row?.codeHash ||
        !row.sentAt ||
        row.attempts >= MAX_ATTEMPTS ||
        row.sentAt.getTime() + CODE_LIFETIME <= now.getTime()
      )
        return null;

      const hash = codeHash(email, row.sentAt, code);
      if (
        !timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(row.codeHash, 'hex'),
        )
      ) {
        await tx.emailVerification.update({
          where: { email },
          data: { attempts: { increment: 1 } },
        });
        // Commit the failed attempt before returning the validation error.
        return null;
      }
      if (row.userId) {
        const user = await tx.user.updateMany({
          where: { id: row.userId, email },
          data: { emailVerified: now },
        });
        await tx.emailVerification.delete({ where: { email } });
        if (!user.count) return null;
        await attachLegacySignedClients(tx, row.userId);
        return { ...passwordStep, email };
      }

      const registrationToken = randomBytes(32).toString('base64url');
      await tx.emailVerification.update({
        where: { email },
        data: {
          verifiedAt: now,
          tokenHash: registrationTokenHash(registrationToken),
          codeHash: null,
        },
      });
      return {
        status: 'registration_required' as const,
        email,
        accountKind: row.accountKind,
        registrationToken,
      };
    });
    if (!verified)
      throw new BadRequestException(
        'Неверный или просроченный код. Проверьте код или запросите новый.',
      );
    return verified;
  }
}
