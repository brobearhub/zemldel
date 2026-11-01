import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

type RequestStatus = 'ACTIVE' | 'ACCEPTANCE_PENDING';

type SubmissionState = {
  id: string;
  requestId: string;
  providerId: string;
  sequence: number;
  summary: string;
  submittedByUserId: string;
  submittedAt: Date;
};

type RemarkState = {
  id: string;
  requestId: string;
  submissionId: string | null;
  authorSide: 'CUSTOMER';
  status: 'OPEN' | 'DONE';
  text: string;
  createdAt: Date;
  doneAt: Date | null;
  sentAt: Date;
};

type StoreState = {
  request: {
    id: string;
    status: RequestStatus;
    providerId: string;
    customerUserId: string;
    acceptanceRequestedAt: Date | null;
    autoAcceptAt: Date | null;
    acceptedAt: Date | null;
    updatedAt: Date;
  };
  submissions: SubmissionState[];
  remarks: RemarkState[];
  events: Array<{ type: string; payload: Prisma.JsonValue | null }>;
};

type TransactionOwner = {
  readonly id: number;
  readonly local: StoreState;
  readonly reservations: number[];
};

function cloneState(state: StoreState): StoreState {
  return structuredClone(state);
}

function makeInitialState(): StoreState {
  const createdAt = new Date('2026-11-01T08:00:00.000Z');
  return {
    request: {
      id: 'r1',
      status: 'ACTIVE',
      providerId: 'p1',
      customerUserId: 'u1',
      acceptanceRequestedAt: null,
      autoAcceptAt: null,
      acceptedAt: null,
      updatedAt: createdAt,
    },
    submissions: [],
    remarks: [],
    events: [],
  };
}

function requestRow(state: StoreState) {
  const createdAt = new Date('2026-11-01T08:00:00.000Z');
  return {
    ...state.request,
    serviceId: null,
    categoryId: null,
    requestCityId: null,
    requestCity: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    message: null,
    location: null,
    cadastralNumbers: [],
    lockedAt: createdAt,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: createdAt,
    totalAmountRubles: null,
    servicePriceRubles: null,
    createdAt,
    service: null,
    category: null,
    provider: null,
    customerUser: null,
    providerOffers: [],
    payments: [],
    priceProposals: [],
    deliverySubmissions: state.submissions
      .toSorted((left, right) => left.sequence - right.sequence)
      .map((submission) => ({
        id: submission.id,
        sequence: submission.sequence,
        summary: submission.summary,
        submittedAt: submission.submittedAt,
        remarks: state.remarks
          .filter((remark) => remark.submissionId === submission.id)
          .toSorted(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime(),
          )
          .map((remark) => ({ ...remark })),
      })),
  };
}

class DeliverySubmissionStore {
  private state = makeInitialState();
  private nextTransactionId = 1;
  private aggregateArrivals = 0;
  private releaseAggregate: (() => void) | null = null;
  private readonly aggregateGate = new Promise<void>((resolve) => {
    this.releaseAggregate = resolve;
  });
  private readonly reservations = new Map<
    number,
    { ownerId: number; completed: Promise<void>; release: () => void }
  >();

  constructor(private readonly concurrent = false) {}

  snapshot(): StoreState {
    return cloneState(this.state);
  }

  readonly prisma = {
    request: {
      findUnique: () => ({
        id: this.state.request.id,
        status: this.state.request.status,
        providerId: this.state.request.providerId,
      }),
      findFirst: ({
        where,
      }: {
        where: {
          id: string;
          providerId: string;
          status: RequestStatus;
        };
      }) => {
        if (
          where.id !== this.state.request.id ||
          where.providerId !== this.state.request.providerId ||
          where.status !== this.state.request.status
        ) {
          return null;
        }
        return requestRow(this.state);
      },
    },
    $transaction: async <T>(
      callback: (
        tx: ReturnType<DeliverySubmissionStore['makeTx']>,
      ) => Promise<T>,
    ): Promise<T> => {
      const owner: TransactionOwner = {
        id: this.nextTransactionId++,
        local: cloneState(this.state),
        reservations: [],
      };
      try {
        const result = await callback(this.makeTx(owner));
        this.state = owner.local;
        this.finishReservations(owner);
        return result;
      } catch (error) {
        this.finishReservations(owner);
        throw error;
      }
    },
  };

