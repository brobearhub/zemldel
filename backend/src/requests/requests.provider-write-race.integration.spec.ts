import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
import { ForbiddenException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ChatService } from '../chat/chat.service';
import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestProDto } from './dto/request.dto';
import { RequestsService } from './requests.service';

const databaseUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

type RaceOrder = 'switch-first' | 'write-first';
type RaceOperation = 'cadastral' | 'remark';

type Deferred = {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
};

function deferred(): Deferred {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type OperationBarrier = {
  readonly arrived: Promise<void>;
  readonly release: () => void;
  readonly signalAndWait: () => Promise<void>;
};

function createOperationBarrier(): OperationBarrier {
  const arrival = deferred();
  const release = deferred();
  return {
    arrived: arrival.promise,
    release: release.resolve,
    signalAndWait: async () => {
      arrival.resolve();
      await release.promise;
    },
  };
}

function withApplicationName(url: string, applicationName: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('application_name', applicationName);
  return parsed.toString();
}

function makeClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function instrumentTransactionClient(
  tx: Prisma.TransactionClient,
  order: RaceOrder,
  barrier: OperationBarrier,
): Prisma.TransactionClient {
  const request = new Proxy(tx.request, {
    get(target, property, receiver) {
      if (property !== 'findFirst') {
        const value = Reflect.get(target, property, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return async (
        args: Prisma.RequestFindFirstArgs,
      ): Promise<Prisma.RequestGetPayload<Prisma.RequestFindFirstArgs> | null> => {
        const row = await target.findFirst(args);
        await barrier.signalAndWait();
        return row;
      };
    },
  });

  return new Proxy(tx, {
    get(target, property, receiver) {
      if (property === 'request') return request;
      if (property === '$queryRaw') {
        return async <T>(query: Prisma.Sql): Promise<T> => {
          if (order === 'switch-first') {
            await barrier.signalAndWait();
          }
          const rows = await target.$queryRaw<T>(query);
          if (order === 'write-first') {
            await barrier.signalAndWait();
          }
          return rows;
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function makeInstrumentedPrisma(
  prisma: PrismaClient,
  order: RaceOrder,
  barrier: OperationBarrier,
): PrismaService {
  return {
    $transaction: async <T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T>,
    ): Promise<T> =>
      prisma.$transaction(
        (tx) => callback(instrumentTransactionClient(tx, order, barrier)),
        TX_OPTIONS,
      ),
  } as PrismaService;
}

function makeService(prisma: PrismaService): RequestsService {
  const auth = Object.create(AuthService.prototype) as AuthService;
  const internalAuth = Object.create(
    InternalAuthService.prototype,
  ) as InternalAuthService;
  const legalDocs = Object.create(
    LegalDocsService.prototype,
  ) as LegalDocsService;
  const chat = Object.create(ChatService.prototype) as ChatService;
  vi.spyOn(chat, 'notifyMessageCreated').mockResolvedValue(undefined);
  return new RequestsService(prisma, auth, internalAuth, legalDocs, chat);
}

async function observeSwitchState(
  observer: PrismaClient,
  applicationName: string,
  switchPromise: Promise<unknown>,
): Promise<'blocked' | 'completed'> {
  let completed = false;
  void switchPromise.finally(() => {
    completed = true;
  });

  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const rows = await observer.$queryRaw<Array<{ blocked: boolean }>>(
      Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE application_name = ${applicationName}
            AND state = 'active'
            AND wait_event_type = 'Lock'
        ) AS blocked
      `,
    );
    if (rows[0]?.blocked) return 'blocked';
    if (completed) return 'completed';
    await setImmediate();
  }

  throw new Error('Provider switch did not block or complete');
}

describe.skipIf(!hasDatabase)(
  'RequestsService provider write races',
  { timeout: 60_000 },
  () => {
    let serviceClient: PrismaClient;
    let observerClient: PrismaClient;

    beforeAll(() => {
      serviceClient = makeClient(databaseUrl!);
      observerClient = makeClient(databaseUrl!);
    });

    afterAll(async () => {
      await Promise.all([
        serviceClient.$disconnect(),
        observerClient.$disconnect(),
      ]);
    });

    it.each([
      ['cadastral', 'switch-first'],
      ['remark', 'switch-first'],
      ['cadastral', 'write-first'],
      ['remark', 'write-first'],
    ] as const)(
      '%s mutation is serialized when provider switch is %s',
      async (operation: RaceOperation, order: RaceOrder) => {
        const requestId = randomUUID();
        const remarkId = randomUUID();
        const providerAId = randomUUID();
        const providerBId = randomUUID();
        const applicationName = `request-race-${randomUUID()}`;
        const switchClient = makeClient(
          withApplicationName(databaseUrl!, applicationName),
        );
        const barrier = createOperationBarrier();
        let operationPromise: Promise<unknown> | null = null;
        let switchPromise: Promise<unknown> | null = null;

        try {
          await serviceClient.provider.createMany({
            data: [
              {
                id: providerAId,
                name: 'Race provider A',
                slug: `race-provider-a-${providerAId}`,
                type: 'COMPANY',
              },
              {
                id: providerBId,
                name: 'Race provider B',
                slug: `race-provider-b-${providerBId}`,
                type: 'COMPANY',
              },
            ],
          });
          await serviceClient.request.create({
            data: {
              id: requestId,
              status: 'ACTIVE',
              providerId: providerAId,
              lockedAt: new Date(),
              cadastralNumbers: ['50:12:0000000:51755'],
            },
          });
          await serviceClient.requestRemark.create({
            data: {
              id: remarkId,
              requestId,
              authorSide: 'CUSTOMER',
              status: 'OPEN',
              text: 'Исправить результат',
              sentAt: new Date(),
            },
          });

          const service = makeService(
            makeInstrumentedPrisma(serviceClient, order, barrier),
          );
          vi.spyOn(
            service as unknown as {
              requireProviderAccessToRequest: (
                actorProviderId: string,
                targetRequestId: string,
              ) => Promise<{
                id: string;
                status: 'ACTIVE';
                providerId: string;
              }>;
            },
            'requireProviderAccessToRequest',
          ).mockResolvedValue({
            id: requestId,
            status: 'ACTIVE',
            providerId: providerAId,
          });
          vi.spyOn(service, 'getProById').mockResolvedValue(
            {} as RequestProDto,
          );

          operationPromise =
            operation === 'cadastral'
              ? service.appendCadastralNumberByProvider(
                  providerAId,
                  requestId,
                  { value: '50:12:0000000:51756' },
                )
              : service.completeRemarkByProvider(
                  providerAId,
                  requestId,
                  remarkId,
                );

          await barrier.arrived;
          switchPromise = switchClient.request.update({
            where: { id: requestId },
            data: { providerId: providerBId },
          });

          if (order === 'switch-first') {
            await switchPromise;
            barrier.release();
            await expect(operationPromise).rejects.toBeInstanceOf(
              ForbiddenException,
            );
          } else {
            await expect(
              observeSwitchState(
                observerClient,
                applicationName,
                switchPromise,
              ),
            ).resolves.toBe('blocked');
            barrier.release();
            await operationPromise;
            await switchPromise;
          }

          const [request, remark, events] = await Promise.all([
            serviceClient.request.findUniqueOrThrow({
              where: { id: requestId },
              select: { providerId: true, cadastralNumbers: true },
            }),
            serviceClient.requestRemark.findUniqueOrThrow({
              where: { id: remarkId },
              select: { status: true, doneByProviderId: true },
            }),
            serviceClient.requestEvent.findMany({
              where: { requestId },
              select: { type: true, actorProviderId: true },
            }),
          ]);

          expect(request.providerId).toBe(providerBId);
          if (order === 'switch-first') {
            expect(request.cadastralNumbers).toEqual(['50:12:0000000:51755']);
            expect(remark).toEqual({
              status: 'OPEN',
              doneByProviderId: null,
            });
            expect(events).toEqual([]);
          } else if (operation === 'cadastral') {
            expect(request.cadastralNumbers).toEqual([
              '50:12:0000000:51755',
              '50:12:0000000:51756',
            ]);
            expect(remark.status).toBe('OPEN');
            expect(events).toEqual([]);
          } else {
            expect(request.cadastralNumbers).toEqual(['50:12:0000000:51755']);
            expect(remark).toEqual({
              status: 'DONE',
              doneByProviderId: providerAId,
            });
            expect(events).toEqual([
              { type: 'REMARK_DONE', actorProviderId: providerAId },
            ]);
          }
        } finally {
          barrier.release();
          await Promise.allSettled(
            [operationPromise, switchPromise].filter(
              (promise): promise is Promise<unknown> => promise !== null,
            ),
          );
          await serviceClient.request.deleteMany({
            where: { id: requestId },
          });
          await serviceClient.provider.deleteMany({
            where: { id: { in: [providerAId, providerBId] } },
          });
          await switchClient.$disconnect();
        }
      },
    );

    it('customer cadastral appends keep both concurrent values', async () => {
      const requestId = randomUUID();
      const userId = randomUUID();
      const applicationName = `request-race-${randomUUID()}`;
      const secondClient = makeClient(
        withApplicationName(databaseUrl!, applicationName),
      );
      const barrier = createOperationBarrier();
      let firstPromise: Promise<unknown> | null = null;
      let secondPromise: Promise<unknown> | null = null;

      try {
        await serviceClient.user.create({
          data: {
            id: userId,
            email: `race-customer-${userId}@example.com`,
          },
        });
        await serviceClient.request.create({
          data: {
            id: requestId,
            status: 'ACTIVE',
            customerUserId: userId,
            cadastralNumbers: [],
          },
        });

        const first = makeService(
          makeInstrumentedPrisma(serviceClient, 'write-first', barrier),
        );
        const second = makeService({
          $transaction: <T>(
            callback: (tx: Prisma.TransactionClient) => Promise<T>,
          ) => secondClient.$transaction(callback, TX_OPTIONS),
        } as PrismaService);
        for (const service of [first, second]) {
          vi.spyOn(service, 'getMineById').mockResolvedValue(
            {} as Awaited<ReturnType<RequestsService['getMineById']>>,
          );
        }

        firstPromise = first.appendCadastralNumberByCustomer(
          userId,
          requestId,
          {
            value: '50:12:0000000:51755',
          },
        );
        await barrier.arrived;
        secondPromise = second.appendCadastralNumberByCustomer(
          userId,
          requestId,
          { value: '50:12:0000000:51756' },
        );
        await expect(
          observeSwitchState(observerClient, applicationName, secondPromise),
        ).resolves.toBe('blocked');
        barrier.release();
        await Promise.all([firstPromise, secondPromise]);

        const request = await serviceClient.request.findUniqueOrThrow({
          where: { id: requestId },
          select: { cadastralNumbers: true },
        });
        expect(request.cadastralNumbers).toEqual([
          '50:12:0000000:51755',
          '50:12:0000000:51756',
        ]);
      } finally {
        barrier.release();
        await Promise.allSettled(
          [firstPromise, secondPromise].filter(
            (promise): promise is Promise<unknown> => promise !== null,
          ),
        );
        await serviceClient.request.deleteMany({ where: { id: requestId } });
        await serviceClient.user.deleteMany({ where: { id: userId } });
        await secondClient.$disconnect();
      }
    });
  },
);
