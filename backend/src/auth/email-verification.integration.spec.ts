import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import type { OutboundMail } from './mail/mail-sender';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = `email_verification_${randomUUID().replaceAll('-', '')}`;
const versions = {
  terms: '2026-08-04',
  privacy: '2026-08-04',
  consent: '2026-08-04',
};
const newEmail = () => `${randomUUID()}@example.test`;

describe.skipIf(!local)(
  'email verification on isolated PostgreSQL schema',
  () => {
    let admin: Pool;
    let db: PrismaClient;
    let auth: AuthService;
    let service: EmailVerificationService;
    const send = vi
      .fn<(mail: OutboundMail) => Promise<void>>()
      .mockResolvedValue(undefined);

    beforeAll(async () => {
      vi.stubEnv(
        'INTERNAL_API_SECRET',
        'integration-only-mail-verification-secret',
      );
      admin = new Pool({ connectionString: url });
      await admin.query(`CREATE SCHEMA "${schema}"`);
      const migrated = new URL(url!);
      migrated.searchParams.set('schema', schema);
      execFileSync(
        process.execPath,
        ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
        {
          env: { ...process.env, DATABASE_URL: migrated.toString() },
          stdio: 'pipe',
          timeout: 60_000,
        },
      );
      db = new PrismaClient({
        adapter: new PrismaPg(
          { connectionString: url, options: `-c search_path=${schema},public` },
          { schema },
        ),
      });
      service = new EmailVerificationService(db as PrismaService, { send });
      auth = new AuthService(
        db as PrismaService,
        {
          assertCurrentVersions: () => Promise.resolve(versions),
        } as never,
      );
    }, 70_000);

    afterEach(() => {
      send.mockClear();
      vi.useRealTimers();
    });

    afterAll(async () => {
      await db?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
      vi.unstubAllEnvs();
    });

    function mailedCode(email: string) {
      const mail = send.mock.calls
        .map(([message]) => message)
        .filter((m) => m.to === email)
        .at(-1);
      const code = mail?.text.match(/\b\d{4}\b/)?.[0];
      if (!code) throw new Error('No four-digit verification code delivered');
      return code;
    }

    it('coalesces concurrent sends and verifies before consuming a registration exactly once', async () => {
      const email = newEmail();
      const [first, second] = await Promise.all([
        service.request(email.toUpperCase(), 'signup', 'PROVIDER'),
        service.request(email, 'signup', 'PROVIDER'),
      ]);
      expect(first).toEqual(second);
      expect(await service.request(email, 'signin')).toEqual(first);
      expect(send).toHaveBeenCalledTimes(1);
      expect(await db.user.findUnique({ where: { email } })).toBeNull();

      const code = mailedCode(email);
      const proof = await service.verify(email, code);
      if (proof.status !== 'registration_required')
        throw new Error('Missing registration proof');
      await expect(service.verify(email, code)).rejects.toThrow();
      expect(await service.request(email, 'signin')).toMatchObject({
        codeUnavailable: true,
      });
      expect(send).toHaveBeenCalledTimes(1);
      const signup = {
        email,
        password: 'password',
        acceptedLegal: versions,
        accountKind: 'PROVIDER' as const,
        registrationToken: proof.registrationToken,
      };
      await expect(
        auth.signup({ ...signup, email: newEmail() }),
      ).rejects.toThrow('Подтвердите email');
      const results = await Promise.allSettled([
        auth.signup(signup),
        auth.signup(signup),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const user = await db.user.findUniqueOrThrow({
        where: { email },
        include: { legalAcceptances: true },
      });
      expect(user.emailVerified).toBeInstanceOf(Date);
      expect(user.accountKind).toBe('PROVIDER');
      expect(user.systemRole).toBe('CUSTOMER');
      expect(user.legalAcceptances).toHaveLength(3);
      expect(
        await db.emailVerification.findUnique({ where: { email } }),
      ).toBeNull();
      expect((await auth.validateCredentials(email, 'password')).id).toBe(
        user.id,
      );
    });

    it('keeps a customer proof valid until the name and an active city are provided', async () => {
      const email = newEmail();
      const city = await db.city.create({
        data: {
          garObjectId: 1n,
          objectGuid: randomUUID(),
          name: 'Тестовый город',
          typeName: 'г',
          level: 5,
          regionCode: '00',
          regionName: 'Тестовая область',
        },
      });
      await service.request(email, 'signup');
      const proof = await service.verify(email, mailedCode(email));
      if (proof.status !== 'registration_required')
        throw new Error('Missing registration proof');
      const signup = {
        email,
        accountKind: 'CUSTOMER' as const,
        password: 'password',
        acceptedLegal: versions,
        registrationToken: proof.registrationToken,
      };
      await expect(
        auth.signup({ ...signup, name: ' ', customerCityId: city.id }),
      ).rejects.toThrow('Укажите имя');
      await expect(auth.signup({ ...signup, name: 'Ирина' })).rejects.toThrow(
        'Выберите город',
      );
      expect(await db.user.findUnique({ where: { email } })).toBeNull();
      await auth.signup({
        ...signup,
        name: ' Ирина ',
        customerCityId: city.id,
      });
      expect(
        await db.user.findUniqueOrThrow({ where: { email } }),
      ).toMatchObject({
        name: 'Ирина',
        customerCityId: city.id,
        accountKind: 'CUSTOMER',
        systemRole: 'CUSTOMER',
      });
    });

    it('unlocks only the original existing account and still requires its password', async () => {
      const email = newEmail();
      const user = await db.user.create({
        data: {
          email,
          name: 'Сохранённый профиль',
          accountKind: 'PROVIDER',
          passwordHash: await bcrypt.hash('password', 4),
        },
      });
      await expect(
        auth.validateCredentials(email, 'password'),
      ).rejects.toThrow();
      await expect(service.request(email, 'signup')).rejects.toThrow();
      expect(await service.request(email, 'signin')).toMatchObject({
        status: 'verification_required',
      });
      expect(await service.verify(email, mailedCode(email))).toEqual({
        status: 'password_required',
        email,
      });
      expect(await service.request(email, 'signin')).toEqual({
        status: 'password_required',
      });
      await expect(
        auth.validateCredentials(email, 'incorrect'),
      ).rejects.toThrow();
      expect(await auth.validateCredentials(email, 'password')).toMatchObject({
        id: user.id,
        name: user.name,
      });
    });

    it('enforces the verification attempt limit under parallel requests and expires codes and proofs', async () => {
      const email = newEmail();
      await service.request(email, 'signup');
      const code = mailedCode(email);
      const wrong = code === '0000' ? '0001' : '0000';
      const wrongAttempts = await Promise.allSettled(
        Array.from({ length: 7 }, () => service.verify(email, wrong)),
      );
      expect(
        wrongAttempts.every((result) => result.status === 'rejected'),
      ).toBe(true);
      expect(
        (await db.emailVerification.findUniqueOrThrow({ where: { email } }))
          .attempts,
      ).toBe(5);
      await expect(service.verify(email, code)).rejects.toThrow();
      const now = Date.now();
      vi.setSystemTime(now + 60_001);
      await service.request(email, 'signin');
      expect(send).toHaveBeenCalledTimes(2);
      expect(mailedCode(email)).not.toBe(code);
      await expect(service.verify(email, code)).rejects.toThrow();
      vi.setSystemTime(now + 12 * 60_000);
      await expect(service.verify(email, mailedCode(email))).rejects.toThrow();
      await service.request(email, 'signin');
      const proof = await service.verify(email, mailedCode(email));
      if (proof.status !== 'registration_required')
        throw new Error('Missing registration proof');
      vi.setSystemTime(now + 73 * 60_000);
      await expect(
        auth.signup({
          email,
          accountKind: 'PROVIDER',
          password: 'password',
          acceptedLegal: versions,
          registrationToken: proof.registrationToken,
        }),
      ).rejects.toThrow('Подтвердите email');
    });

    it('allows immediate retry after mail failure and leaves unknown signin addresses untouched', async () => {
      const email = newEmail();
      expect(await service.request(email, 'signin')).toEqual({
        status: 'password_required',
      });
      expect(
        await db.emailVerification.findUnique({ where: { email } }),
      ).toBeNull();
      send.mockRejectedValueOnce(new Error('SMTP'));
      await expect(service.request(email, 'signup')).rejects.toThrow(
        'Не удалось отправить письмо',
      );
      expect(await service.request(email, 'signin')).toMatchObject({
        status: 'verification_required',
        accountKind: null,
      });
      expect(send).toHaveBeenCalledTimes(2);
    });
  },
);