  private finishReservations(owner: TransactionOwner): void {
    for (const sequence of owner.reservations) {
      const reservation = this.reservations.get(sequence);
      if (reservation?.ownerId === owner.id) {
        reservation.release();
      }
    }
  }

  private async waitForConcurrentAggregates(): Promise<void> {
    if (!this.concurrent) return;
    this.aggregateArrivals += 1;
    if (this.aggregateArrivals === 2) this.releaseAggregate?.();
    await this.aggregateGate;
  }

  private async reserveSequence(
    owner: TransactionOwner,
    sequence: number,
  ): Promise<void> {
    const existing = this.reservations.get(sequence);
    if (existing) {
      await existing.completed;
      throw new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['requestId', 'sequence'] },
        },
      );
    }

    let release = (): void => undefined;
    const completed = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.reservations.set(sequence, {
      ownerId: owner.id,
      completed,
      release,
    });
    owner.reservations.push(sequence);
  }

  private makeTx(owner: TransactionOwner) {
    const state = owner.local;
    return {
      request: {
        findFirst: ({
          where,
        }: {
          where: {
            id: string;
            providerId?: string;
            customerUserId?: string;
            status?: RequestStatus;
          };
        }) => {
          const row = state.request;
          if (where.id !== row.id) return null;
          if (where.providerId && where.providerId !== row.providerId)
            return null;
          if (
            where.customerUserId &&
            where.customerUserId !== row.customerUserId
          ) {
            return null;
          }
          if (where.status && where.status !== row.status) return null;
          return requestRow(state);
        },
        findUnique: () => requestRow(state),
        updateMany: ({
          where,
          data,
        }: {
          where: { id: string; status: RequestStatus };
          data: Partial<StoreState['request']>;
        }) => {
          if (
            state.request.id !== where.id ||
            state.request.status !== where.status
          ) {
            return { count: 0 };
          }
          Object.assign(state.request, data, { updatedAt: new Date() });
          return { count: 1 };
        },
        update: ({ data }: { data: Partial<StoreState['request']> }) => {
          Object.assign(state.request, data, { updatedAt: new Date() });
          return requestRow(state);
        },
      },
      requestDeliverySubmission: {
        aggregate: async () => {
          await this.waitForConcurrentAggregates();
          return {
            _max: {
              sequence: state.submissions.at(-1)?.sequence ?? null,
            },
          };
        },
        create: async ({ data }: { data: Omit<SubmissionState, 'id'> }) => {
          await this.reserveSequence(owner, data.sequence);
          const submission = {
            ...data,
            id: `s${data.sequence}`,
          };
          state.submissions.push(submission);
          return { id: submission.id, sequence: submission.sequence };
        },
        findFirst: () => {
          const latest = state.submissions.at(-1);
          return latest ? { id: latest.id } : null;
        },
      },
      requestRemark: {
        count: ({
          where,
        }: {
          where: { status: 'OPEN'; authorSide?: 'CUSTOMER' };
        }) =>
          state.remarks.filter(
            (remark) =>
              remark.status === where.status &&
              (!where.authorSide || remark.authorSide === where.authorSide),
          ).length,
        create: ({
          data,
        }: {
          data: {
            requestId: string;
            submissionId: string | null;
            text: string;
            sentAt: Date;
          };
        }) => {
          const remark: RemarkState = {
            id: `rm${state.remarks.length + 1}`,
            requestId: data.requestId,
            submissionId: data.submissionId,
            authorSide: 'CUSTOMER',
            status: 'OPEN',
            text: data.text,
            createdAt: data.sentAt,
            doneAt: null,
            sentAt: data.sentAt,
          };
          state.remarks.push(remark);
          return { id: remark.id };
        },
        findFirst: ({ where }: { where: { id: string } }) => {
          return state.remarks.find((remark) => remark.id === where.id) ?? null;
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status: 'DONE'; doneAt: Date };
        }) => {
          const remark = state.remarks.find((item) => item.id === where.id);
          if (!remark) throw new ConflictException('Remark not found');
          Object.assign(remark, data);
          return { ...remark };
        },
      },
      requestEvent: {
        create: ({
          data,
        }: {
          data: { type: string; payload?: Prisma.InputJsonValue };
        }) => {
          state.events.push({
            type: data.type,
            payload: data.payload ?? null,
          });
          return { id: `e${state.events.length}` };
        },
      },
    };
  }
}

