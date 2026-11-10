import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
import type { PrismaService } from '../prisma/prisma.service';
import {
  eligibleRequestCategories,
  freeRequestEligibilityWhere,
} from '../requests/free-request-eligibility';

export const FREE_REQUEST_PROVIDERS_ROOM = 'providers:free-requests';
export const FREE_REQUEST_BATCH_MS = 5000;
export type FreeRequestNotification = {
  requestId: string;
  createdAt: string;
  categoryId: string | null;
  regionCode: string | null;
};

const audienceSelect = {
  id: true,
  activeProviderId: true,
  providerMemberships: {
    where: { status: 'ACTIVE' },
    orderBy: { providerId: 'asc' },
    select: {
      providerId: true,
      provider: {
        select: {
          city: { select: { regionCode: true } },
          services: {
            where: { status: 'PUBLISHED' },
            select: { categoryId: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;
type AudienceUser = Prisma.UserGetPayload<{ select: typeof audienceSelect }>;

function activeProvider(user: AudienceUser) {
  return (
    user.providerMemberships.find(
      (row) => row.providerId === user.activeProviderId,
    ) ?? user.providerMemberships[0]
  )?.provider;
}

function newer(left: FreeRequestNotification, right: FreeRequestNotification) {
  const difference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return difference > 0 ||
    (difference === 0 && left.requestId > right.requestId)
    ? left
    : right;
}

function marker(row: FreeRequestNotification) {
  return { requestId: row.requestId, createdAt: row.createdAt };
}

export class FreeRequestBroadcast {
  private readonly logger = new Logger(FreeRequestBroadcast.name);
  private pending = new Map<string, FreeRequestNotification>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private flushing = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly server: () => Server,
  ) {}

  enqueue(payload: FreeRequestNotification) {
    if (this.stopped || !payload.regionCode) return;
    const key = JSON.stringify([payload.regionCode, payload.categoryId]);
    const previous = this.pending.get(key);
    this.pending.set(key, previous ? newer(previous, payload) : payload);
    this.schedule();
  }

  private schedule() {
    if (this.stopped || this.timer || this.flushing || !this.pending.size)
      return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, FREE_REQUEST_BATCH_MS);
    this.timer.unref();
  }

  async snapshot(userId: string) {
    const [user, categories] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, accountKind: 'PROVIDER' },
        select: audienceSelect,
      }),
      this.prisma.serviceCategory.findMany({
        select: { id: true, parentId: true },
      }),
    ]);
    const provider = user && activeProvider(user);
    if (!provider?.city) return null;
    const eligible = eligibleRequestCategories(
      provider.services.map((row) => row.categoryId),
      categories,
    );
    const latest = await this.prisma.request.findFirst({
      where: {
        AND: [freeRequestEligibilityWhere(provider.city.regionCode, eligible)],
        providerId: null,
        status: { in: ['NEW', 'DISCUSSING'] },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, createdAt: true },
    });
    return latest
      ? { requestId: latest.id, createdAt: latest.createdAt.toISOString() }
      : null;
  }

  async flush() {
    if (this.flushing || this.stopped || !this.pending.size) return;
    this.flushing = true;
    const batch = this.pending;
    this.pending = new Map();
    try {
      const server = this.server();
      const sockets = await server
        .in(FREE_REQUEST_PROVIDERS_ROOM)
        .fetchSockets();
      const userIds = [
        ...new Set(
          sockets.map((socket) => (socket.data as { userId: string }).userId),
        ),
      ];
      if (!userIds.length) return;
      const categories = await this.prisma.serviceCategory.findMany({
        select: { id: true, parentId: true },
      });
      // Read current publications/memberships, so editing services takes effect
      // without requiring a socket reconnect. Bound database query size.
      for (let start = 0; start < userIds.length; start += 500) {
        const users = await this.prisma.user.findMany({
          where: {
            id: { in: userIds.slice(start, start + 500) },
            accountKind: 'PROVIDER',
          },
          select: audienceSelect,
        });
        for (const user of users) {
          const provider = activeProvider(user);
          if (!provider?.city) continue;
          const eligible = eligibleRequestCategories(
            provider.services.map((row) => row.categoryId),
            categories,
          );
          let latest: FreeRequestNotification | undefined;
          for (const categoryId of [null, ...eligible]) {
            const row = batch.get(
              JSON.stringify([provider.city.regionCode, categoryId]),
            );
            if (row) latest = latest ? newer(latest, row) : row;
          }
          if (latest)
            server
              .to(`user:${user.id}`)
              .emit('free-request.created', marker(latest));
        }
      }
    } catch (error) {
      this.logger.warn(`Free request broadcast failed: ${String(error)}`);
      for (const payload of batch.values()) this.enqueue(payload);
    } finally {
      this.flushing = false;
      this.schedule();
    }
  }

  destroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.pending.clear();
  }
}
