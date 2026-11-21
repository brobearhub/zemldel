import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RequestStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { assertContactEmail } from '../common/contact-email';
import {
  attachClientRequests,
  ensureProviderClient,
  lockProviderClient,
} from './provider-client-record';

const clientSelect = {
  id: true,
  name: true,
  email: true,
  customerUserId: true,
  source: true,
  createdAt: true,
  invitationExpiresAt: true,
} satisfies Prisma.ProviderClientSelect;

const summaryRequestSelect = {
  status: true,
  createdAt: true,
  service: { select: { title: true } },
} satisfies Prisma.RequestSelect;

type ClientRow = Prisma.ProviderClientGetPayload<{
  select: typeof clientSelect;
}>;
type OrderRow = Prisma.RequestGetPayload<{
  select: typeof summaryRequestSelect;
}>;

function summarize(client: ClientRow, requests: OrderRow[]) {
  const { invitationExpiresAt, ...contact } = client;
  const statuses: Partial<Record<RequestStatus, number>> = {};
  const titles = new Set<string>();
  for (const row of requests) {
    statuses[row.status] = (statuses[row.status] ?? 0) + 1;
    if (titles.size < 3 && row.service?.title) titles.add(row.service.title);
  }
  const invited =
    invitationExpiresAt && invitationExpiresAt.getTime() > Date.now();
  const status = contact.customerUserId
    ? 'CONNECTED'
    : invited
      ? 'INVITED'
      : 'CONTACT';
  return {
    ...contact,
    status,
    ordersCount: requests.length,
    lastOrderAt: requests[0]?.createdAt ?? null,
    recentServiceTitles: [...titles],
    statuses,
  };
}

const INVALID_LINK =
  'Ссылка недействительна. Попросите исполнителя создать новую.';

function invitationHash(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new GoneException(INVALID_LINK);
  return createHash('sha256').update(token).digest('hex');
}

// A provider can compare two issued links without exposing the stored token verifier.
function invitationVersion(hash: string) {
  return createHash('sha256').update(hash).digest('base64url');
}

