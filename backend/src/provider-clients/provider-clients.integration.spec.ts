import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaClient, type ProviderMemberRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { defer, lastValueFrom } from 'rxjs';
import {
  type ExecutionContext,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { RequestsService } from '../requests/requests.service';
import type { ChatGateway } from '../chat/chat.gateway';
import {
  RequestRealtimeInterceptor,
  type RequestWithChanges,
} from '../requests/request-realtime.interceptor';
import { ClientInvitationsController } from './provider-clients.controller';
import type { PrismaService } from '../prisma/prisma.service';
import {
  attachLegacySignedClients,
  clientForAcceptedContract,
  lockProviderClient,
} from './provider-client-record';
import { ProviderClientsService } from './provider-clients.service';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = 'provider_clients_' + randomUUID().replaceAll('-', '');
const email = () => `crm-${randomUUID()}@example.test`;

describe.skipIf(!local)(
  'provider-scoped client relationships and invitations',
  () => {
    let admin: Pool;
    let db: PrismaClient;
    let clients: ProviderClientsService;
    beforeAll(async () => {
      admin = new Pool({ connectionString: url });
      await admin.query(`CREATE SCHEMA "${schema}"`);
      const migrated = new URL(url!);
      migrated.searchParams.set('schema', schema);
      execFileSync(
        process.execPath,
        ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
        {
          env: { ...process.env, DATABASE_URL: migrated.href },
          stdio: 'pipe',
          timeout: 60000,
        },
      );
      db = new PrismaClient({
        adapter: new PrismaPg(
          { connectionString: url, options: `-c search_path=${schema},public` },
          { schema },
        ),
      });
      const prisma = db as PrismaService;
      clients = new ProviderClientsService(
        prisma,
        new AuthService(prisma, {} as never),
      );
    }, 70000);
    afterAll(async () => {
      await db?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
    });

    function customer(address = email(), verified = true) {
      return db.user.create({
        data: { email: address, emailVerified: verified ? new Date() : null },
      });
    }
    async function provider(role: ProviderMemberRole = 'OWNER') {
      const user = await db.user.create({
        data: {
          email: email(),
          accountKind: 'PROVIDER',
          emailVerified: new Date(),
        },
      });
      const org = await db.provider.create({
        data: {
          name: 'Исполнитель',
          slug: randomUUID(),
          type: 'COMPANY',
          members: { create: { userId: user.id, role, status: 'ACTIVE' } },
        },
      });
      await db.user.update({
        where: { id: user.id },
        data: { activeProviderId: org.id },
      });
      return { user, org };
    }
    async function issue(providerId: string, id: string) {
      const invitation = await clients.issue(providerId, id);
      return invitation.path.split('/').at(-1)!;
    }
    function createPrivate(providerId: string, id: string) {
      return db.$transaction(async (tx) => {
        const client = await lockProviderClient(tx, providerId, id);
        return tx.request.create({
          data: {
            providerId,
            providerClientId: id,
            customerUserId: client.customerUserId,
            customerEmail: client.email,
            providerWorkStatus: 'PLANNED',
            status: 'DISCUSSING',
            message: 'Обследование',
          },
        });
      });
    }

    it('deduplicates by normalized provider email, does not expose existing accounts, restricts the cabinet to managers', async () => {
      const { user, org } = await provider();
      const manager = await provider('MANAGER');
      const employee = await provider('EMPLOYEE');
      const known = await customer();
      const [a, b] = await Promise.all([
        clients.create(org.id, {
          email: known.email.toUpperCase(),
          name: 'Анна',
        }),
        clients.create(org.id, { email: known.email }),
      ]);
      expect(a.id).toBe(b.id);
      expect(a).toMatchObject({
        status: 'CONTACT',
        customerUserId: null,
        ordersCount: 0,
        source: 'MANUAL',
      });
      expect(await clients.providerFor(user.id)).toBe(org.id);
      expect(await clients.providerFor(manager.user.id)).toBe(manager.org.id);
      await expect(clients.providerFor(employee.user.id)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(clients.providerFor(known.id)).rejects.toThrow(
        ForbiddenException,
      );
      expect(await clients.list(manager.org.id)).toEqual([]);
      await expect(clients.issue(manager.org.id, a.id)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        clients.edit(manager.org.id, a.id, { name: 'Чужое' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('revokes superseded links on reissue, email correction or explicit revocation; rejects expired links', async () => {
      const { org } = await provider();
      const contact = await clients.create(org.id, { email: email() });
      const first = await issue(org.id, contact.id);
      const next = await issue(org.id, contact.id);
      expect(next).not.toBe(first);
      await expect(clients.preview(first)).rejects.toThrow(GoneException);
      expect(await clients.preview(next)).toMatchObject({
        email: contact.email,
        accepted: false,
      });
      const changed = await clients.edit(org.id, contact.id, {
        email: email(),
      });
      expect(changed.status).toBe('CONTACT');
      await expect(clients.preview(next)).rejects.toThrow(GoneException);
      const revoked = await issue(org.id, contact.id);
      await clients.revoke(org.id, contact.id);
      await expect(clients.preview(revoked)).rejects.toThrow(GoneException);
      const expired = await issue(org.id, contact.id);
      await db.providerClient.update({
        where: { id: contact.id },
        data: { invitationExpiresAt: new Date(0) },
      });
      const recipient = await customer(changed.email);
      await expect(clients.preview(expired)).rejects.toThrow(GoneException);
      await expect(clients.accept(recipient.id, expired)).rejects.toThrow(
        GoneException,
      );
    });

    it('on verified sign-in restores private work across providers and keeps existing invitation links usable', async () => {
      const a = await provider();
      const b = await provider();
      const recipient = await customer(undefined, false);
      const passwordHash = await bcrypt.hash('пароль клиента', 4);
      await db.user.update({
        where: { id: recipient.id },
        data: { passwordHash },
      });
      const first = await clients.create(a.org.id, {
        email: recipient.email.toUpperCase(),
      });
      const second = await clients.create(b.org.id, { email: recipient.email });
      const empty = await provider();
      const contactOnly = await clients.create(empty.org.id, {
        email: recipient.email,
      });
      const wrong = await clients.create(a.org.id, { email: email() });
      const token = await issue(a.org.id, first.id);
      const old = await createPrivate(a.org.id, first.id);
      const newer = await createPrivate(b.org.id, second.id);
      const otherAddress = await createPrivate(a.org.id, wrong.id);
      const ordinary = await db.request.create({
        data: { providerId: a.org.id, customerEmail: recipient.email },
      });
      const auth = new AuthService(db as PrismaService, {} as never);

      await expect(
        auth.validateCredentials(recipient.email, 'пароль клиента'),
      ).rejects.toThrow();
      await db.user.update({
        where: { id: recipient.id },
        data: { emailVerified: new Date() },
      });
      await expect(
        auth.validateCredentials(recipient.email, 'неверный пароль'),
      ).rejects.toThrow();
      expect(
        await db.request.count({ where: { customerUserId: recipient.id } }),
      ).toBe(0);

      const logins = await Promise.all([
        auth.validateCredentials(
          recipient.email.toUpperCase(),
          'пароль клиента',
        ),
        auth.validateCredentials(recipient.email, 'пароль клиента'),
      ]);
      expect(
        logins.flatMap((result) => result.changedRequestIds).sort(),
      ).toEqual([old.id, newer.id].sort());
      expect(
        await db.request.count({ where: { customerUserId: recipient.id } }),
      ).toBe(2);
      expect(
        await db.request.count({
          where: {
            id: { in: [ordinary.id, otherAddress.id] },
            customerUserId: null,
          },
        }),
      ).toBe(2);
      expect(await clients.preview(token)).toMatchObject({ accepted: true });
      expect(await clients.accept(recipient.id, token)).toMatchObject({
        changedRequestIds: [],
      });
      expect(await clients.detail(empty.org.id, contactOnly.id)).toMatchObject({
        status: 'CONTACT',
      });
    });

    it('binds only this card and its private requests to the verified customer, including concurrent/new work', async () => {
      const a = await provider(),
        b = await provider(),
        recipient = await customer(undefined, false);
      const card = await clients.create(a.org.id, { email: recipient.email });
      const other = await clients.create(b.org.id, { email: recipient.email });
      const privateRow = await createPrivate(a.org.id, card.id);
      const hidden = await createPrivate(b.org.id, other.id);
      const historic = await db.request.create({
        data: { providerId: a.org.id, customerEmail: recipient.email },
      });
      const token = await issue(a.org.id, card.id);
      await expect(clients.accept(recipient.id, token)).rejects.toThrow(
        ForbiddenException,
      );
      const wrong = await customer();
      await expect(clients.accept(wrong.id, token)).rejects.toThrow(
        ForbiddenException,
      );
      await db.user.update({
        where: { id: recipient.id },
        data: { emailVerified: new Date(), accountKind: 'PROVIDER' },
      });
      await expect(clients.accept(recipient.id, token)).rejects.toThrow(
        ForbiddenException,
      );
      await db.user.update({
        where: { id: recipient.id },
        data: { accountKind: 'CUSTOMER' },
      });
      const [concurrent] = await Promise.all([
        createPrivate(a.org.id, card.id),
        clients.accept(recipient.id, token),
        clients.accept(recipient.id, token),
      ]);
      const future = await createPrivate(a.org.id, card.id);
      expect(
        await db.request.count({
          where: {
            id: { in: [privateRow.id, concurrent.id, future.id] },
            customerUserId: recipient.id,
            contractAcceptedAt: null,
          },
        }),
      ).toBe(3);
      expect(
        await db.request.count({
          where: { id: { in: [historic.id, hidden.id] }, customerUserId: null },
        }),
      ).toBe(2);
      expect(await clients.detail(a.org.id, card.id)).toMatchObject({
        status: 'CONNECTED',
        ordersCount: 3,
      });
      expect(
        await db.legalAcceptance.count({ where: { userId: recipient.id } }),
      ).toBe(0);
      await expect(
        clients.edit(a.org.id, card.id, { email: email() }),
      ).rejects.toThrow('Почту подключённого клиента изменить нельзя');
    });

    it('refreshes only newly connected private requests for authorized viewers after acceptance', async () => {
      const { org, user: owner } = await provider();
      const { org: other } = await provider();
      const recipient = await customer();
      const card = await clients.create(org.id, { email: recipient.email });
      const foreignCard = await clients.create(other.id, {
        email: recipient.email,
      });
      const first = await createPrivate(org.id, card.id);
      const second = await createPrivate(org.id, card.id);
      await createPrivate(other.id, foreignCard.id);
      const assigned = await customer();
      const member = await db.providerMember.create({
        data: {
          userId: assigned.id,
          providerId: org.id,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
        },
      });
      await db.request.update({
        where: { id: first.id },
        data: { assignedMemberId: member.id },
      });
      const token = await issue(org.id, card.id);
      const auth = new InternalAuthService();
      vi.spyOn(auth, 'getUserIdFromRequest').mockReturnValue(recipient.id);
      const controller = new ClientInvitationsController(clients, auth);
      const gateway = { emitRequestChanged: vi.fn() };
      const events = new RequestRealtimeInterceptor(
        db as PrismaService,
        gateway as unknown as ChatGateway,
      );
      async function accept() {
        const request = {
          method: 'POST',
          route: { path: '/client-invitations/:token/accept' },
          params: { token },
        } as unknown as RequestWithChanges;
        const context = {
          switchToHttp: () => ({ getRequest: () => request }),
        } as ExecutionContext;
        return lastValueFrom(
          await events.intercept(context, {
            handle: () => defer(() => controller.accept(request, token)),
          }),
        );
      }
      expect(await accept()).toEqual({ clientId: card.id });
      expect(gateway.emitRequestChanged.mock.calls).toHaveLength(5);
      expect(gateway.emitRequestChanged.mock.calls).toEqual(
        expect.arrayContaining([
          [owner.id, first.id],
          [assigned.id, first.id],
          [recipient.id, first.id],
          [owner.id, second.id],
          [recipient.id, second.id],
        ]),
      );
      gateway.emitRequestChanged.mockClear();
      expect(await accept()).toEqual({ clientId: card.id });
      expect(gateway.emitRequestChanged).not.toHaveBeenCalled();
    });

    it('links earlier private work in the same transaction as customer contract acceptance', async () => {
      const { org, user: owner } = await provider();
      const signer = await customer();
      const recipient = await customer();
      const manual = await clients.create(org.id, { email: signer.email });
      const other = await clients.create(org.id, { email: recipient.email });
      const offline = await createPrivate(org.id, manual.id);
      const amount = 3700;
      const contract = await db.request.create({
        data: {
          providerId: org.id,
          customerUserId: signer.id,
          customerEmail: recipient.email,
          lockedAt: new Date(),
          status: 'TERMS_AGREED',
          totalAmountRubles: amount,
          priceProposals: {
            create: {
              providerId: org.id,
              proposedByUserId: owner.id,
              amountRubles: amount,
              authorSide: 'PROVIDER',
              isDirectSet: true,
            },
          },
          contractFiles: {
            create: {
              providerId: org.id,
              bundleId: randomUUID(),
              originalName: 'contract.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1,
              sha256: 'a'.repeat(64),
              storageRelPath: 'fixture/contract.pdf',
              role: 'CONTRACT_DOCUMENT',
            },
          },
        },
      });
      const prisma = db as PrismaService;
      const legal = new LegalDocsService();
      const requests = new RequestsService(
        prisma,
        new AuthService(prisma, {} as never),
        new InternalAuthService(),
        legal,
        {} as never,
      );
      const input = {
        termsVersion: (await legal.getCurrent('terms')).version,
        expectedTotalAmountRubles: amount,
      };
      const sign = () =>
        requests.acceptContractByCustomer(signer.id, contract.id, input);

      await expect(sign()).rejects.toThrow('Не все пакеты договора одобрены');
      expect((await clients.detail(org.id, manual.id)).status).toBe('CONTACT');
      await db.requestContractFile.updateMany({
        where: { requestId: contract.id },
        data: {
          status: 'APPROVED',
          decidedByUserId: signer.id,
          decidedAt: new Date(),
        },
      });
      await expect(sign()).resolves.toMatchObject({
        status: 'ACTIVE',
        changedRequestIds: [offline.id],
      });
      expect(await clients.detail(org.id, manual.id)).toMatchObject({
        customerUserId: signer.id,
        ordersCount: 2,
      });
      expect(await clients.detail(org.id, other.id)).toMatchObject({
        customerUserId: null,
        ordersCount: 0,
      });
      expect(
        await db.request.findUniqueOrThrow({ where: { id: offline.id } }),
      ).toMatchObject({
        customerUserId: signer.id,
        contractAcceptedAt: null,
      });
      expect(
        await db.legalAcceptance.count({
          where: { userId: signer.id, context: 'CONTRACT' },
        }),
      ).toBe(1);
    });

    it('uses only a signed contract and verified account identity to merge with a manual contact', async () => {
      const { org } = await provider(),
        legacy = await customer(undefined, false),
        nobody = await customer();
      const manual = await clients.create(org.id, {
        email: legacy.email,
        name: 'Моя Анна',
      });
      const foreign = await clients.create(org.id, { email: nobody.email });
      const pending = await createPrivate(org.id, manual.id);
      expect(
        await db.$transaction((tx) =>
          clientForAcceptedContract(tx, org.id, legacy.id),
        ),
      ).toEqual({ clientId: null, changedRequestIds: [] });
      const signed = await db.request.create({
        data: {
          providerId: org.id,
          customerUserId: legacy.id,
          customerEmail: nobody.email,
          contractAcceptedAt: new Date(),
          contractAcceptedByUserId: legacy.id,
        },
      });
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: legacy.id },
          data: { emailVerified: new Date() },
        });
        await attachLegacySignedClients(tx, legacy.id);
      });
      expect(await clients.detail(org.id, manual.id)).toMatchObject({
        name: 'Моя Анна',
        customerUserId: legacy.id,
        source: 'MANUAL',
        ordersCount: 2,
      });
      expect(
        await db.request.findUniqueOrThrow({ where: { id: pending.id } }),
      ).toMatchObject({ customerUserId: legacy.id, contractAcceptedAt: null });
      expect(
        await db.request.findUniqueOrThrow({ where: { id: signed.id } }),
      ).toMatchObject({ providerClientId: manual.id });
      expect(await clients.detail(org.id, foreign.id)).toMatchObject({
        status: 'CONTACT',
        ordersCount: 0,
      });
    });
  },
);
