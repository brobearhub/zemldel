import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RequestPaymentsService } from '../../request-payments/request-payments.service';
import { ContractFilesService } from '../../contract-files/contract-files.service';
import { RequestDocumentRequestsService } from '../../request-document-requests/request-document-requests.service';
import { RequestsService } from '../../requests/requests.service';
import { withWriteOperation } from './write-operation';

const url = process.env.DATABASE_URL;
const actors = [randomUUID(), randomUUID()];
const options = { timeout: 15_000, maxWait: 10_000 };
const scope = `qa-idempotency:${randomUUID()}`;
let db: PrismaClient;
let providerId: string;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const write = (
  tx: Prisma.TransactionClient,
  actorUserId: string,
  message: string,
) =>
  tx.request.create({
    data: { customerUserId: actorUserId, message },
    select: { id: true },
  });

describe.skipIf(!url)('write receipts on real PostgreSQL', () => {
  beforeAll(async () => {
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
    await db.user.createMany({
      data: actors.map((id) => ({
        id,
        email: `qa-idempotency-${id}@example.com`,
      })),
    });
    providerId = (
      await db.provider.create({
        data: {
          name: 'QA idempotency provider',
          slug: randomUUID(),
          type: 'COMPANY',
          ownerUserId: actors[1],
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.writeOperation.deleteMany({
      where: { actorUserId: { in: actors } },
    });
    await db.request.deleteMany({ where: { customerUserId: { in: actors } } });
    await db.provider.delete({ where: { id: providerId } });
    await db.user.deleteMany({ where: { id: { in: actors } } });
    await db.$disconnect();
  });
  it('serializes concurrent requests and replays the committed response after a lost acknowledgement', async () => {
    const key = randomUUID();
    const entered = deferred();
    const release = deferred();
    const operation = {
      actorUserId: actors[0],
      scope,
      key,
      input: { message: 'same intent' },
    };
    let created = 0;
    const first = db.$transaction(
      (tx) =>
        withWriteOperation(tx, operation, async () => {
          entered.resolve();
          await release.promise;
          created++;
          return write(tx, actors[0], key);
        }),
      options,
    );
    await entered.promise;
    const second = db.$transaction(
      (tx) =>
        withWriteOperation(tx, operation, () => {
          created++;
          return write(tx, actors[0], key);
        }),
      options,
    );
    try {
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        const rows = await db.$queryRaw<
          { count: bigint }[]
        >`SELECT count(*)::bigint AS count FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`;
        if (rows[0].count > 0n) {
          blocked = true;
          break;
        }
        await setImmediate();
      }
      expect(blocked).toBe(true);
    } finally {
      release.resolve();
    }
    const [a, b] = await Promise.all([first, second]);
    expect(a.value.id).toBe(b.value.id);
    expect(created).toBe(1);
    expect([a.replayed, b.replayed]).toEqual([false, true]);
    // The browser may never receive either response; a later process still gets the same ID.
    const replay = await db.$transaction(
      (tx) =>
        withWriteOperation(tx, operation, () => write(tx, actors[0], key)),
      options,
    );
    expect(replay.value.id).toBe(a.value.id);
    expect(
      await db.request.count({
        where: { customerUserId: actors[0], message: key },
      }),
    ).toBe(1);
  });
  it('rolls back both the write and receipt, then allows a safe retry', async () => {
    const key = randomUUID();
    const operation = {
      actorUserId: actors[0],
      scope,
      key,
      input: { message: key },
    };
    await expect(
      db.$transaction(
        (tx) =>
          withWriteOperation(tx, operation, async () => {
            await write(tx, actors[0], key);
            throw new Error('failure before commit');
          }),
        options,
      ),
    ).rejects.toThrow('failure before commit');
    expect(await db.request.count({ where: { message: key } })).toBe(0);
    expect(await db.writeOperation.count({ where: { key } })).toBe(0);
    await db.$transaction(
      (tx) =>
        withWriteOperation(tx, operation, () => write(tx, actors[0], key)),
      options,
    );
    expect(await db.request.count({ where: { message: key } })).toBe(1);
  });
  it('rejects changed input for the same intent, but isolates users and endpoint scopes', async () => {
    const key = randomUUID();
    const base = { actorUserId: actors[0], scope, key, input: { a: 1, b: 2 } };
    const first = await db.$transaction(
      (tx) => withWriteOperation(tx, base, () => write(tx, actors[0], key)),
      options,
    );
    const ordered = await db.$transaction(
      (tx) =>
        withWriteOperation(tx, { ...base, input: { b: 2, a: 1 } }, () =>
          write(tx, actors[0], key),
        ),
      options,
    );
    expect(ordered.value.id).toBe(first.value.id);
    await expect(
      db.$transaction(
        (tx) =>
          withWriteOperation(tx, { ...base, input: { a: 3 } }, () =>
            write(tx, actors[0], key),
          ),
        options,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const other = await db.$transaction(
      (tx) =>
        withWriteOperation(tx, { ...base, actorUserId: actors[1] }, () =>
          write(tx, actors[1], key),
        ),
      options,
    );
    expect(other.value.id).not.toBe(first.value.id);
    const endpoint = await db.$transaction(
      (tx) =>
        withWriteOperation(tx, { ...base, scope: `${scope}:other` }, () =>
          write(tx, actors[0], key),
        ),
      options,
    );
    expect(endpoint.value.id).not.toBe(first.value.id);
  });
  it('replays FREEFORM creation through the application service after an unknown response', async () => {
    const service = new RequestsService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const input = {
      operationId: randomUUID(),
      message: `QA retry ${randomUUID()}`,
      cadastralNumbers: [],
    };
    const [first, second] = await Promise.all([
      service.createUnlinked(actors[0], input),
      service.createUnlinked(actors[0], input),
    ]);
    expect(first.id).toBe(second.id);
    expect(
      await db.request.count({
        where: { customerUserId: actors[0], message: input.message },
      }),
    ).toBe(1);
  });
  it.each(['provider', 'customer'] as const)(
    'replays %s payment creation with one payment and event',
    async (side) => {
      const request = await db.request.create({
        data: {
          customerUserId: actors[0],
          providerId,
          status: 'COMPLETED',
          lockedAt: new Date(),
          contractAcceptedAt: new Date(),
          totalAmountRubles: 1000,
        },
      });
      const auth = {
        getServiceManagementContext: vi
          .fn()
          .mockResolvedValue({ isPlatformAdmin: false, providerId }),
      };
      const service = new RequestPaymentsService(db as never, auth as never);
      const input = {
        actorUserId: side === 'provider' ? actors[1] : actors[0],
        requestId: request.id,
        operationId: randomUUID(),
        amountRubles: 1000,
        comment: 'QA final payment',
        type: 'CONTRACT' as const,
      };
      const send = () =>
        side === 'provider'
          ? service.addPaymentForProvider(input)
          : service.addPaymentForCustomer(input);
      const [a, b] = await Promise.all([send(), send()]);
      expect(a.payments[0].id).toBe(b.payments[0].id);
      expect(
        await db.requestPayment.count({ where: { requestId: request.id } }),
      ).toBe(1);
      expect(
        await db.requestEvent.count({
          where: { requestId: request.id, type: 'PAYMENT_ADDED' },
        }),
      ).toBe(1);
      const paymentId = a.payments[0].id;
      const mark = () =>
        side === 'provider'
          ? service.markPaymentPaidForProvider({ ...input, paymentId })
          : service.markPaymentPaidForCustomer({ ...input, paymentId });
      const marked = await Promise.all([mark(), mark()]);
      expect(marked.map((m) => m.paidAmountRubles)).toEqual([1000, 1000]);
      expect(
        await db.requestEvent.count({
          where: { requestId: request.id, type: 'PAYMENT_MARKED_PAID' },
        }),
      ).toBe(1);
    },
  );
  it('replays contract and requested-document uploads without duplicate objects or rows', async () => {
    const request = await db.request.create({
      data: {
        customerUserId: actors[0],
        providerId,
        status: 'DISCUSSING',
        lockedAt: new Date(),
      },
    });
    const auth = {
      getServiceManagementContext: vi
        .fn()
        .mockResolvedValue({ isPlatformAdmin: false, providerId }),
    };
    const s3 = {
      putObject: vi.fn().mockResolvedValue({}),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
      isSecureKey: (key: string) => key.startsWith('documents/'),
    };
    const contracts = new ContractFilesService(
      db as never,
      auth as never,
      s3 as never,
    );
    const file = {
      buffer: Buffer.from('QA PDF'),
      originalname: 'qa.pdf',
      mimetype: 'application/pdf',
      size: 6,
    } as Express.Multer.File;
    const input = {
      actorUserId: actors[1],
      requestId: request.id,
      operationId: randomUUID(),
      document: file,
    };
    const [a, b] = await Promise.all([
      contracts.uploadBundleForProvider(input),
      contracts.uploadBundleForProvider(input),
    ]);
    expect(a.bundleId).toBe(b.bundleId);
    expect(
      await db.requestContractFile.count({ where: { requestId: request.id } }),
    ).toBe(1);
    expect(s3.putObject).toHaveBeenCalledTimes(1);
    const document = await db.requestDocumentRequest.create({
      data: { requestId: request.id, providerId, title: 'QA upload' },
    });
    const documents = new RequestDocumentRequestsService(
      db as never,
      auth as never,
      s3 as never,
    );
    const upload = {
      actorUserId: actors[0],
      requestId: request.id,
      docRequestId: document.id,
      operationId: randomUUID(),
      file,
    };
    await Promise.all([
      documents.uploadForCustomer(upload),
      documents.uploadForCustomer(upload),
    ]);
    expect(
      await db.requestDocumentRequest.count({
        where: { requestId: request.id },
      }),
    ).toBe(1);
    expect(s3.putObject).toHaveBeenCalledTimes(2);
  });
});
