import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { RequestsController } from './requests.controller';
import type { RequestWithChanges } from './request-realtime.interceptor';
import { AuthService } from '../auth/auth.service';
import { ContractFilesService } from '../contract-files/contract-files.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ProviderClientsService } from '../provider-clients/provider-clients.service';
import { RequestWorkStagesService } from '../request-work-stages/request-work-stages.service';
import { ProviderWorkService } from './provider-work.service';
import { RequestsService } from './requests.service';

const url = process.env.DATABASE_URL;
const local = url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const schema = `private_work_${randomUUID().replaceAll('-', '')}`;

describe.skipIf(!local)('private client work on isolated PostgreSQL', () => {
  let pool: Pool;
  let db: PrismaClient;
  let work: ProviderWorkService;
  let clients: ProviderClientsService;
  let stages: RequestWorkStagesService;
  let files: ContractFilesService;
  let requests: RequestsService;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(`CREATE SCHEMA "${schema}"`);
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
    work = new ProviderWorkService(prisma, auth);
    clients = new ProviderClientsService(prisma, auth);
    stages = new RequestWorkStagesService(prisma, auth, {} as never);
    files = new ContractFilesService(prisma, auth, {} as never);
    requests = new RequestsService(
      prisma,
      auth,
      {} as never,
      {} as never,
      {} as never,
    );
  }, 70000);

  afterAll(async () => {
    await db?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  async function provider() {
    const owner = await db.user.create({
      data: {
        name: 'Иван Иванов',
        email: randomUUID() + '@example.test',
        accountKind: 'PROVIDER',
      },
    });
    const company = await db.provider.create({
      data: {
        ownerUserId: owner.id,
        name: 'Компания',
        slug: randomUUID(),
        type: 'COMPANY',
        members: {
          create: { userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
        },
      },
    });
    await db.user.update({
      where: { id: owner.id },
      data: { activeProviderId: company.id },
    });
    return { id: company.id, owner: owner.id };
  }

  it('keeps work private before and after joining, preserves notes/files visibility and separates completion from acceptance', async () => {
    const company = await provider();
    const other = await provider();
    const email = randomUUID() + '@example.test';
    const contact = await db.providerClient.create({
      data: { providerId: company.id, email, name: 'Клиент' },
    });
    const input = {
      message: '  Межевание участка  ',
      operationId: randomUUID(),
    };
    const created = await work.create(company.owner, contact.id, input);
    expect(await work.create(company.owner, contact.id, input)).toEqual(
      created,
    );
    const id = created.id;
    const actor = { actorUserId: company.owner, requestId: id };
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
    expect(await requests.getProById(company.id, id)).toMatchObject({
      providerWorkStatus: 'PLANNED',
      providerClientId: contact.id,
      customerUserId: null,
      message: 'Межевание участка',
    });
    await expect(requests.getProById(other.id, id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      work.create(other.owner, contact.id, input),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(work.history(other.owner, id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const noteInput = { text: 'Внутренняя заметка', operationId: randomUUID() };
    const note = await work.addNote(company.owner, id, noteInput);
    expect(await work.addNote(company.owner, id, noteInput)).toEqual(note);
    expect(await work.listNotes(company.owner, id)).toEqual([note]);
    await expect(work.listNotes(other.owner, id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await work.setStatus(company.owner, id, 'DONE');
    await work.setStatus(company.owner, id, 'DONE');
    const history = await work.history(company.owner, id);
    expect(
      history.events.map(({ status, authorName }) => ({ status, authorName })),
    ).toEqual([
      { status: 'DONE', authorName: 'Иван Иванов' },
      { status: 'PLANNED', authorName: 'Иван Иванов' },
    ]);
    expect(
      await db.request.findUniqueOrThrow({
        where: { id },
        include: { providerOffers: true },
      }),
    ).toMatchObject({
      status: 'DISCUSSING',
      providerWorkStatus: 'DONE',
      providerOffers: [],
      contractAcceptedAt: null,
      acceptedAt: null,
      autoAcceptAt: null,
    });

    const draft = await stages.createDraft({
      ...actor,
      title: 'Черновик',
      statusKey: 'DOC_COLLECTION',
    });
    const shared = await stages.createDraft({
      ...actor,
      title: 'Публикация',
      statusKey: 'DOC_COLLECTION',
    });
    await stages.publish({ ...actor, stageId: shared.id });
    expect((await stages.listForProvider(actor)).map((s) => s.id)).toEqual([
      draft.id,
      shared.id,
    ]);
    const fileData = {
      requestId: id,
      providerId: company.id,
      role: 'PROVIDER_MISC' as const,
      mimeType: 'text/plain',
      sizeBytes: 1,
      sha256: 'qa',
      storageRelPath: 'qa',
    };
    await db.requestContractFile.create({
      data: {
        ...fileData,
        originalName: 'internal.txt',
        visibleToCustomer: false,
      },
    });
    expect(await files.listMiscForProvider(actor)).toHaveLength(1);
    const customer = await db.user.create({
      data: { email, emailVerified: new Date(), accountKind: 'CUSTOMER' },
    });
    const customerActor = { actorUserId: customer.id, requestId: id };
    expect(await requests.listMine(customer.id)).toEqual([]);
    await expect(stages.listForCustomer(customerActor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const invite = await clients.issue(company.id, contact.id);
    await clients.accept(customer.id, invite.path.split('/').at(-1)!);
    expect(await requests.listMine(customer.id)).toMatchObject([
      { id, providerWorkStatus: 'DONE' },
    ]);
    expect(await requests.listMineWithDocuments(customer.id)).toEqual([]);
    expect(await stages.listForCustomer(customerActor)).toMatchObject([
      { id: shared.id },
    ]);
    expect(await files.listMiscForCustomer(customerActor)).toEqual([]);
    await db.requestContractFile.create({
      data: {
        ...fileData,
        originalName: 'public.txt',
        visibleToCustomer: true,
      },
    });
    expect(await files.listMiscForCustomer(customerActor)).toMatchObject([
      { originalName: 'public.txt' },
    ]);
    expect(await requests.listMineWithDocuments(customer.id)).toEqual([id]);
    await expect(work.listNotes(customer.id, id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(await requests.getProById(company.id, id)).toMatchObject({
      customerUserId: customer.id,
    });
    const next = await work.create(company.owner, contact.id, {
      message: 'Новая задача',
    });
    expect(await db.request.findUniqueOrThrow({ where: next })).toMatchObject({
      customerUserId: customer.id,
    });
  });

  it('limits service selection to the provider’s published services and snapshots a fixed price', async () => {
    const company = await provider();
    const other = await provider();
    const contact = await db.providerClient.create({
      data: { providerId: company.id, email: randomUUID() + '@example.test' },
    });
    const category = await db.serviceCategory.create({
      data: { name: 'Категория', shortName: 'Категория', slug: randomUUID() },
    });
    const common = {
      categoryId: category.id,
      title: 'Измерения',
      price: '1 200 ₽',
    };
    const published = await db.service.create({
      data: { ...common, providerId: company.id, status: 'PUBLISHED' },
    });
    const draft = await db.service.create({
      data: { ...common, providerId: company.id, status: 'DRAFT' },
    });
    const foreign = await db.service.create({
      data: { ...common, providerId: other.id, status: 'PUBLISHED' },
    });
    for (const s of [foreign, draft]) {
      await expect(
        work.create(company.owner, contact.id, { serviceId: s.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
    await expect(
      work.create(company.owner, contact.id, { message: ' ' }),
    ).rejects.toThrow('Опишите задачу');
    const own = await work.create(company.owner, contact.id, {
      serviceId: published.id,
    });
    expect(
      await db.request.findUniqueOrThrow({
        where: own,
        include: { priceProposals: true },
      }),
    ).toMatchObject({
      serviceId: published.id,
      servicePriceRubles: 1200,
      totalAmountRubles: 1200,
      priceProposals: [{ authorSide: 'PROVIDER', amountRubles: 1200 }],
    });
  });

  it('delivers new work to an existing verified customer, including after an address correction', async () => {
    const company = await provider();
    const email = randomUUID() + '@example.test';
    const customer = await db.user.create({
      data: { email, emailVerified: new Date(), accountKind: 'CUSTOMER' },
    });
    const card = await clients.create(company.id, {
      email: randomUUID() + '@example.test',
    });
    const first = await work.create(company.owner, card.id, {
      message: 'Первая заявка',
    });
    expect(
      (await clients.edit(company.id, card.id, { email: email.toUpperCase() }))
        .changedRequestIds,
    ).toEqual([first.id]);
    const second = await work.create(company.owner, card.id, {
      message: 'Повторное обращение',
    });
    const other = await provider();
    const otherCard = await clients.create(other.id, { email });
    const third = await work.create(other.owner, otherCard.id, {
      message: 'Выезд другого исполнителя',
    });
    expect(
      (await requests.listMine(customer.id)).map((row) => row.id).sort(),
    ).toEqual([first.id, second.id, third.id].sort());
    const providerEmail = randomUUID() + '@example.test';
    const pro = await db.user.create({
      data: {
        email: providerEmail,
        emailVerified: new Date(),
        accountKind: 'PROVIDER',
      },
    });
    const proCard = await clients.create(company.id, { email: providerEmail });
    await work.create(company.owner, proCard.id, { message: 'Тёзка' });
    expect(await requests.syncCustomerWork(pro.id)).toEqual([]);
    expect(await requests.listMine(pro.id)).toEqual([]);
  });

  it('opens the entire history from a pre-existing session, including more than 200 requests with the same timestamp', async () => {
    const company = await provider();
    const email = randomUUID() + '@example.test';
    const card = await clients.create(company.id, { email });
    const date = new Date('2026-01-01T12:00:00.000Z');
    const ids = Array.from({ length: 205 }, () => randomUUID())
      .sort()
      .reverse();
    await db.request.createMany({
      data: ids.map((id) => ({
        id,
        createdAt: date,
        providerId: company.id,
        providerClientId: card.id,
        customerEmail: email,
        providerWorkStatus: 'DONE',
      })),
    });
    const customer = await db.user.create({
      data: { email, emailVerified: new Date(), accountKind: 'CUSTOMER' },
    });
    const getActor = vi
      .spyOn(requests, 'getRequiredActorUserId')
      .mockReturnValue(customer.id);
    try {
      const controller = new RequestsController(requests);
      const req = {} as RequestWithChanges;
      const setHeader = vi.fn();
      const res = { setHeader } as unknown as Response;
      const first = await controller.listMine(req, res);
      expect(req.changedRequestIds).toHaveLength(205);
      expect(first.map((row) => row.id)).toEqual(ids.slice(0, 200));
      const cursor = setHeader.mock.calls[0][1] as string;
      expect(setHeader).toHaveBeenCalledWith(
        'X-Next-Cursor',
        `${date.toISOString()},${ids[199]}`,
      );
      await db.request.delete({ where: { id: ids[199] } });
      setHeader.mockClear();
      const last = await controller.listMine(
        {} as RequestWithChanges,
        res,
        cursor,
      );
      expect(last.map((row) => row.id)).toEqual(ids.slice(200));
      expect(setHeader).not.toHaveBeenCalled();
      await expect(controller.listMine(req, res, 'bad-cursor')).rejects.toThrow(
        'Некорректная страница заявок',
      );
    } finally {
      getActor.mockRestore();
    }
  });
});