function makeService(store: DeliverySubmissionStore): RequestsService {
  // Reflect нужен только для подстановки stateful Prisma boundary без небезопасных `any`/двойных cast.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const service: RequestsService = Reflect.construct(RequestsService, [
    store.prisma,
    {},
    {},
    {},
    { notifyMessageCreated: () => undefined },
  ]);
  Object.defineProperty(service, 'getProById', {
    value: () => ({ id: 'r1' }),
  });
  return service;
}

describe('delivery submission behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('сохраняет immutable v1 и выдаёт ordered history после полного цикла v2', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));
    const store = new DeliverySubmissionStore();
    const service = makeService(store);

    const first = await service.markServiceRenderedByProvider(
      'p1',
      'r1',
      { summary: 'Первая версия' },
      'u-provider',
    );
    const v1 = store.snapshot().submissions[0];

    await service.sendRemarksByCustomer('u1', 'r1', {
      remarks: 'Исправить границы',
    });
    await service.completeRemarkByProvider('p1', 'r1', 'rm1');

    vi.setSystemTime(new Date('2026-11-03T12:30:00.000Z'));
    const second = await service.markServiceRenderedByProvider(
      'p1',
      'r1',
      { summary: 'Границы исправлены' },
      'u-provider',
    );
    const state = store.snapshot();

    expect(first.currentSubmission?.sequence).toBe(1);
    expect(state.submissions).toHaveLength(2);
    expect(state.submissions[0]).toEqual(v1);
    expect(state.submissions[1]).toMatchObject({
      sequence: 2,
      summary: 'Границы исправлены',
      submittedAt: new Date('2026-11-03T12:30:00.000Z'),
    });
    expect(state.remarks).toEqual([
      expect.objectContaining({
        submissionId: 's1',
        status: 'DONE',
        text: 'Исправить границы',
      }),
    ]);
    expect(state.request.acceptanceRequestedAt).toEqual(
      new Date('2026-11-03T12:30:00.000Z'),
    );
    expect(state.request.autoAcceptAt).toEqual(
      new Date('2026-11-10T12:30:00.000Z'),
    );
    expect(second.deliverySubmissions.map(({ sequence }) => sequence)).toEqual([
      1, 2,
    ]);
    expect(second.deliverySubmissions[0].remarks).toEqual([
      expect.objectContaining({
        status: 'DONE',
        text: 'Исправить границы',
      }),
    ]);
    expect(second.currentSubmission).toMatchObject({
      sequence: 2,
      summary: 'Границы исправлены',
    });
  });

  it('два concurrent submit дают одну version и один deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));
    const store = new DeliverySubmissionStore(true);
    const service = makeService(store);

    const results = await Promise.all([
      service.markServiceRenderedByProvider(
        'p1',
        'r1',
        { summary: 'Один результат' },
        'u-provider',
      ),
      service.markServiceRenderedByProvider(
        'p1',
        'r1',
        { summary: 'Повторный запрос' },
        'u-provider',
      ),
    ]);
    const state = store.snapshot();

    expect(state.submissions).toHaveLength(1);
    expect(state.submissions[0]).toMatchObject({
      sequence: 1,
    });
    expect(['Один результат', 'Повторный запрос']).toContain(
      state.submissions[0].summary,
    );
    expect(state.request.status).toBe('ACCEPTANCE_PENDING');
    expect(state.request.acceptanceRequestedAt).toEqual(
      new Date('2026-11-01T10:00:00.000Z'),
    );
    expect(state.request.autoAcceptAt).toEqual(
      new Date('2026-11-08T10:00:00.000Z'),
    );
    expect(state.events.map(({ type }) => type)).toEqual([
      'SERVICE_RENDERED',
      'ACCEPTANCE_REQUESTED',
    ]);
    expect(results.map((result) => result.currentSubmission?.sequence)).toEqual(
      [1, 1],
    );
    expect(results.map((result) => result.currentSubmission?.summary)).toEqual([
      state.submissions[0].summary,
      state.submissions[0].summary,
    ]);
    expect(results.map((result) => result.autoAcceptAt)).toEqual([
      '2026-11-08T10:00:00.000Z',
      '2026-11-08T10:00:00.000Z',
    ]);
  });
});