@Injectable()
export class ProviderClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async providerFor(userId: string) {
    const ctx = await this.auth.getOrderManagementContext(userId, 'read');
    if (ctx.isPlatformAdmin || !ctx.providerId)
      throw new ForbiddenException('Доступен кабинет исполнителя');
    return ctx.providerId;
  }

  async list(providerId: string) {
    const rows = await this.prisma.providerClient.findMany({
      where: { providerId },
      select: {
        ...clientSelect,
        requests: {
          where: { providerId },
          select: summaryRequestSelect,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(({ requests, ...client }) => summarize(client, requests));
  }

  async detail(providerId: string, id: string) {
    const row = await this.prisma.providerClient.findFirst({
      where: { providerId, id },
      select: {
        ...clientSelect,
        invitationHash: true,
        requests: {
          where: { providerId },
          orderBy: { createdAt: 'desc' },
          select: {
            ...summaryRequestSelect,
            id: true,
            number: true,
            message: true,
            providerWorkStatus: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Клиент не найден');
    const { requests, invitationHash: hash, ...client } = row;
    const summary = summarize(client, requests);
    return {
      ...summary,
      invitationVersion:
        summary.status === 'INVITED' && hash ? invitationVersion(hash) : null,
      invitationExpiresAt:
        summary.status === 'INVITED' ? client.invitationExpiresAt : null,
      requests: requests.map(({ service, ...r }) => ({
        ...r,
        serviceTitle: service?.title ?? null,
      })),
    };
  }

  async create(
    providerId: string,
    body: { email: string; name?: string | null },
  ) {
    const email = assertContactEmail(body.email).toLowerCase();
    const id = await this.prisma.$transaction((tx) =>
      ensureProviderClient(
        tx,
        providerId,
        email,
        body.name?.trim() || null,
        'MANUAL',
      ),
    );
    return this.detail(providerId, id);
  }

  async edit(
    providerId: string,
    id: string,
    body: { email?: string; name?: string | null },
  ) {
    const email =
      body.email === undefined
        ? undefined
        : assertContactEmail(body.email).toLowerCase();
    const name =
      body.name === undefined ? undefined : body.name?.trim() || null;
    try {
      await this.prisma.$transaction(async (tx) => {
        const client = await lockProviderClient(tx, providerId, id);
        const changeEmail = email !== undefined && email !== client.email;
        if (changeEmail && client.customerUserId)
          throw new ConflictException(
            'Почту подключённого клиента изменить нельзя',
          );
        await tx.providerClient.update({
          where: { id },
          data: {
            name,
            ...(changeEmail && {
              email,
              invitationHash: null,
              invitationExpiresAt: null,
            }),
          },
        });
        if (changeEmail || name !== undefined) {
          await tx.request.updateMany({
            where: {
              providerId,
              providerClientId: id,
              providerWorkStatus: { not: null },
              customerUserId: null,
            },
            data: { customerEmail: email, customerName: name },
          });
        }
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('У вас уже есть клиент с этим email');
      }
      throw err;
    }
    return this.detail(providerId, id);
  }

  async issue(providerId: string, id: string) {
    const token = randomBytes(32).toString('base64url');
    const hash = invitationHash(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      const client = await lockProviderClient(tx, providerId, id);
      if (client.customerUserId)
        throw new ConflictException('Клиент уже подключён');
      await tx.providerClient.update({
        where: { id },
        data: {
          invitationHash: hash,
          invitationExpiresAt: expiresAt,
        },
      });
    });
    return {
      path: `/client-invitations/${token}`,
      expiresAt,
      version: invitationVersion(hash),
    };
  }

  async revoke(providerId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const client = await lockProviderClient(tx, providerId, id);
      if (client.customerUserId)
        throw new ConflictException('Клиент уже подключён');
      await tx.providerClient.update({
        where: { id },
        data: { invitationHash: null, invitationExpiresAt: null },
      });
    });
    return { ok: true };
  }

  async preview(token: string) {
    const client = await this.prisma.providerClient.findUnique({
      where: { invitationHash: invitationHash(token) },
      select: {
        email: true,
        invitationExpiresAt: true,
        customerUserId: true,
        provider: { select: { name: true } },
      },
    });
    if (
      !client?.invitationExpiresAt ||
      client.invitationExpiresAt.getTime() <= Date.now()
    )
      throw new GoneException(INVALID_LINK);
    return {
      email: client.email,
      providerName: client.provider.name,
      expiresAt: client.invitationExpiresAt,
      accepted: Boolean(client.customerUserId),
    };
  }

  async accept(userId: string, token: string) {
    const hash = invitationHash(token);
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.providerClient.findUnique({
        where: { invitationHash: hash },
        select: { id: true, providerId: true },
      });
      if (!candidate) throw new GoneException(INVALID_LINK);
      const client = await lockProviderClient(
        tx,
        candidate.providerId,
        candidate.id,
      );
      if (
        client.invitationHash !== hash ||
        !client.invitationExpiresAt ||
        client.invitationExpiresAt.getTime() <= Date.now()
      )
        throw new GoneException(INVALID_LINK);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { accountKind: true, email: true, emailVerified: true },
      });
      if (
        !user ||
        !user.emailVerified ||
        user.email.trim().toLowerCase() !== client.email
      )
        throw new ForbiddenException(
          'Войдите с подтверждённой почтой, указанной в приглашении',
        );
      if (user.accountKind !== 'CUSTOMER')
        throw new ForbiddenException('Для подключения нужен аккаунт клиента');
      if (client.customerUserId && client.customerUserId !== userId)
        throw new GoneException(INVALID_LINK);
      if (client.customerUserId)
        return { clientId: client.id, changedRequestIds: [] };
      await tx.providerClient.update({
        where: { id: client.id },
        data: { customerUserId: userId },
      });
      const changedRequestIds = await attachClientRequests(
        tx,
        client.providerId,
        client.id,
        userId,
      );
      return { clientId: client.id, changedRequestIds };
    });
  }
}
