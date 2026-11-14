import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { PlanService } from '../billing/plan.service';
import { ChatService } from '../chat/chat.service';
import { ProviderTeamService } from './provider-team.service';
import { ProvidersService } from './providers.service';
import { RequestAssignmentsService } from '../requests/request-assignments.service';
import { assignedMemberSelect } from '../requests/request-assignment';
import {
  requestRowToCustomerDtoPlain,
  requestRowToProDtoPlain,
} from '../requests/dto/request.dto';
import type { OutboundMail } from '../auth/mail/mail-sender';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = `team_qa_${randomUUID().replaceAll('-', '')}`;

describe.skipIf(!local)(
  'team invitations, roles and assignments on isolated PostgreSQL',
  () => {
    let db: PrismaClient;
    let admin: Pool;
    let auth: AuthService;
    let team: ProviderTeamService;
    let providers: ProvidersService;
    let assignments: RequestAssignmentsService;
    let chat: ChatService;
    let plans: PlanService;
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
      isUserOnline: vi.fn<(userId: string) => boolean>(),
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
      auth = new AuthService(prisma, {} as never);
      team = new ProviderTeamService(prisma, auth, mail);
      providers = new ProvidersService(prisma, auth, {} as never, {} as never);
      assignments = new RequestAssignmentsService(
        prisma,
        auth,
        gateway as never,
      );
      plans = new PlanService(prisma);
      chat = new ChatService(prisma, {} as never, gateway as never, plans);
    }, 70000);

    afterAll(async () => {
      await db?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
    });

    async function person(accountKind: 'PROVIDER' | 'CUSTOMER' = 'PROVIDER') {
      return db.user.create({
        data: { email: `${randomUUID()}@example.test`, accountKind },
      });
    }

    async function fixture() {
      const owner = await person();
      const provider = await db.provider.create({
        data: {
          ownerUserId: owner.id,
          name: 'ООО «Бурый медведь»',
          slug: randomUUID(),
          type: 'COMPANY',
          members: {
            create: {
              userId: owner.id,
              role: 'OWNER',
              jobTitle: 'Руководитель',
              status: 'ACTIVE',
            },
          },
        },
      });
      await db.user.update({
        where: { id: owner.id },
        data: { activeProviderId: provider.id },
      });
      return { owner, provider };
    }

    function latestToken() {
      const message = mail.send.mock.calls.at(-1)![0];
      return message.text.match(/\/team-invitations\/([A-Za-z0-9_-]{43})/)![1];
    }

    async function invite(
      f: Awaited<ReturnType<typeof fixture>>,
      role: 'EMPLOYEE' | 'MANAGER' = 'EMPLOYEE',
    ) {
      const user = await person();
      const invitation = await team.invite(f.owner.id, f.provider.id, {
        email: user.email,
        jobTitle: '  Кадастровый   инженер ',
        role,
      });
      return { user, invitation, token: latestToken() };
    }

    it('sends the title and auth links, grants no access until acceptance, then exposes only public team fields', async () => {
      const f = await fixture();
      const invited = await invite(f);
      expect(mail.send.mock.calls.at(-1)![0].text).toContain(
        'Должность: Кадастровый инженер.',
      );
      expect(mail.send.mock.calls.at(-1)![0].text).toContain(
        '/signup?account=provider&returnTo=',
      );
      expect(mail.send.mock.calls.at(-1)![0].text).toContain(
        '/signin?returnTo=',
      );
      expect(
        await db.providerMember.count({ where: { userId: invited.user.id } }),
      ).toBe(0);
      expect(
        (await providers.getPublicProviderProfile(f.provider.id)).team,
      ).toHaveLength(1);
      expect(JSON.stringify(invited.invitation)).not.toContain(invited.token);
      expect(await team.getInvitation(invited.token)).toMatchObject({
        jobTitle: 'Кадастровый инженер',
        role: 'EMPLOYEE',
        accepted: false,
      });
      const result = await team.accept(invited.user.id, invited.token, {
        firstName: 'Иван',
        lastName: 'Иванов',
      });
      expect(result).toMatchObject({
        activeProviderId: f.provider.id,
        memberships: [{ role: 'EMPLOYEE', jobTitle: 'Кадастровый инженер' }],
      });
      const profile = await providers.getPublicProviderProfile(f.provider.id);
      expect(profile.jobTitle).toBe('Руководитель');
      expect(profile.team).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Иван Иванов',
            jobTitle: 'Кадастровый инженер',
          }),
        ]),
      );
      expect(JSON.stringify(profile.team)).not.toContain('@');
      expect(JSON.stringify(profile.team)).not.toContain('token');
      expect(
        await db.provider.count({ where: { ownerUserId: invited.user.id } }),
      ).toBe(0);
      await expect(
        team.accept(invited.user.id, invited.token, {}),
      ).resolves.toMatchObject({ id: invited.user.id });
      const member = await db.providerMember.findFirstOrThrow({
        where: { userId: invited.user.id },
      });
      await team.updateJobTitle(
        f.owner.id,
        f.provider.id,
        member.id,
        'Геодезист',
      );
      expect(
        (await providers.getPublicProviderProfile(f.provider.id)).team,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ jobTitle: 'Геодезист' }),
        ]),
      );
    });

    it('binds acceptance to the intended email, enforces expiry/revocation and does not create a membership on mail failure', async () => {
      const f = await fixture();
      const a = await invite(f);
      const wrong = await person();
      await expect(
        team.accept(wrong.id, a.token, {
          firstName: 'Другой',
          lastName: 'Человек',
        }),
      ).rejects.toThrow('email');
      await expect(
        team.invite(f.owner.id, f.provider.id, {
          email: a.user.email,
          jobTitle: 'Геодезист',
          role: 'MANAGER',
        }),
      ).rejects.toThrow('минуту');
      await db.providerTeamInvitation.update({
        where: { id: a.invitation.id },
        data: { expiresAt: new Date(0) },
      });
      await expect(
        team.accept(a.user.id, a.token, {
          firstName: 'Иван',
          lastName: 'Иванов',
        }),
      ).rejects.toThrow('истёк');
      const b = await invite(f);
      await team.revoke(f.owner.id, f.provider.id, b.invitation.id);
      await expect(team.getInvitation(b.token)).rejects.toThrow(
        'недействительно',
      );
      const failed = await person();
      mail.send.mockRejectedValueOnce(new Error('transport unavailable'));
      await expect(
        team.invite(f.owner.id, f.provider.id, {
          email: failed.email,
          jobTitle: 'Инженер',
          role: 'EMPLOYEE',
        }),
      ).rejects.toThrow('Не удалось отправить');
      expect(
        await db.providerTeamInvitation.count({
          where: { email: failed.email },
        }),
      ).toBe(0);
      expect(
        await db.providerMember.count({
          where: {
            userId: { in: [a.user.id, b.user.id, wrong.id, failed.id] },
          },
        }),
      ).toBe(0);
    });

    it('serializes acceptance and resending, invalidates old links and preserves owner-only team management', async () => {
      const f = await fixture();
      const a = await invite(f, 'MANAGER');
      await db.providerTeamInvitation.update({
        where: { id: a.invitation.id },
        data: { sentAt: new Date(0) },
      });
      await team.invite(f.owner.id, f.provider.id, {
        email: a.user.email,
        jobTitle: 'Менеджер',
        role: 'MANAGER',
      });
      const token = latestToken();
      await expect(team.getInvitation(a.token)).rejects.toThrow(
        'недействительно',
      );
      await Promise.all([
        team.accept(a.user.id, token, {
          firstName: 'Анна',
          lastName: 'Петрова',
        }),
        team.accept(a.user.id, token, {
          firstName: 'Анна',
          lastName: 'Петрова',
        }),
      ]);
      expect(
        await db.providerMember.count({
          where: { userId: a.user.id, providerId: f.provider.id },
        }),
      ).toBe(1);
      expect(
        await auth.getServiceManagementContext(a.user.id, 'update'),
      ).toMatchObject({ providerRole: 'MANAGER' });
      await expect(
        team.invite(a.user.id, f.provider.id, {
          email: 'third@example.test',
          jobTitle: 'Инженер',
          role: 'EMPLOYEE',
        }),
      ).rejects.toThrow('владелец');
      expect(
        await providers.getProviderMembers(a.user.id, f.provider.id),
      ).not.toHaveProperty('teamInvitations');
    });

    it('allows only assigned request/chat access for employees and removes it on reassignment', async () => {
      const f = await fixture();
      const a = await invite(f);
      const b = await invite(f);
      await team.accept(a.user.id, a.token, {
        firstName: 'Иван',
        lastName: 'Иванов',
      });
      await team.accept(b.user.id, b.token, {
        firstName: 'Анна',
        lastName: 'Петрова',
      });
      const members = await db.providerMember.findMany({
        where: { providerId: f.provider.id },
      });
      const memberA = members.find((m) => m.userId === a.user.id)!;
      const memberB = members.find((m) => m.userId === b.user.id)!;
      const customer = await person('CUSTOMER');
      const category = await db.serviceCategory.create({
        data: { name: 'Работы', shortName: 'Работы', slug: randomUUID() },
      });
      const service = await db.service.create({
        data: {
          providerId: f.provider.id,
          categoryId: category.id,
          title: 'Межевание',
          price: '1000',
          status: 'PUBLISHED',
        },
      });
      const request = await db.request.create({
        data: {
          providerId: f.provider.id,
          serviceId: service.id,
          customerUserId: customer.id,
          status: 'ACTIVE',
          lockedAt: new Date(),
        },
      });
      const otherRequest = await db.request.create({
        data: {
          providerId: f.provider.id,
          serviceId: service.id,
          customerUserId: customer.id,
          lockedAt: new Date(),
        },
      });
      await expect(
        assignments.assign(a.user.id, request.id, memberA.id),
      ).rejects.toThrow();
      const foreign = await fixture();
      const foreignMember = await db.providerMember.findFirstOrThrow({
        where: { providerId: foreign.provider.id },
      });
      await expect(
        assignments.assign(f.owner.id, request.id, foreignMember.id),
      ).rejects.toThrow('этой команды');
      await assignments.assign(f.owner.id, request.id, memberA.id);
      expect(await assignments.listAssigned(a.user.id)).toMatchObject({
        items: [
          {
            id: request.id,
            providerName: f.provider.name,
            assignedMember: {
              name: 'Иван Иванов',
              jobTitle: 'Кадастровый инженер',
            },
          },
        ],
      });
      await expect(
        assignments.listAssigned(b.user.id, request.id),
      ).rejects.toThrow('не назначена');
      await expect(
        assignments.listAssigned(a.user.id, otherRequest.id),
      ).rejects.toThrow('не назначена');
      await expect(
        auth.getServiceManagementContext(a.user.id, 'update'),
      ).rejects.toThrow();
      await expect(
        auth.getOrderManagementContext(a.user.id, 'read'),
      ).rejects.toThrow();
      await expect(plans.member(a.user.id, f.provider.id)).rejects.toThrow();
      await expect(
        providers.getProviderMembers(a.user.id, f.provider.id),
      ).rejects.toThrow();
      expect(
        await providers.getPublicProviderProfile(f.provider.id, a.user.id),
      ).not.toHaveProperty('ownerEmail');
      const row = await db.request.findUniqueOrThrow({
        where: { id: request.id },
        include: {
          provider: true,
          assignedMember: { select: assignedMemberSelect },
        },
      });
      expect(requestRowToCustomerDtoPlain(row)).toMatchObject({
        providerName: f.provider.name,
        assignedMember: {
          name: 'Иван Иванов',
          jobTitle: 'Кадастровый инженер',
        },
      });
      expect(requestRowToProDtoPlain(row, 0, f.provider.id)).toMatchObject({
        providerName: f.provider.name,
        assignedMember: { name: 'Иван Иванов' },
      });
      const conversation = await chat.ensureServiceRequestConversation(
        a.user.id,
        request.id,
      );
      await expect(
        chat.ensureServiceRequestConversation(a.user.id, otherRequest.id),
      ).rejects.toThrow();
      await expect(
        chat.assertConversationAccess(
          b.user.id,
          conversation.conversationId,
          'read',
        ),
      ).rejects.toThrow();
      await chat.createMessage(a.user.id, conversation.conversationId, {
        body: 'Здравствуйте',
        clientMessageId: randomUUID(),
      });
      expect(await chat.listInbox(a.user.id, 'provider')).toHaveLength(1);
      expect(await chat.listInbox(b.user.id, 'provider')).toHaveLength(0);
      expect(gateway.emitMessageCreated.mock.calls.at(-1)?.[2]).toContain(
        a.user.id,
      );
      expect(gateway.emitMessageCreated.mock.calls.at(-1)?.[2]).not.toContain(
        b.user.id,
      );
      await assignments.assign(f.owner.id, request.id, memberB.id);
      await expect(
        chat.assertConversationAccess(
          a.user.id,
          conversation.conversationId,
          'read',
        ),
      ).rejects.toThrow();
      await expect(
        chat.createMessage(a.user.id, conversation.conversationId, {
          body: 'Нельзя',
          clientMessageId: randomUUID(),
        }),
      ).rejects.toThrow();
      await chat.createMessage(customer.id, conversation.conversationId, {
        body: 'Новый сотрудник',
        clientMessageId: randomUUID(),
      });
      expect(gateway.emitMessageCreated.mock.calls.at(-1)?.[2]).not.toContain(
        a.user.id,
      );
      expect(gateway.emitMessageCreated.mock.calls.at(-1)?.[2]).toContain(
        b.user.id,
      );
      expect(await assignments.listAssigned(a.user.id)).toEqual({ items: [] });
      const direct = await db.conversation.create({
        data: {
          kind: 'DIRECT',
          directState: 'WAITING',
          providerId: f.provider.id,
          customerUserId: customer.id,
        },
      });
      await expect(
        chat.assertConversationAccess(b.user.id, direct.id, 'read'),
      ).rejects.toThrow();
      gateway.isUserOnline.mockImplementation((id) => id === b.user.id);
      await chat.notifyPresenceChanged(b.user.id);
      expect(gateway.emitPresenceUpdated).toHaveBeenCalledWith(
        conversation.conversationId,
        expect.objectContaining({ providerOnline: true }),
      );
      expect(gateway.emitPresenceUpdated).toHaveBeenCalledWith(
        direct.id,
        expect.objectContaining({ providerOnline: false }),
      );
      await assignments.assign(f.owner.id, request.id, null);
      await expect(
        chat.assertConversationAccess(
          b.user.id,
          conversation.conversationId,
          'read',
        ),
      ).rejects.toThrow();
    });
  },
);
