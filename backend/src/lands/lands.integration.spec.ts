import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../billing/plan.service';
import { ServicesService } from '../services/services.service';
import { LandsService } from './lands.service';
import { LandChatService } from '../chat/land-chat.service';
import { ChatService } from '../chat/chat.service';
import { LandMediaService } from './land-media.service';
import { RequestsService } from '../requests/requests.service';
import sharp from 'sharp';

const url = process.env.LANDS_TEST_DATABASE_URL;
const allowed = (() => {
  try {
    const u = new URL(url ?? '');
    return (
      ['127.0.0.1', 'localhost'].includes(u.hostname) &&
      u.pathname === '/lands_qa'
    );
  } catch {
    return false;
  }
})();
const base = {
  kind: 'SALE',
  title: 'Тестовый земельный участок',
  description: 'Синтетическое объявление для проверки связей раздела.',
  cadastralNumber: `66:41:0000000:${Date.now().toString().slice(-9)}`,
  address: 'Тестовый населённый пункт',
  category: 'SETTLEMENT',
  permittedUses: ['ИЖС 2.1'],
  purposes: ['HOME'],
  areaM2: 1200,
  latitude: 56.8,
  longitude: 60.6,
  priceRubles: 1000000,
};

describe.skipIf(!allowed)(
  'land relationships in an isolated PostgreSQL',
  () => {
    let db: PrismaClient,
      lands: LandsService,
      services: ServicesService,
      chat: ChatService,
      media: LandMediaService;
    const ids = {
      seller: randomUUID(),
      buyer: randomUUID(),
      stranger: randomUUID(),
      owner: randomUUID(),
      employee: randomUUID(),
      admin: randomUUID(),
      provider: randomUUID(),
    };
    const stored = new Map<string, Buffer>();
    const gateway = {
      emitConversationChanged: vi.fn(),
      emitDirectMessageCreated: vi.fn(),
      emitUnreadHint: vi.fn(),
      isUserOnline: vi.fn(() => false),
      emitPresenceUpdated: vi.fn(),
    };
    beforeAll(async () => {
      db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url! }),
      });
      const prisma = db as PrismaService;
      services = new ServicesService(
        prisma,
        {} as never,
        {} as never,
        {} as never,
        new PlanService(prisma),
      );
      lands = new LandsService(prisma, services, new PlanService(prisma));
      chat = new ChatService(prisma, {} as never, gateway as never);
      media = new LandMediaService(prisma, lands, {
        putObject: (x: { Key: string; Body: Buffer }) => {
          stored.set(x.Key, x.Body);
          return Promise.resolve();
        },
        getObject: (key: string) =>
          Promise.resolve({
            Body: {
              transformToByteArray: () => Promise.resolve(stored.get(key)!),
            },
          }),
        deleteObject: (key: string) => {
          stored.delete(key);
          return Promise.resolve();
        },
      } as never);
      await db.user.createMany({
        data: Object.entries(ids)
          .filter(([k]) => k !== 'provider')
          .map(([k, id]) => ({
            id,
            email: `${id}@lands.example.test`,
            firstName: k,
            systemRole: k === 'admin' ? 'PLATFORM_ADMIN' : 'CUSTOMER',
            accountKind:
              k === 'owner' || k === 'employee' ? 'PROVIDER' : 'CUSTOMER',
          })),
      });
      await db.provider.create({
        data: {
          id: ids.provider,
          name: 'Тестовый подбор',
          slug: ids.provider,
          type: 'INDIVIDUAL',
          ownerUserId: ids.owner,
          members: {
            create: [
              { userId: ids.owner, role: 'OWNER', status: 'ACTIVE' },
              { userId: ids.employee, role: 'EMPLOYEE', status: 'ACTIVE' },
            ],
          },
        },
      });
      await db.user.updateMany({
        where: { id: { in: [ids.owner, ids.employee] } },
        data: { activeProviderId: ids.provider },
      });
    });
    afterAll(async () => {
      if (!db) return;
      const rows = await db.landListing.findMany({
        where: { authorUserId: { in: Object.values(ids) } },
        select: { id: true, serviceId: true, parcelId: true },
      });
      const listingIds = rows.map((r) => r.id);
      await db.conversation.deleteMany({
        where: { landListingId: { in: listingIds } },
      });
      await db.landListing.deleteMany({ where: { id: { in: listingIds } } });
      await db.service.deleteMany({
        where: {
          id: { in: rows.flatMap((r) => (r.serviceId ? [r.serviceId] : [])) },
        },
      });
      await db.landParcel.deleteMany({
        where: {
          id: { in: rows.flatMap((r) => (r.parcelId ? [r.parcelId] : [])) },
          listings: { none: {} },
        },
      });
      await db.landObjectCleanup.deleteMany({
        where: {
          OR: listingIds.map((id) => ({
            objectKey: { startsWith: `documents/lands/${id}/` },
          })),
        },
      });
      await db.provider.delete({ where: { id: ids.provider } });
      await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
      await db.$disconnect();
    });
    async function publish(userId: string, raw: unknown = base) {
      const actor = await lands.actor(userId),
        admin = await lands.actor(ids.admin);
      let row = await lands.create(actor, raw);
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'submit',
      });
      row = await lands.review(admin, row.id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      return row;
    }
    it('allows incomplete drafts, isolates owners, rejects status injection and stale writes', async () => {
      const actor = await lands.actor(ids.seller);
      const draft = await lands.create(actor, {
        status: 'PUBLISHED',
        documentStatus: 'VERIFIED',
      });
      expect(draft.status).toBe('DRAFT');
      expect(draft.documentStatus).toBe('NOT_REQUESTED');
      await expect(lands.detail(draft.id)).rejects.toThrow();
      await expect(
        lands.update(await lands.actor(ids.stranger), draft.id, {
          ...base,
          version: draft.version,
        }),
      ).rejects.toThrow(/доступ/);
      await expect(
        lands.action(actor, draft.id, {
          version: draft.version,
          action: 'submit',
        }),
      ).rejects.toThrow(/поля/);
      const updated = await lands.update(actor, draft.id, {
        ...base,
        version: draft.version,
      });
      await expect(
        lands.update(actor, draft.id, { ...base, version: draft.version }),
      ).rejects.toThrow(/изменилось/);
      await lands.delete(actor, updated.id, updated.version);
    });
    it('groups multiple offers of the same parcel without overwriting seller assertions', async () => {
      const whole = await publish(ids.seller);
      const share = await publish(ids.stranger, {
        ...base,
        title: 'Доля в тестовом участке',
        areaM2: 1500,
        purposes: ['DACHA'],
        dealType: 'SHARE',
        details: {
          shareNumerator: 1,
          shareDenominator: 2,
          useAgreement: 'Неизвестно',
          coOwnerNotice: 'Неизвестно',
        },
      });
      const map = await lands.catalog({ map: '1', q: base.cadastralNumber });
      expect(map.markers).toHaveLength(1);
      expect(map.markers[0].listingIds).toEqual(
        expect.arrayContaining([whole.id, share.id]),
      );
      expect(map.items.find((r) => r.id === whole.id)?.areaM2).toBe(1200);
      expect(map.items.find((r) => r.id === share.id)?.areaM2).toBe(1500);
      const filtered = await lands.catalog({
        purpose: 'HOME,DACHA',
        q: base.cadastralNumber,
      });
      expect(filtered.total).toBe(2);
      expect(filtered.items.map((r) => r.id)).toEqual(
        expect.arrayContaining([whole.id, share.id]),
      );
      const filteredMap = await lands.catalog({
        map: '1',
        purpose: 'DACHA,FARM',
        q: base.cadastralNumber,
      });
      expect(filteredMap.total).toBe(1);
      expect(filteredMap.markers[0].listingIds).toEqual([share.id]);
      const legacy = await lands.catalog({
        purpose: 'HOME',
        q: base.cadastralNumber,
      });
      expect(legacy.items.map((r) => r.id)).toEqual([whole.id]);
      await expect(lands.catalog({ purpose: 'HOME,UNKNOWN' })).rejects.toThrow(
        /Некорректный фильтр purpose/,
      );
      expect(
        (await lands.catalog({ restrictions: 'NO', q: base.cadastralNumber }))
          .total,
      ).toBe(0);
      expect(
        (await lands.catalog({ minPrice: '2000000', q: base.cadastralNumber }))
          .total,
      ).toBe(0);
      expect(
        (await lands.catalog({ bbox: '0,0,1,1', q: base.cadastralNumber }))
          .total,
      ).toBe(0);
    });
    it('keeps the approved sale on its original URL throughout editing and moderation', async () => {
      const seller = await lands.actor(ids.seller);
      const buyer = await lands.actor(ids.buyer);
      const admin = await lands.actor(ids.admin);
      const title = `Продажа ${randomUUID()}`;
      const changes = {
        ...base,
        title: `Правки ${randomUUID()}`,
        priceRubles: 3500000,
        address: 'Изменившийся адрес участка',
        longitude: 62,
        phone: '+79000000000',
        showPhone: true,
      };
      const published = await publish(ids.seller, { ...base, title });
      const id = published.id;
      const previous = {
        id,
        title,
        status: 'PUBLISHED',
        phone: '',
        address: base.address,
        priceRubles: base.priceRubles,
        longitude: base.longitude,
        version: published.version,
        updatedAt: published.updatedAt,
        publishedAt: published.publishedAt,
      };
      const updated = await lands.update(seller, id, {
        ...changes,
        version: published.version,
      });
      expect(updated).toMatchObject({
        title: changes.title,
        status: 'DRAFT',
        hasPublishedVersion: true,
      });
      expect(await lands.detail(id)).toMatchObject(previous);
      const submit = (version: number) =>
        lands.action(seller, id, { version, action: 'submit' });
      let pending = await submit(updated.version);
      expect(await lands.detail(id, buyer)).toMatchObject(previous);
      for (const actor of [seller, admin]) {
        expect(await lands.detail(id, actor)).toMatchObject({
          title: changes.title,
          status: 'PENDING',
        });
      }
      expect(
        (await lands.mine(seller)).filter((r) => r.id === id),
      ).toHaveLength(1);
      expect(
        (await lands.moderation(admin)).find((r) => r.id === id),
      ).toMatchObject({
        title: changes.title,
        status: 'PENDING',
        hasPublishedVersion: true,
      });
      await expect(
        lands.update(seller, id, { ...base, version: pending.version }),
      ).rejects.toThrow();
      await expect(
        lands.review(buyer, id, {
          version: pending.version,
          kind: 'CONTENT',
          decision: 'APPROVE',
        }),
      ).rejects.toThrow();
      await lands.favorite(buyer, id, true);
      const favoriteMap = await lands.catalog(
        {
          map: '1',
          q: title,
          favorites: '1',
          maxPrice: String(base.priceRubles),
          bbox: '60,56,61,57',
        },
        buyer,
      );
      expect(favoriteMap.items).toHaveLength(1);
      expect(favoriteMap.items[0]).toMatchObject(previous);
      expect(favoriteMap.markers[0]).toMatchObject({
        longitude: base.longitude,
        listingIds: [id],
      });
      expect((await lands.catalog({ q: changes.title })).total).toBe(0);
      expect(
        (await lands.sitemap()).find((r) => r.id === id)?.updatedAt,
      ).toEqual(published.updatedAt);
      const { conversationId } = await new LandChatService(
        db as PrismaService,
      ).start(ids.buyer, id);
      expect(conversationId).toBeTruthy();
      const rejected = await lands.review(admin, id, {
        version: pending.version,
        kind: 'CONTENT',
        decision: 'REJECT',
        reason: 'Уточните условия',
      });
      expect(rejected.status).toBe('CHANGES_REQUIRED');
      expect(await lands.detail(id)).toMatchObject(previous);
      expect((await lands.moderation(admin)).some((r) => r.id === id)).toBe(
        false,
      );
      pending = await submit(rejected.version);
      const recalled = await lands.action(seller, id, {
        version: pending.version,
        action: 'recall',
      });
      expect(recalled.status).toBe('DRAFT');
      expect(await lands.detail(id)).toMatchObject(previous);
      await expect(
        lands.review(admin, id, {
          version: pending.version,
          kind: 'CONTENT',
          decision: 'APPROVE',
        }),
      ).rejects.toThrow();
      pending = await submit(recalled.version);
      await lands.review(admin, id, {
        version: pending.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      expect(await lands.detail(id, buyer)).toMatchObject({
        id,
        title: changes.title,
        status: 'PUBLISHED',
        priceRubles: changes.priceRubles,
        longitude: changes.longitude,
        phone: changes.phone,
        favorite: true,
      });
      expect((await lands.catalog({ q: title })).total).toBe(0);
      const revisedMap = await lands.catalog({
        q: changes.title,
        map: '1',
        bbox: '61,56,63,57',
      });
      expect(revisedMap.markers[0]).toMatchObject({
        longitude: changes.longitude,
        listingIds: [id],
      });
    });
    it('checks parcel changes against conversations started during moderation', async () => {
      const seller = await lands.actor(ids.seller);
      const admin = await lands.actor(ids.admin);
      let row = await publish(ids.seller);
      row = await lands.update(seller, row.id, {
        ...base,
        cadastralNumber: '66:41:0000000:1234',
        version: row.version,
      });
      row = await lands.action(seller, row.id, {
        version: row.version,
        action: 'submit',
      });
      await new LandChatService(db as PrismaService).start(ids.buyer, row.id);
      await expect(
        lands.review(admin, row.id, {
          version: row.version,
          kind: 'CONTENT',
          decision: 'APPROVE',
        }),
      ).rejects.toThrow(/переписка/);
      expect(await lands.detail(row.id)).toMatchObject({
        status: 'PUBLISHED',
        cadastralNumber: base.cadastralNumber,
      });
      expect(await lands.detail(row.id, seller)).toMatchObject({
        status: 'PENDING',
        cadastralNumber: '66:41:0000000:1234',
      });
    });
    it('intersects directory city and multiple exact parcel numbers in both list and map results', async () => {
      const cityIds = [randomUUID(), randomUUID()];
      const stem = Date.now().toString().slice(-8);
      const cadastralNumbers = [
        `66:41:123456:${stem}1`,
        `66:41:1234567:${stem}2`,
        `77:41:1234567:${stem}3`,
      ];
      await db.city.createMany({
        data: cityIds.map((id, index) => ({
          id,
          objectGuid: id,
          garObjectId: BigInt('0x' + id.replaceAll('-', '').slice(0, 12)),
          name: 'Одноимённый',
          regionCode: index ? '77' : '66',
          regionName: index ? 'Москва' : 'Свердловская область',
          level: 5,
          typeName: 'г',
        })),
      });
      try {
        const rows: { id: string }[] = [];
        for (const [index, cadastralNumber] of cadastralNumbers.entries()) {
          rows.push(
            await publish(ids.seller, {
              ...base,
              cadastralNumber,
              cityId: cityIds[index === 2 ? 1 : 0],
              address: 'Одноимённый, Садовая улица',
              purposes: [index === 1 ? 'DACHA' : 'HOME'],
            }),
          );
        }
        const query = {
          cityId: cityIds[0],
          cadastralNumbers: cadastralNumbers.join(','),
          purpose: 'HOME,DACHA',
        };
        const list = await lands.catalog(query);
        const map = await lands.catalog({ ...query, map: '1' });
        const expected = rows
          .slice(0, 2)
          .map((r) => r.id)
          .sort();
        expect(list.items.map((r) => r.id).sort()).toEqual(expected);
        expect(list.city?.id).toBe(cityIds[0]);
        expect(
          map.markers.flatMap((marker) => marker.listingIds).sort(),
        ).toEqual(expected);
        expect(
          (await lands.catalog({ ...query, purpose: 'DACHA' })).total,
        ).toBe(1);
        expect(
          (await lands.catalog({ ...query, cityId: cityIds[1] })).items.map(
            (r) => r.id,
          ),
        ).toEqual([rows[2].id]);
        await expect(
          lands.catalog({ cadastralNumbers: '66:41' }),
        ).rejects.toThrow(/полный кадастровый номер/);
      } finally {
        await db.city.deleteMany({ where: { id: { in: cityIds } } });
      }
    });
    it('supports customer-to-customer chat, idempotent messages, unread counters and retained history after withdrawal', async () => {
      let row = await publish(ids.seller);
      const actor = await lands.actor(ids.seller);
      const landChat = new LandChatService(db as PrismaService);
      const [a, b] = await Promise.all([
        landChat.start(ids.buyer, row.id),
        landChat.start(ids.buyer, row.id),
      ]);
      expect(a.conversationId).toBe(b.conversationId);
      expect(
        await db.message.count({ where: { conversationId: a.conversationId } }),
      ).toBe(0);
      await expect(landChat.start(ids.seller, row.id)).rejects.toThrow(/ваше/);
      await expect(
        chat.assertConversationAccess(ids.stranger, a.conversationId, 'read'),
      ).rejects.toThrow();
      const input = {
        body: 'Расскажите об участке',
        clientMessageId: randomUUID(),
      };
      const first = await landChat.send(ids.buyer, a.conversationId, input);
      expect(
        (await landChat.send(ids.buyer, a.conversationId, input))
          .alreadyExisted,
      ).toBe(true);
      expect(
        (await chat.unreadSnapshot(ids.seller, 'customer')).find(
          (x) => x.conversationId === a.conversationId,
        )?.unreadCount,
      ).toBe(1);
      expect(
        (await chat.listInbox(ids.seller, 'customer')).find(
          (x) => x.conversationId === a.conversationId,
        )?.landListingId,
      ).toBe(row.id);
      await chat.markRead(ids.seller, a.conversationId);
      expect(
        (await chat.unreadSnapshot(ids.seller, 'customer')).find(
          (x) => x.conversationId === a.conversationId,
        )?.unreadCount,
      ).toBe(0);
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'withdraw',
        reason: 'Продано',
      });
      expect(await lands.detail(row.id)).toEqual({
        id: row.id,
        status: 'UNAVAILABLE',
        title: 'Предложение больше не доступно',
      });
      await landChat.send(ids.seller, a.conversationId, {
        body: 'Участок продан',
        clientMessageId: randomUUID(),
        replyToMessageId: first.message.id,
      });
      expect(
        await db.message.count({ where: { conversationId: a.conversationId } }),
      ).toBe(2);
      await expect(
        lands.update(actor, row.id, {
          ...base,
          cadastralNumber: '66:41:0000000:987654',
          version: row.version,
        }),
      ).rejects.toThrow(/переписка/);
    });
    it('restricts company ads and conversations to active managers; provider buyers retain their personal land chat', async () => {
      const owner = await lands.actor(ids.owner),
        employee = await lands.actor(ids.employee);
      await expect(
        lands.create(employee, { ...base, providerId: ids.provider }),
      ).rejects.toThrow(/доступ/);
      const row = await publish(ids.owner, {
        ...base,
        providerId: ids.provider,
      });
      const { conversationId } = await new LandChatService(
        db as PrismaService,
      ).start(ids.buyer, row.id);
      await expect(
        chat.assertConversationAccess(ids.owner, conversationId, 'read'),
      ).resolves.toBeTruthy();
      await expect(
        chat.assertConversationAccess(ids.employee, conversationId, 'read'),
      ).rejects.toThrow();
      await db.providerMember.update({
        where: {
          providerId_userId: { providerId: ids.provider, userId: ids.owner },
        },
        data: { status: 'SUSPENDED' },
      });
      await expect(
        chat.assertConversationAccess(ids.owner, conversationId, 'read'),
      ).rejects.toThrow();
      await expect(
        lands.update(await lands.actor(ids.owner), row.id, {
          ...base,
          version: row.version,
        }),
      ).rejects.toThrow();
      await db.providerMember.update({
        where: {
          providerId_userId: { providerId: ids.provider, userId: ids.owner },
        },
        data: { status: 'ACTIVE' },
      });
      const personal = await publish(ids.seller);
      const personalChat = await new LandChatService(db as PrismaService).start(
        ids.owner,
        personal.id,
      );
      expect(
        (await chat.listInbox(ids.owner, 'provider')).some(
          (c) => c.conversationId === personalChat.conversationId,
        ),
      ).toBe(true);
      expect(
        lands.canManage(owner, {
          providerId: ids.provider,
          authorUserId: ids.stranger,
        }),
      ).toBe(true);
    });
    it('keeps private documents private, checks photos against publication, resets verification and queues erasure', async () => {
      const actor = await lands.actor(ids.seller),
        admin = await lands.actor(ids.admin);
      let row = await lands.create(actor, base);
      row = await lands.update(actor, row.id, {
        ...row,
        details: { ...row.details, requestDocumentReview: true },
      });
      await expect(lands.detail(row.id, actor)).resolves.toHaveProperty(
        'details.requestDocumentReview',
        true,
      );
      expect(row.documentStatus).toBe('NOT_REQUESTED');
      await expect(
        lands.action(actor, row.id, {
          action: 'submit',
          version: row.version,
        }),
      ).rejects.toThrow(/загрузите документы/);
      const buffer = await sharp({
        create: { width: 20, height: 20, channels: 3, background: '#a0b4a0' },
      })
        .png()
        .toBuffer();
      await media.upload(actor, row.id, 'DOCUMENT', row.version, {
        buffer: Buffer.from('%PDF-1.7\nQA'),
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
        size: 12,
      } as Express.Multer.File);
      row = (await lands.detail(row.id, actor)) as typeof row;
      await media.upload(actor, row.id, 'PHOTO', row.version, {
        buffer,
        mimetype: 'image/png',
        originalname: 'photo.png',
        size: buffer.length,
      } as Express.Multer.File);
      row = (await lands.detail(row.id, actor)) as typeof row;
      const file = row.documents![0],
        photo = row.photos[0];
      await expect(media.get(file.id)).rejects.toThrow();
      await expect(
        media.get(file.id, await lands.actor(ids.buyer)),
      ).rejects.toThrow();
      await expect(media.get(file.id, admin)).resolves.toBeTruthy();
      await expect(media.get(photo.id)).rejects.toThrow();
      row = await lands.action(actor, row.id, {
        action: 'submit',
        version: row.version,
      });
      row = await lands.review(admin, row.id, {
        kind: 'DOCUMENT',
        decision: 'APPROVE',
        reason:
          'Проверено наличие кадастрового номера в предоставленной выписке',
        version: row.version,
      });
      expect(row.status).toBe('PENDING');
      expect(row.documentStatus).toBe('VERIFIED');
      row = await lands.review(admin, row.id, {
        kind: 'CONTENT',
        decision: 'APPROVE',
        version: row.version,
      });
      await expect(media.get(photo.id)).resolves.toBeTruthy();
      await expect(media.get(file.id)).rejects.toThrow();
      const published = await lands.detail(row.id);
      expect(published).not.toHaveProperty('documents');
      expect(published).not.toHaveProperty('details.requestDocumentReview');
      row = await lands.update(actor, row.id, {
        ...row,
        title: 'Обновлённое предложение',
        version: row.version,
      });
      expect(row.status).toBe('DRAFT');
      expect(row.documentStatus).toBe('NOT_REQUESTED');
      expect(await lands.detail(row.id)).toMatchObject({
        documentStatus: 'VERIFIED',
        documentCount: 1,
        photos: [photo],
      });
      const newUpload = await media.upload(
        actor,
        row.id,
        'PHOTO',
        row.version,
        {
          buffer,
          mimetype: 'image/png',
          originalname: 'new-photo.png',
          size: buffer.length,
        } as Express.Multer.File,
      );
      row = (await lands.detail(row.id, actor)) as typeof row;
      const newPhoto = row.photos[1];
      const cover = await media.change(
        actor,
        newPhoto.id,
        newUpload.version,
        true,
      );
      expect(await lands.detail(row.id, actor)).toMatchObject({
        photos: [newPhoto, photo],
      });
      await expect(media.get(newPhoto.id)).rejects.toThrow();
      await expect(media.get(newPhoto.id, admin)).resolves.toBeTruthy();
      const removed = await media.change(actor, photo.id, cover.version, false);
      const edited = await media.change(actor, file.id, removed.version, false);
      await media.cleanup();
      await expect(media.get(photo.id)).resolves.toBeTruthy();
      expect(stored.has(`documents/lands/${row.id}/${file.id}`)).toBe(true);
      row = await lands.action(actor, row.id, {
        version: edited.version,
        action: 'submit',
        verifyDocuments: false,
      });
      expect(await lands.detail(row.id)).toMatchObject({
        photos: [photo],
        documentCount: 1,
      });
      await lands.review(admin, row.id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      expect(await lands.detail(row.id)).toMatchObject({
        photos: [newPhoto],
        documentCount: 0,
        documentStatus: 'NOT_REQUESTED',
      });
      await expect(media.get(newPhoto.id)).resolves.toBeTruthy();
      await expect(media.get(photo.id)).rejects.toThrow();
      await media.cleanup();
      expect(stored.has(`documents/lands/${row.id}/${file.id}`)).toBe(false);
      expect(stored.has(`documents/lands/${row.id}/${photo.id}`)).toBe(false);
    });
    it('records document decisions for the correct version while both requests are outstanding', async () => {
      const seller = await lands.actor(ids.seller);
      const admin = await lands.actor(ids.admin);
      let row = await lands.create(seller, base);
      const id = row.id;
      const file = Buffer.from('%PDF-1.7\nQA');
      const upload = await media.upload(seller, id, 'DOCUMENT', row.version, {
        buffer: file,
        mimetype: 'application/pdf',
        originalname: 'original.pdf',
        size: file.length,
      } as Express.Multer.File);
      row = await lands.action(seller, id, {
        version: upload.version,
        action: 'submit',
        verifyDocuments: true,
      });
      row = await lands.review(admin, id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      const publishedVersion = row.version;
      const title = 'Уточнённая версия с документами';
      row = await lands.update(seller, id, {
        ...base,
        version: row.version,
        title,
      });
      row = await lands.action(seller, id, {
        version: row.version,
        action: 'submit',
        verifyDocuments: true,
      });
      const queue = (await lands.moderation(admin)).filter(
        (entry) => entry.id === id,
      );
      expect(queue).toMatchObject([
        {
          title: base.title,
          status: 'PUBLISHED',
          reviewPublishedDocuments: true,
        },
        { title, status: 'PENDING', documentStatus: 'REQUESTED' },
      ]);
      expect(await lands.detail(id, admin, true)).toMatchObject({
        title: base.title,
        status: 'PUBLISHED',
      });
      row = await lands.review(admin, id, {
        version: row.version,
        kind: 'DOCUMENT',
        decision: 'APPROVE',
        reason: 'Проверка исходной выписки',
        reviewPublishedDocuments: true,
      });
      expect(row).toMatchObject({
        title: base.title,
        status: 'PUBLISHED',
        documentStatus: 'VERIFIED',
      });
      expect(
        await db.landReview.findFirstOrThrow({
          where: { listingId: id, kind: 'DOCUMENT', decision: 'APPROVE' },
        }),
      ).toMatchObject({ listingVersion: publishedVersion });
      expect(await lands.detail(id)).toMatchObject({
        title: base.title,
        documentStatus: 'VERIFIED',
        documentReviewScope: 'Проверка исходной выписки',
      });
      expect(await lands.detail(id, seller)).toMatchObject({
        title,
        status: 'PENDING',
        documentStatus: 'REQUESTED',
      });
      row = await lands.review(admin, id, {
        version: row.version,
        kind: 'DOCUMENT',
        decision: 'APPROVE',
        reason: 'Проверка новой редакции выписки',
      });
      row = await lands.action(seller, id, {
        version: row.version,
        action: 'recall',
      });
      row = await lands.action(seller, id, {
        version: row.version,
        action: 'submit',
        verifyDocuments: true,
      });
      expect(row).toMatchObject({
        documentStatus: 'REQUESTED',
        documentReviewedAt: null,
        documentReviewScope: null,
      });
      expect(await lands.detail(id)).toMatchObject({
        documentStatus: 'VERIFIED',
        documentReviewScope: 'Проверка исходной выписки',
      });
      row = await lands.review(admin, id, {
        version: row.version,
        kind: 'DOCUMENT',
        decision: 'REJECT',
        reason: 'Требуется уточнение по правкам',
      });
      expect(await lands.detail(id)).toMatchObject({
        documentStatus: 'VERIFIED',
      });
      row = await lands.review(admin, id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      expect(await lands.detail(id)).toMatchObject({
        title,
        documentStatus: 'REJECTED',
        documentReviewScope: 'Требуется уточнение по правкам',
      });
    });
    it('publishes selection as a real service, blocks alternate edit routes and hides it on withdrawal', async () => {
      const actor = await lands.actor(ids.owner);
      await expect(
        lands.create(await lands.actor(ids.seller), { kind: 'SELECTION' }),
      ).rejects.toThrow(/исполнителя/);
      let row = await publish(ids.owner, {
        ...base,
        kind: 'SELECTION',
        providerId: ids.provider,
        details: {
          allRussia: true,
          scope: 'Найду варианты',
          result: 'Сравнение участков',
          timeline: 'Две недели',
          priceMode: 'FIXED',
          priceUnit: 'подбор',
        },
      });
      expect(row.cadastralNumber).toBe('');
      expect(row.serviceId).toBeTruthy();
      const service = await services.getServiceById(row.serviceId!);
      expect(service?.status).toBe('PUBLISHED');
      expect(service?.landListingId).toBe(row.id);
      await expect(
        services.updateService(
          row.serviceId!,
          { status: 'DRAFT' },
          { providerId: ids.provider },
        ),
      ).rejects.toThrow(/Мои объявления/);
      await expect(
        services.deleteService(row.serviceId!, { providerId: ids.provider }),
      ).rejects.toThrow();
      const requests = new RequestsService(
        db as PrismaService,
        {} as never,
        {} as never,
        {} as never,
        chat,
      );
      row = await lands.update(actor, row.id, {
        ...row,
        title: 'Подбор с новыми условиями',
      });
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'submit',
      });
      expect(await services.getServiceById(row.serviceId!)).toMatchObject({
        title: base.title,
        status: 'PUBLISHED',
      });
      expect(await lands.detail(row.id)).toMatchObject({
        title: base.title,
        serviceId: row.serviceId,
      });
      const request = await requests.createForService(
        row.serviceId!,
        ids.buyer,
        {
          message: 'Нужен подбор участка под дом',
          operationId: randomUUID(),
        },
      );
      expect(request.serviceId).toBe(row.serviceId);
      expect(request.providerId).toBe(ids.provider);
      // A price per unit is discussed in the existing request flow; it is not
      // silently treated as the final contract amount.
      expect(request.servicePriceRubles).toBeNull();
      const conversation = await chat.ensureServiceRequestConversation(
        ids.buyer,
        request.id,
      );
      expect(
        await db.conversation.findUnique({
          where: { id: conversation.conversationId },
        }),
      ).toMatchObject({
        kind: 'REQUEST',
        requestId: request.id,
        providerId: ids.provider,
        customerUserId: ids.buyer,
      });
      row = await lands.review(await lands.actor(ids.admin), row.id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      expect(await services.getServiceById(row.serviceId!)).toMatchObject({
        title: 'Подбор с новыми условиями',
      });
      row = await lands.update(actor, row.id, {
        ...row,
        title: 'Ещё одна правка',
      });
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'submit',
      });
      row = await lands.action(actor, row.id, {
        action: 'withdraw',
        version: row.version,
        reason: 'Временно неактуально',
      });
      expect(await lands.detail(row.id)).toMatchObject({
        status: 'UNAVAILABLE',
      });
      expect(
        (await lands.moderation(await lands.actor(ids.admin))).some(
          (r) => r.id === row.id,
        ),
      ).toBe(false);
      expect(await services.getServiceById(row.serviceId!)).toBeNull();
      await expect(
        requests.createForService(row.serviceId!, ids.buyer, {
          message: 'Повторный запрос',
        }),
      ).rejects.toThrow();
      await expect(
        chat.ensureServiceRequestConversation(ids.buyer, request.id),
      ).resolves.toMatchObject({ conversationId: conversation.conversationId });
      expect(
        await db.request.count({ where: { serviceId: row.serviceId } }),
      ).toBe(1);
      await db.request.deleteMany({ where: { serviceId: row.serviceId } });
      expect(row).toMatchObject({
        hasPublishedVersion: false,
        title: 'Ещё одна правка',
        status: 'WITHDRAWN',
      });
      row = await lands.action(actor, row.id, {
        action: 'submit',
        version: row.version,
      });
      expect(row).toMatchObject({
        status: 'PENDING',
        hasPublishedVersion: false,
      });
      expect(await lands.detail(row.id)).toMatchObject({
        status: 'UNAVAILABLE',
      });
      row = await lands.review(await lands.actor(ids.admin), row.id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      expect(await services.getServiceById(row.serviceId!)).toMatchObject({
        title: 'Ещё одна правка',
        status: 'PUBLISHED',
      });
    });
    it('prevents publishing a sale with missing area or price directly in the database', async () => {
      const row = await lands.create(await lands.actor(ids.seller), base);
      for (const field of ['areaM2', 'priceRubles'] as const) {
        await expect(
          db.landListing.update({
            where: { id: row.id },
            data: { status: 'PUBLISHED', [field]: null },
          }),
        ).rejects.toThrow();
      }
      expect(
        await db.landListing.findUnique({ where: { id: row.id } }),
      ).toMatchObject({
        status: 'DRAFT',
      });
    });
    it('rejects stale moderation, keeps favorite FK integrity and prevents illegal provider-less request chats', async () => {
      const actor = await lands.actor(ids.seller),
        admin = await lands.actor(ids.admin);
      let row = await lands.create(actor, base);
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'submit',
      });
      const version = row.version;
      await expect(lands.detail(row.id)).rejects.toThrow();
      expect((await lands.sitemap()).some((entry) => entry.id === row.id)).toBe(
        false,
      );
      row = await lands.action(actor, row.id, { version, action: 'recall' });
      await expect(
        lands.review(admin, row.id, {
          version,
          kind: 'CONTENT',
          decision: 'APPROVE',
        }),
      ).rejects.toThrow(/изменилось/);
      await expect(
        lands.favorite(await lands.actor(ids.buyer), row.id, true),
      ).rejects.toThrow();
      row = await lands.action(actor, row.id, {
        version: row.version,
        action: 'submit',
      });
      row = await lands.review(admin, row.id, {
        version: row.version,
        kind: 'CONTENT',
        decision: 'APPROVE',
      });
      await lands.favorite(await lands.actor(ids.buyer), row.id, true);
      await lands.favorite(await lands.actor(ids.buyer), row.id, true);
      expect(
        await db.landFavorite.count({
          where: { listingId: row.id, userId: ids.buyer },
        }),
      ).toBe(1);
      await expect(
        db.conversation.create({
          data: { kind: 'REQUEST', customerUserId: ids.buyer },
        }),
      ).rejects.toThrow();
    });
  },
);
