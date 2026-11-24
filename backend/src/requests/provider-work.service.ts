import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ProviderWorkStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { assertActiveSelectableCity } from '../cities/city-validation';
import { withWriteOperation } from '../common/idempotency/write-operation';
import { PrismaService } from '../prisma/prisma.service';
import {
  connectVerifiedCustomerWork,
  lockProviderClient,
} from '../provider-clients/provider-client-record';
import { parseFixedServicePriceRubles } from './lib/service-price-rubles';

type CreateInput = {
  serviceId?: string;
  message?: string;
  requestCityId?: string;
  location?: string;
  operationId?: string;
};
const noteType = 'PROVIDER_INTERNAL_NOTE';

async function authorName(tx: Prisma.TransactionClient, actorId: string) {
  const actor = await tx.user.findUniqueOrThrow({
    where: { id: actorId },
    select: { firstName: true, lastName: true, name: true, email: true },
  });
  return (
    [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() ||
    actor.name?.trim() ||
    actor.email
  );
}

function noteDto(event: {
  id: string;
  createdAt: Date;
  payload: Prisma.JsonValue;
}) {
  const payload = event.payload;
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.text !== 'string' ||
    typeof payload.authorName !== 'string'
  )
    throw new Error('Invalid provider note');
  return {
    id: event.id,
    text: payload.text,
    authorName: payload.authorName,
    createdAt: event.createdAt.toISOString(),
  };
}

@Injectable()
export class ProviderWorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async providerId(actorId: string) {
    const ctx = await this.auth.getOrderManagementContext(actorId, 'read');
    if (!ctx.providerId || ctx.isPlatformAdmin)
      throw new ForbiddenException('Требуется профиль исполнителя');
    return ctx.providerId;
  }

  async create(
    actorId: string,
    clientId: string,
    input: CreateInput,
    onConnected?: (requestIds: string[]) => void,
  ) {
    const providerId = await this.providerId(actorId);
    const message = input.message?.trim() || null;
    if (!input.serviceId && !message)
      throw new BadRequestException('Опишите задачу клиента');
    const result = await this.prisma.$transaction(async (tx) => {
      const client = await lockProviderClient(tx, providerId, clientId);
      const op = await withWriteOperation(
        tx,
        {
          actorUserId: actorId,
          scope: 'provider-client-request:' + clientId,
          key: input.operationId,
          input,
        },
        async () => {
          const service = input.serviceId
            ? await tx.service.findFirst({
                where: {
                  id: input.serviceId,
                  providerId,
                  status: 'PUBLISHED',
                },
                select: { id: true, price: true },
              })
            : null;
          if (input.serviceId && !service)
            throw new NotFoundException(
              'Услуга не найдена в профиле исполнителя',
            );
          if (input.requestCityId) {
            await assertActiveSelectableCity(tx, input.requestCityId);
          }
          const price = parseFixedServicePriceRubles(service?.price);
          return tx.request.create({
            data: {
              providerId,
              providerClientId: client.id,
              providerWorkStatus: 'PLANNED',
              lockedAt: new Date(),
              status: 'DISCUSSING',
              serviceId: service?.id,
              customerUserId: client.customerUserId,
              customerEmail: client.email,
              customerName: client.name,
              message,
              requestCityId: input.requestCityId,
              location: input.location?.trim() || null,
              servicePriceRubles: price,
              totalAmountRubles: price,
              events: {
                create: {
                  type: 'PROVIDER_CREATED_REQUEST',
                  actorUserId: actorId,
                  actorProviderId: providerId,
                  payload: {
                    status: 'PLANNED',
                    authorName: await authorName(tx, actorId),
                  },
                },
              },
              ...(price != null && {
                priceProposals: {
                  create: {
                    amountRubles: price,
                    authorSide: 'PROVIDER',
                    proposedByUserId: actorId,
                    providerId,
                    isDirectSet: true,
                  },
                },
              }),
            },
            select: { id: true },
          });
        },
      );
      const changedRequestIds = client.customerUserId
        ? []
        : await connectVerifiedCustomerWork(tx, { clientId });
      return { ...op.value, changedRequestIds };
    });
    onConnected?.(result.changedRequestIds);
    return { id: result.id };
  }

  private async requirePrivateRequest(
    db: Pick<Prisma.TransactionClient, 'request'>,
    providerId: string,
    id: string,
  ) {
    const row = await db.request.findFirst({
      where: { id, providerId, providerWorkStatus: { not: null } },
      select: { status: true, providerWorkStatus: true },
    });
    if (!row) throw new NotFoundException('Приватная заявка не найдена');
    return row;
  }

  async setStatus(actorId: string, id: string, status: ProviderWorkStatus) {
    const providerId = await this.providerId(actorId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${id}::uuid AND "providerId" = ${providerId}::uuid FOR UPDATE`;
      const row = await this.requirePrivateRequest(tx, providerId, id);
      if (row.providerWorkStatus !== status) {
        if (
          ['ACCEPTED', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(row.status)
        ) {
          throw new ConflictException('Работа по этой заявке завершена');
        }
        await tx.request.update({
          where: { id },
          data: {
            providerWorkStatus: status,
            events: {
              create: {
                type: 'PROVIDER_WORK_STATUS_CHANGED',
                actorUserId: actorId,
                actorProviderId: providerId,
                payload: {
                  previous: row.providerWorkStatus,
                  status,
                  authorName: await authorName(tx, actorId),
                },
              },
            },
          },
        });
      }
      return { status };
    });
  }

  async history(actorId: string, id: string) {
    const providerId = await this.providerId(actorId);
    await this.requirePrivateRequest(this.prisma, providerId, id);
    const rows = await this.prisma.requestEvent.findMany({
      where: {
        requestId: id,
        actorProviderId: providerId,
        type: {
          in: ['PROVIDER_CREATED_REQUEST', 'PROVIDER_WORK_STATUS_CHANGED'],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, createdAt: true, payload: true },
    });
    const events = rows.map((row) => {
      const data = row.payload as {
        status: ProviderWorkStatus;
        authorName: string;
      };
      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        status: data.status,
        authorName: data.authorName,
      };
    });
    return { events };
  }

  async listNotes(actorId: string, id: string) {
    const providerId = await this.providerId(actorId);
    await this.requirePrivateRequest(this.prisma, providerId, id);
    const notes = await this.prisma.requestEvent.findMany({
      where: { requestId: id, actorProviderId: providerId, type: noteType },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, payload: true, createdAt: true },
    });
    return notes.map(noteDto);
  }

  async addNote(
    actorId: string,
    id: string,
    input: { text: string; operationId?: string },
  ) {
    const providerId = await this.providerId(actorId);
    const text = input.text.trim();
    if (!text) throw new BadRequestException('Введите текст заметки');
    return this.prisma.$transaction(async (tx) => {
      await this.requirePrivateRequest(tx, providerId, id);
      const op = await withWriteOperation(
        tx,
        {
          actorUserId: actorId,
          scope: 'provider-work-note:' + id,
          key: input.operationId,
          input,
        },
        async () => {
          return noteDto(
            await tx.requestEvent.create({
              data: {
                requestId: id,
                actorProviderId: providerId,
                actorUserId: actorId,
                type: noteType,
                payload: { text, authorName: await authorName(tx, actorId) },
              },
            }),
          );
        },
      );
      return op.value;
    });
  }
}
