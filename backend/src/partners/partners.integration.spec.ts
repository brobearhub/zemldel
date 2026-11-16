import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AuthService } from '../auth/auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { OutboundMail } from '../auth/mail/mail-sender';
import { ChatService } from '../chat/chat.service';
import { RequestsService } from '../requests/requests.service';
import { PartnersService } from './partners.service';
import { PartnerDelegationService } from './partner-delegation.service';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = `partners_qa_${randomUUID().replaceAll('-', '')}`;

describe.skipIf(!local)(
  'partners and delegation in isolated PostgreSQL',
  () => {
    let db: PrismaClient;
    let admin: Pool;
    let partners: PartnersService;
    let delegate: PartnerDelegationService;
    let chat: ChatService;
    let requests: RequestsService;
    const mail = {
      send: vi
        .fn<(mail: OutboundMail) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    const gateway = {
      emitRequestChanged: vi.fn(),
      emitMessageCreated: vi.fn(),
      emitUnreadHint: vi.fn(),
      emitDirectMessageCreated: vi.fn(),
      emitConversationChanged: vi.fn(),
      emitPresenceUpdated: vi.fn(),
      evictConversation: vi.fn(),
      isUserOnline: vi.fn().mockReturnValue(false),
    };
    beforeAll(async () => {
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
      const auth = new AuthService(prisma, {} as never);
      chat = new ChatService(prisma, {} as never, gateway as never);
      partners = new PartnersService(prisma, auth, mail, gateway as never);
      delegate = new PartnerDelegationService(
        prisma,
        partners,
        chat,
        gateway as never,
      );
      requests = new RequestsService(
        prisma,
        auth,
        {} as never,
        {} as never,
        chat,
      );
    }, 70000);
    beforeEach(() => {
      vi.clearAllMocks();
      mail.send.mockResolvedValue(undefined);
    });
    afterAll(async () => {
      await db?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
    });

    async function provider(
      name = 'Исполнитель',
      email = `${randomUUID()}@example.test`,
    ) {
      const user = await db.user.create({
        data: { email, name, accountKind: 'PROVIDER' },
      });
      const profile = await db.provider.create({
        data: {
          name,
          slug: randomUUID(),
          type: 'COMPANY',
          ownerUserId: user.id,
          members: {
            create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' },
          },
        },
      });
      await db.user.update({
        where: { id: user.id },
        data: { activeProviderId: profile.id },
      });
      return { user, profile };
    }
    async function member(providerId: string, role: 'MANAGER' | 'EMPLOYEE') {
      const user = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          accountKind: 'PROVIDER',
          activeProviderId: providerId,
          providerMemberships: {
            create: { providerId, role, status: 'ACTIVE' },
          },
        },
      });
      return user;
    }
    async function pair() {
      const a = await provider('Альфа');
      const b = await provider('Бета');
      const invite = await partners.invite(a.user.id, b.profile.id);
      await partners.respond(b.user.id, invite.id, 'accept');
      return { a, b, invite };
    }
    async function requestFixture() {
      const fixtures = await pair();
      const customer = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          accountKind: 'CUSTOMER',
          name: 'Клиент',
        },
      });
      const request = await db.request.create({
        data: {
          providerId: fixtures.a.profile.id,
          customerUserId: customer.id,
          lockedAt: new Date(),
          status: 'DISCUSSING',
          message: 'Передать участок',
          totalAmountRubles: 10000,
        },
      });
      const conversation = await db.conversation.create({
        data: {
          providerId: fixtures.a.profile.id,
          customerUserId: customer.id,
          requestId: request.id,
        },
      });
      const message = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: customer.id,
          clientMessageId: randomUUID(),
          body: 'История клиента',
        },
      });
      return { ...fixtures, customer, request, conversation, message };
    }

    it('deduplicates reciprocal invitations and only the recipient can accept', async () => {
      const a = await provider();
      const b = await provider();
      const invitations = await Promise.all([
        partners.invite(a.user.id, b.profile.id),
        partners.invite(b.user.id, a.profile.id),
      ]);
      expect(invitations[0].id).toBe(invitations[1].id);
      const row = await db.providerPartnership.findUniqueOrThrow({
        where: { id: invitations[0].id },
      });
      const sender = row.requesterProviderId === a.profile.id ? a : b;
      const recipient = row.partnerProviderId === a.profile.id ? a : b;
      await expect(
        partners.respond(sender.user.id, row.id, 'accept'),
      ).rejects.toThrow('Нет доступа');
      await expect(
        partners.conversation(sender.user.id, row.id),
      ).rejects.toThrow('подтверждённым');
      await partners.respond(recipient.user.id, row.id, 'accept');
      expect((await partners.mine(sender.user.id)).items[0].status).toBe(
        'ACTIVE',
      );
      expect((await partners.mine(recipient.user.id)).items[0].status).toBe(
        'ACTIVE',
      );
      await expect(
        partners.invite(sender.user.id, sender.profile.id),
      ).rejects.toThrow('свой профиль');
    });

    it('keeps employees and outsiders out of partnerships and partner chats; both managers can chat without a tariff', async () => {
      const { a, b, invite } = await pair();
      const employee = await member(a.profile.id, 'EMPLOYEE');
      const manager = await member(b.profile.id, 'MANAGER');
      const outsider = await provider();
      await expect(partners.mine(employee.id)).rejects.toThrow();
      const { conversationId } = await partners.conversation(
        a.user.id,
        invite.id,
      );
      expect(
        (await partners.conversation(b.user.id, invite.id)).conversationId,
      ).toBe(conversationId);
      for (const denied of [employee.id, outsider.user.id])
        await expect(
          chat.listMessages(denied, conversationId, {}),
        ).rejects.toThrow();
      expect((await chat.listInbox(a.user.id, 'provider'))[0]).toMatchObject({
        kind: 'PARTNER',
        peerName: 'Бета',
        conversationId,
      });
      expect((await chat.listInbox(b.user.id, 'provider'))[0]).toMatchObject({
        kind: 'PARTNER',
        peerName: 'Альфа',
        conversationId,
      });
      expect(await chat.listInbox(b.user.id, 'customer')).toEqual([]);
      const clientMessageId = randomUUID();
      const sent = await chat.createMessage(a.user.id, conversationId, {
        body: 'Обсудим заявку',
        clientMessageId,
      });
      expect(
        (
          await chat.createMessage(a.user.id, conversationId, {
            body: 'Обсудим заявку',
            clientMessageId,
          })
        ).alreadyExisted,
      ).toBe(true);
      await chat.createMessage(manager.id, conversationId, {
        body: 'Да',
        clientMessageId: randomUUID(),
        replyToMessageId: sent.message.id,
      });
      expect(
        (await chat.listMessages(b.user.id, conversationId, {})).map(
          (m) => m.body,
        ),
      ).toContain('Да');
      expect(
        await db.messengerOutbox.count({
          where: { message: { conversationId } },
        }),
      ).toBe(0);
      expect((await chat.listInbox(b.user.id, 'provider'))[0].unreadCount).toBe(
        2,
      );
      await chat.markRead(b.user.id, conversationId);
      expect((await chat.listInbox(b.user.id, 'provider'))[0].unreadCount).toBe(
        0,
      );
      expect(gateway.emitDirectMessageCreated).toHaveBeenCalledWith(
        expect.arrayContaining([a.user.id, b.user.id, manager.id]),
        expect.anything(),
      );
    });

    it('sends an email only for a missing provider and requires matching account plus explicit acceptance', async () => {
      const a = await provider();
      const b = await provider();
      expect(
        await partners.inviteEmail(a.user.id, b.user.email.toUpperCase()),
      ).toMatchObject({ delivery: 'IN_APP' });
      expect(mail.send).not.toHaveBeenCalled();
      const email = `${randomUUID()}@example.test`;
      const invitation = await partners.inviteEmail(a.user.id, email);
      expect(invitation.delivery).toBe('EMAIL');
      const token = mail.send.mock.calls[0][0].text.match(
        /partner-invitations\/([A-Za-z0-9_-]{43})/,
      )![1];
      const pending = (await partners.mine(a.user.id)).items.find(
        (p) => p.id === invitation.id,
      );
      expect(pending).toMatchObject({
        status: 'PENDING',
        provider: null,
      });
      expect(pending?.sentAt).toBeInstanceOf(Date);
      await expect(partners.acceptInvitation(b.user.id, token)).rejects.toThrow(
        'email',
      );
      const newcomer = await provider('Новый партнёр', email);
      await partners.acceptInvitation(newcomer.user.id, token);
      await partners.acceptInvitation(newcomer.user.id, token);
      expect((await partners.mine(newcomer.user.id)).items[0]).toMatchObject({
        status: 'ACTIVE',
        provider: { id: a.profile.id },
      });
      await expect(partners.invitation('invalid')).rejects.toThrow();
    });

    it('does not claim a sent invitation after mail failure; expired and cancelled tokens cannot be used', async () => {
      const a = await provider();
      mail.send.mockRejectedValueOnce(new Error('SMTP unavailable'));
      await expect(
        partners.inviteEmail(a.user.id, `${randomUUID()}@example.test`),
      ).rejects.toThrow('Не удалось отправить');
      expect((await partners.mine(a.user.id)).items).toEqual([]);
      mail.send.mockClear();
      const sent = await partners.inviteEmail(
        a.user.id,
        `${randomUUID()}@example.test`,
      );
      const token = mail.send.mock.calls[0][0].text.match(
        /partner-invitations\/([A-Za-z0-9_-]{43})/,
      )![1];
      await db.providerPartnership.update({
        where: { id: sent.id },
        data: { expiresAt: new Date(0) },
      });
      await expect(partners.invitation(token)).rejects.toThrow('истёк');
      await partners.respond(a.user.id, sent.id, 'cancel');
      await expect(partners.invitation(token)).rejects.toThrow();
    });

    it('reuses an email invitation after the recipient registers, including public profile email lookup', async () => {
      const a = await provider();
      const email = `${randomUUID()}@example.test`;
      const invitation = await partners.inviteEmail(a.user.id, email);
      const b = await provider('Зарегистрировался', email);
      expect((await partners.invite(a.user.id, b.profile.id)).id).toBe(
        invitation.id,
      );
      expect((await partners.mine(a.user.id)).items).toHaveLength(1);
      expect((await partners.mine(b.user.id)).items[0]).toMatchObject({
        incoming: true,
        status: 'PENDING',
      });
      const companyEmail = `${randomUUID()}@example.test`;
      await db.provider.update({
        where: { id: b.profile.id },
        data: { useOwnEmail: true, email: companyEmail },
      });
      expect((await partners.inviteEmail(a.user.id, companyEmail)).id).toBe(
        invitation.id,
      );
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('combines city, parent/subcategory and published service title filters; minimum search length is server enforced', async () => {
      const viewer = await provider();
      const target = await provider('Каталог');
      const city = await db.city.create({
        data: {
          name: 'Город партнёра',
          regionCode: '66',
          regionName: 'Область',
          garObjectId: BigInt(Date.now()),
          objectGuid: randomUUID(),
          typeName: 'г.',
          level: 5,
        },
      });
      const parent = await db.serviceCategory.create({
        data: { name: 'Земля', shortName: 'Земля', slug: randomUUID() },
      });
      const child = await db.serviceCategory.create({
        data: {
          name: 'Кадастр',
          shortName: 'Кадастр',
          slug: randomUUID(),
          parentId: parent.id,
        },
      });
      await db.service.create({
        data: {
          title: 'Межевание тестового участка',
          price: '1000',
          categoryId: child.id,
          providerId: target.profile.id,
          status: 'PUBLISHED',
          cities: { create: { cityId: city.id } },
        },
      });
      const result = await partners.directory(viewer.user.id, {
        cityId: city.id,
        categoryId: parent.id,
        subcategoryId: child.id,
        search: 'МЕЖ',
        page: 1,
      });
      expect(result.items.map((p) => p.id)).toEqual([target.profile.id]);
      expect(result.items[0].services[0].title).toContain('Межевание');
      await expect(
        partners.directory(viewer.user.id, { search: 'ме', page: 1 }),
      ).rejects.toThrow('3 символа');
      await expect(
        partners.directory(viewer.user.id, {
          categoryId: randomUUID(),
          subcategoryId: child.id,
          page: 1,
        }),
      ).rejects.toThrow('Подкатегория');
      expect(
        (
          await partners.directory(target.user.id, {
            search: 'тестового',
            page: 1,
          })
        ).items,
      ).toEqual([]);
    });

    it('searches surnames and organization names without services and intersects the service filters', async () => {
      const viewer = await provider('ИП Медведев М. П.');
      const person = await provider('ИП Медведев И. П.');
      const organization = await provider('ООО «Медведев Гео»');
      const other = await provider('Кадастровое бюро');
      const shortSurname = await provider('Олег Ли');
      const city = await db.city.create({
        data: {
          name: 'Город поиска по имени',
          regionCode: '66',
          regionName: 'Область',
          garObjectId: 900000000001n,
          objectGuid: randomUUID(),
          typeName: 'г.',
          level: 5,
        },
      });
      await db.provider.update({
        where: { id: person.profile.id },
        data: { cityId: city.id, type: 'SOLE_PROPRIETOR' },
      });
      const category = await db.serviceCategory.create({
        data: { name: 'Кадастр', shortName: 'Кадастр', slug: randomUUID() },
      });
      for (const profile of [organization.profile, other.profile]) {
        await db.service.create({
          data: {
            title: 'Межевание для Медведева',
            price: '1000',
            categoryId: category.id,
            providerId: profile.id,
            status: 'PUBLISHED',
          },
        });
      }
      const found = await partners.directory(viewer.user.id, {
        providerSearch: '  мЕдВеДеВ  ',
        page: 1,
      });
      expect(found.items).toHaveLength(2);
      expect(found.items.map((row) => row.id).sort()).toEqual(
        [person.profile.id, organization.profile.id].sort(),
      );
      expect(
        found.items.find((row) => row.id === person.profile.id)?.services,
      ).toEqual([]);
      expect(
        (
          await partners.directory(viewer.user.id, {
            providerSearch: 'Медведев',
            cityId: city.id,
            page: 1,
          })
        ).items.map((row) => row.id),
      ).toEqual([person.profile.id]);
      expect(
        (
          await partners.directory(viewer.user.id, {
            providerSearch: 'Медведев',
            search: 'межевание',
            categoryId: category.id,
            page: 1,
          })
        ).items.map((row) => row.id),
      ).toEqual([organization.profile.id]);
      for (const providerSearch of ['Л', 'Ли', '  Ли  ']) {
        await expect(
          partners.directory(viewer.user.id, { providerSearch, page: 1 }),
        ).rejects.toThrow('3 символа');
      }
      expect(
        (
          await partners.directory(viewer.user.id, {
            providerSearch: 'Олег',
            page: 1,
          })
        ).items.map((row) => row.id),
      ).toEqual([shortSurname.profile.id]);
    });

    it('returns ten providers at a time and detects the last page without exposing a total', async () => {
      const viewer = await provider();
      const profiles: string[] = [];
      for (let index = 1; index <= 21; index++) {
        const row = await provider(
          `Постраничный ${String(index).padStart(2, '0')}`,
        );
        profiles.push(row.profile.id);
      }
      const query = { providerSearch: 'Постраничный', page: 1 };
      const first = await partners.directory(viewer.user.id, query);
      const second = await partners.directory(viewer.user.id, {
        ...query,
        page: 2,
      });
      const last = await partners.directory(viewer.user.id, {
        ...query,
        page: 3,
      });
      expect(first.items.map((row) => row.id)).toEqual(profiles.slice(0, 10));
      expect(second.items.map((row) => row.id)).toEqual(profiles.slice(10, 20));
      expect(last.items.map((row) => row.id)).toEqual(profiles.slice(20));
      expect(first.hasMore).toBe(true);
      expect(second.hasMore).toBe(true);
      expect(last.hasMore).toBe(false);
      expect(first).not.toHaveProperty('total');
      await db.provider.update({
        where: { id: profiles[20] },
        data: { name: 'Вне выборки' },
      });
      const exactLast = await partners.directory(viewer.user.id, {
        ...query,
        page: 2,
      });
      expect(exactLast.items).toHaveLength(10);
      expect(exactLast.hasMore).toBe(false);
      const empty = await partners.directory(viewer.user.id, {
        ...query,
        page: 3,
      });
      expect(empty.items).toEqual([]);
      expect(empty.hasMore).toBe(false);
    });

    it('atomically transfers history and documents, clears assignment and passport grants, and removes former provider access', async () => {
      const { a, b, customer, request, conversation, message } =
        await requestFixture();
      const assignee = await member(a.profile.id, 'EMPLOYEE');
      const assigned = await db.providerMember.findUniqueOrThrow({
        where: {
          providerId_userId: { providerId: a.profile.id, userId: assignee.id },
        },
      });
      await db.request.update({
        where: { id: request.id },
        data: { assignedMemberId: assigned.id, dealTerms: { seller: 'old' } },
      });
      const file = await db.requestContractFile.create({
        data: {
          requestId: request.id,
          providerId: a.profile.id,
          role: 'PROVIDER_MISC',
          originalName: 'План.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10,
          sha256: 'hash',
          storageRelPath: 'fixture/plan',
        },
      });
      const doc = await db.requestDocumentRequest.create({
        data: {
          requestId: request.id,
          providerId: a.profile.id,
          title: 'Выписка',
        },
      });
      await db.passportAccessGrant.create({
        data: {
          requestId: request.id,
          kind: 'FORM',
          passportUserId: customer.id,
          providerId: a.profile.id,
          expiresAt: new Date(Date.now() + 10000),
        },
      });
      await delegate.delegate(a.user.id, request.id, b.profile.id, true);
      expect(
        await db.request.findUnique({ where: { id: request.id } }),
      ).toMatchObject({
        providerId: b.profile.id,
        assignedMemberId: null,
        dealTerms: null,
        totalAmountRubles: 10000,
      });
      expect(
        await db.requestContractFile.findUnique({ where: { id: file.id } }),
      ).toMatchObject({ providerId: b.profile.id });
      expect(
        await db.requestDocumentRequest.findUnique({ where: { id: doc.id } }),
      ).toMatchObject({ providerId: b.profile.id });
      expect(
        await db.passportAccessGrant.count({
          where: { requestId: request.id },
        }),
      ).toBe(0);
      for (const denied of [a.user.id, assignee.id]) {
        await expect(
          chat.listMessages(denied, conversation.id, {}),
        ).rejects.toThrow();
        await expect(
          chat.createMessage(denied, conversation.id, {
            body: 'late',
            clientMessageId: randomUUID(),
          }),
        ).rejects.toThrow();
      }
      expect(
        (await chat.listMessages(b.user.id, conversation.id, {})).map(
          (m) => m.id,
        ),
      ).toContain(message.id);
      expect(
        (await chat.listMessages(customer.id, conversation.id, {})).map(
          (m) => m.id,
        ),
      ).toContain(message.id);
      expect(
        (await chat.listInbox(a.user.id, 'provider')).find(
          (row) => row.serviceRequestId === request.id,
        ),
      ).toBeUndefined();
      expect(
        (await chat.listInbox(b.user.id, 'provider')).find(
          (row) => row.serviceRequestId === request.id,
        ),
      ).toBeDefined();
      await expect(
        requests.getProById(a.profile.id, request.id),
      ).rejects.toThrow();
      expect(await requests.getProById(b.profile.id, request.id)).toMatchObject(
        { providerId: b.profile.id },
      );
      expect(
        await db.requestEvent.findFirst({
          where: { requestId: request.id, type: 'DELEGATE_PARTNER' },
        }),
      ).toBeTruthy();
      expect(gateway.evictConversation).toHaveBeenCalledWith(conversation.id);
    });

    it.each([
      'contract',
      'payment',
      'signature',
      'approved',
      'closed',
    ] as const)(
      'rejects transfer with %s and leaves ownership unchanged',
      async (reason) => {
        const { a, b, request } = await requestFixture();
        if (reason === 'contract')
          await db.request.update({
            where: { id: request.id },
            data: { contractAcceptedAt: new Date() },
          });
        if (reason === 'payment')
          await db.requestPayment.create({
            data: {
              requestId: request.id,
              providerId: a.profile.id,
              amountRubles: 100,
              comment: 'Оплата',
              paidAt: new Date(),
            },
          });
        if (reason === 'closed')
          await db.request.update({
            where: { id: request.id },
            data: { status: 'CLOSED' },
          });
        if (reason === 'signature' || reason === 'approved')
          await db.requestContractFile.create({
            data: {
              requestId: request.id,
              providerId: a.profile.id,
              role:
                reason === 'signature'
                  ? 'CONTRACT_SIGNATURE'
                  : 'CONTRACT_DOCUMENT',
              status: reason === 'approved' ? 'APPROVED' : 'PENDING_CUSTOMER',
              originalName: 'Договор',
              mimeType: 'application/pdf',
              sizeBytes: 10,
              sha256: 'hash',
              storageRelPath: 'fixture/contract',
            },
          });
        await expect(
          delegate.delegate(a.user.id, request.id, b.profile.id, true),
        ).rejects.toThrow();
        expect(
          (await db.request.findUniqueOrThrow({ where: { id: request.id } }))
            .providerId,
        ).toBe(a.profile.id);
      },
    );

    it('requires confirmation and confirmed partnership, and serializes competing transfers', async () => {
      const { a, b, request } = await requestFixture();
      const c = await provider();
      await partners.invite(a.user.id, c.profile.id);
      await expect(
        delegate.delegate(a.user.id, request.id, b.profile.id, false),
      ).rejects.toThrow('Подтвердите');
      await expect(
        delegate.delegate(a.user.id, request.id, c.profile.id, true),
      ).rejects.toThrow('подтверждённого');
      await expect(
        delegate.delegate(c.user.id, request.id, b.profile.id, true),
      ).rejects.toThrow();
      const results = await Promise.allSettled([
        delegate.delegate(a.user.id, request.id, b.profile.id, true),
        delegate.delegate(a.user.id, request.id, b.profile.id, true),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        await db.requestEvent.count({
          where: { requestId: request.id, type: 'DELEGATE_PARTNER' },
        }),
      ).toBe(1);
    });

    it('merges an existing recipient conversation without losing either history', async () => {
      const { a, b, customer, request, conversation, message } =
        await requestFixture();
      const target = await db.conversation.create({
        data: {
          requestId: request.id,
          providerId: b.profile.id,
          customerUserId: customer.id,
          messages: {
            create: {
              body: 'Ранняя переписка партнёра',
              senderUserId: b.user.id,
              clientMessageId: randomUUID(),
            },
          },
        },
      });
      const duplicateClientId = await db.message.create({
        data: {
          conversationId: target.id,
          senderUserId: customer.id,
          clientMessageId: message.clientMessageId,
          body: 'Сообщение с тем же локальным ID в другом диалоге',
        },
      });
      await delegate.delegate(a.user.id, request.id, b.profile.id, true);
      expect(
        await db.conversation.findUnique({ where: { id: conversation.id } }),
      ).toBeNull();
      const history = await chat.listMessages(b.user.id, target.id, {});
      expect(history.map((row) => row.id)).toContain(message.id);
      expect(history.map((row) => row.id)).toContain(duplicateClientId.id);
      expect(history.map((row) => row.body)).toContain(
        'Ранняя переписка партнёра',
      );
      await expect(
        chat.listMessages(a.user.id, target.id, {}),
      ).rejects.toThrow();
    });

    it('rejects a message authorized just before delegation when its write starts afterwards', async () => {
      const { a, b, request, conversation } = await requestFixture();
      let release!: () => void;
      let ready!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const authorized = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const original: ChatService['assertConversationAccess'] = (...args) =>
        ChatService.prototype.assertConversationAccess.call(
          chat,
          ...args,
        ) as ReturnType<ChatService['assertConversationAccess']>;
      let held = false;
      const spy = vi
        .spyOn(chat, 'assertConversationAccess')
        .mockImplementation(async (...args) => {
          const result = await original(...args);
          if (args[0] === a.user.id && args[2] === 'write' && !held) {
            held = true;
            ready();
            await gate;
          }
          return result;
        });
      const sending = chat.createMessage(a.user.id, conversation.id, {
        body: 'Запоздалое сообщение',
        clientMessageId: randomUUID(),
      });
      try {
        await authorized;
        await delegate.delegate(a.user.id, request.id, b.profile.id, true);
        release();
        await expect(sending).rejects.toThrow();
        expect(
          await db.message.count({
            where: {
              conversationId: conversation.id,
              body: 'Запоздалое сообщение',
            },
          }),
        ).toBe(0);
      } finally {
        release();
        spy.mockRestore();
      }
    });
  },
);
