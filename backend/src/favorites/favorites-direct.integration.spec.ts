import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FavoritesService } from './favorites.service';
import { shortCustomerName } from './favorite-policy';
import { PlanService } from '../billing/plan.service';
import { ChatService } from '../chat/chat.service';
import type { PrismaService } from '../prisma/prisma.service';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = `favorites_qa_${randomUUID().replaceAll('-', '')}`;
describe.skipIf(!local)(
  'favorites and direct chats on isolated PostgreSQL schema',
  () => {
    let db: PrismaClient;
    let admin: Pool;
    let favorites: FavoritesService;
    let chat: ChatService;
    const gateway = {
      emitMessageCreated: vi.fn(),
      emitDirectMessageCreated: vi.fn(),
      emitUnreadHint: vi.fn(),
      emitConversationChanged: vi.fn(),
    };
    beforeAll(async () => {
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
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
      const plans = new PlanService(prisma);
      favorites = new FavoritesService(prisma, plans);
      chat = new ChatService(prisma, {} as never, gateway as never, plans);
    }, 70000);
    afterAll(async () => {
      await db?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
      vi.unstubAllEnvs();
    });

    async function fixture() {
      const customer = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          name: 'Анна Петрова',
          firstName: 'Анна',
          lastName: 'Петрова',
          image: 'https://example.test/private-avatar.jpg',
        },
      });
      const owner = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          name: 'Owner',
          accountKind: 'PROVIDER',
        },
      });
      const manager = await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          accountKind: 'PROVIDER',
        },
      });
      const provider = await db.provider.create({
        data: {
          name: 'Тестовый исполнитель',
          slug: randomUUID(),
          type: 'COMPANY',
          ownerUserId: owner.id,
          members: {
            create: [
              { userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
              { userId: manager.id, role: 'MANAGER', status: 'ACTIVE' },
            ],
          },
          billingAccount: {
            create: {
              plan: 'BUSINESS',
              planExpiresAt: new Date(Date.now() + 86400000),
            },
          },
        },
      });
      await db.user.updateMany({
        where: { id: { in: [owner.id, manager.id] } },
        data: { activeProviderId: provider.id },
      });
      const category = await db.serviceCategory.create({
        data: { name: 'Работы', shortName: 'Работы', slug: randomUUID() },
      });
      const service = await db.service.create({
        data: {
          providerId: provider.id,
          categoryId: category.id,
          title: 'Межевание',
          status: 'PUBLISHED',
          price: '1000',
        },
      });
      const input = () => ({
        body: 'Могу помочь с межеванием.',
        clientMessageId: randomUUID(),
      });
      return { customer, owner, manager, provider, service, input };
    }

    it('saves independently and idempotently, counts unique clients and redacts unavailable services', async () => {
      const f = await fixture();
      await Promise.all([
        favorites.set(f.customer.id, 'services', f.service.id, true),
        favorites.set(f.customer.id, 'services', f.service.id, true),
      ]);
      await favorites.set(f.customer.id, 'providers', f.provider.id, true);
      const report = await favorites.interest(f.owner.id, { page: 0 });
      expect(report).toMatchObject({
        profileCount: 1,
        interestedCount: 1,
        services: [{ count: 1 }],
        items: [{ name: 'Анна П.', profile: true }],
      });
      expect(JSON.stringify(report)).not.toContain('Петрова');
      expect(JSON.stringify(report)).not.toContain('@example');
      await db.service.update({
        where: { id: f.service.id },
        data: { status: 'DRAFT', title: 'PRIVATE DRAFT' },
      });
      const list = await favorites.list(f.customer.id, 'services', 0);
      expect(list.items[0]).toMatchObject({ service: null });
      expect(JSON.stringify(list)).not.toContain('PRIVATE DRAFT');
      await favorites.set(f.customer.id, 'services', f.service.id, false);
      await favorites.set(f.customer.id, 'services', f.service.id, false);
      expect(
        await favorites.states(f.customer.id, [f.service.id], [f.provider.id]),
      ).toEqual({ services: [], providers: [f.provider.id] });
    });

    it('restricts names and new contact by tariff while keeping counts visible', async () => {
      const f = await fixture();
      await favorites.set(f.customer.id, 'providers', f.provider.id, true);
      await db.billingAccount.update({
        where: { providerId: f.provider.id },
        data: { plan: 'LITE' },
      });
      const report = await favorites.interest(f.owner.id, { page: 0 });
      expect(report).toMatchObject({
        canContact: false,
        profileCount: 1,
        interestedCount: 1,
        items: [],
      });
      await expect(
        chat.startDirect(f.owner.id, f.customer.id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      expect(
        await db.conversation.count({ where: { providerId: f.provider.id } }),
      ).toBe(0);
    });

    it('serializes competing first messages and supports retries, answer and expiry', async () => {
      const f = await fixture();
      await favorites.set(f.customer.id, 'services', f.service.id, true);
      const results = await Promise.all([
        chat.startDirect(f.owner.id, f.customer.id, f.input()),
        chat.startDirect(f.manager.id, f.customer.id, f.input()),
      ]);
      expect(results[0].conversationId).toBe(results[1].conversationId);
      const id = results[0].conversationId;
      expect(await db.message.count({ where: { conversationId: id } })).toBe(1);
      await expect(
        chat.createMessage(f.owner.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      await favorites.set(f.customer.id, 'services', f.service.id, false);
      await favorites.set(f.customer.id, 'services', f.service.id, true);
      await expect(
        chat.createMessage(f.manager.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      await db.billingAccount.update({
        where: { providerId: f.provider.id },
        data: { planExpiresAt: new Date(0) },
      });
      await expect(
        chat.createMessage(f.owner.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      const reply = {
        body: 'Здравствуйте, расскажите подробнее.',
        clientMessageId: randomUUID(),
      };
      const sent = await chat.createMessage(f.customer.id, id, reply);
      expect(sent.message).toMatchObject({
        senderName: 'Анна П.',
        senderImage: null,
      });
      await expect(
        chat.createMessage(f.customer.id, id, reply),
      ).resolves.toMatchObject({
        alreadyExisted: true,
        message: { id: sent.message.id },
      });
      await expect(
        chat.createMessage(f.customer.id, id, { ...reply, body: 'Changed' }),
      ).rejects.toMatchObject({ status: 409 });
      await chat.createMessage(f.owner.id, id, f.input());
      expect(
        await db.messengerOutbox.count({
          where: { message: { conversationId: id } },
        }),
      ).toBe(0);
      const history = await chat.listMessages(f.owner.id, id, {});
      expect(JSON.stringify(history)).not.toContain('Петрова');
      expect(JSON.stringify(history)).not.toContain('private-avatar');
      expect(gateway.emitDirectMessageCreated).toHaveBeenCalled();
    });

    it('enforces current interest and allows only the customer to unblock or resume', async () => {
      const f = await fixture();
      await favorites.set(f.customer.id, 'services', f.service.id, true);
      await db.service.update({
        where: { id: f.service.id },
        data: { status: 'ARCHIVED' },
      });
      await expect(
        chat.startDirect(f.owner.id, f.customer.id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      await favorites.set(f.customer.id, 'providers', f.provider.id, true);
      const { conversationId: id } = await chat.startDirect(
        f.owner.id,
        f.customer.id,
        f.input(),
      );
      await chat.changeDirectState(f.customer.id, id, 'decline');
      await expect(
        chat.createMessage(f.owner.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        chat.changeDirectState(f.owner.id, id, 'resume'),
      ).rejects.toMatchObject({ status: 403 });
      expect(await chat.changeDirectState(f.customer.id, id, 'resume')).toEqual(
        { directState: 'WAITING' },
      );
      await expect(
        chat.createMessage(f.owner.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      await chat.createMessage(f.customer.id, id, {
        body: 'Давайте обсудим',
        clientMessageId: randomUUID(),
      });
      await chat.createMessage(f.owner.id, id, f.input());
      await chat.changeDirectState(f.customer.id, id, 'block');
      await expect(
        chat.createMessage(f.manager.id, id, f.input()),
      ).rejects.toMatchObject({ status: 403 });
      expect(await chat.changeDirectState(f.customer.id, id, 'resume')).toEqual(
        { directState: 'ACTIVE' },
      );
      await chat.changeDirectState(f.customer.id, id, 'block');
      await favorites.set(f.customer.id, 'providers', f.provider.id, false);
      expect(
        (await chat.startDirect(f.manager.id, f.customer.id, f.input()))
          .conversationId,
      ).toBe(id);
      expect(
        (await chat.getConversationAccess(f.manager.id, id)).reasonCode,
      ).toBe('DIRECT_BLOCKED');
      await db.providerMember.update({
        where: {
          providerId_userId: {
            providerId: f.provider.id,
            userId: f.manager.id,
          },
        },
        data: { status: 'SUSPENDED' },
      });
      await expect(
        chat.listMessages(f.manager.id, id, {}),
      ).rejects.toMatchObject({ status: 403 });
      const other = await fixture();
      await expect(
        chat.listMessages(other.owner.id, id, {}),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('restores direct inbox unread counts and marks reads without exposing client names', async () => {
      const f = await fixture();
      await favorites.set(f.customer.id, 'providers', f.provider.id, true);
      const { conversationId: id } = await chat.startDirect(
        f.owner.id,
        f.customer.id,
        f.input(),
      );
      expect(await chat.listInbox(f.customer.id, 'customer')).toEqual([
        expect.objectContaining({
          kind: 'DIRECT',
          serviceRequestId: null,
          unreadCount: 1,
        }),
      ]);
      await chat.markRead(f.customer.id, id);
      expect(
        (await chat.listInbox(f.customer.id, 'customer'))[0].unreadCount,
      ).toBe(0);
      expect((await chat.listInbox(f.owner.id, 'provider'))[0].peerName).toBe(
        'Анна П.',
      );
      expect(
        await db.conversation.count({
          where: { kind: 'REQUEST', providerId: f.provider.id },
        }),
      ).toBe(0);
    });
  },
);

describe('customer display names', () => {
  it('uses only a first name and surname initial, never an email', () => {
    expect(shortCustomerName({ name: 'Иван Сидоров' })).toBe('Иван С.');
    expect(shortCustomerName({ name: 'person@example.test' })).toBe('Клиент');
    expect(shortCustomerName({ firstName: 'Мария' })).toBe('Мария');
    expect(shortCustomerName({})).toBe('Клиент');
  });
});
