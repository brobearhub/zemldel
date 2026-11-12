import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../billing/plan.service';
import { serviceSelect } from '../services/services.service';
import { serviceDbRowToDtoPlain } from '../services/dto/service.dto';
import { formatPublicProviderName } from '../providers/provider-display-name';
import { lockCustomerInterest, shortCustomerName } from './favorite-policy';

const PAGE_SIZE = 24;
@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlanService,
  ) {}

  async customer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountKind: true, systemRole: true },
    });
    if (
      !user ||
      user.accountKind !== 'CUSTOMER' ||
      user.systemRole === 'PLATFORM_ADMIN'
    )
      throw new ForbiddenException('Избранное доступно в кабинете клиента');
  }

  async provider(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeProviderId: true,
        systemRole: true,
        providerMemberships: {
          where: { status: 'ACTIVE' },
          orderBy: { providerId: 'asc' },
          select: { providerId: true },
        },
      },
    });
    const providerId =
      user?.activeProviderId ?? user?.providerMemberships[0]?.providerId;
    if (!providerId || user?.systemRole === 'PLATFORM_ADMIN')
      throw new ForbiddenException('Нет доступа к профилю');
    await this.plans.member(userId, providerId);
    return providerId;
  }

  async set(
    userId: string,
    kind: 'services' | 'providers',
    id: string,
    saved: boolean,
  ) {
    await this.customer(userId);
    return this.prisma.$transaction(async (tx) => {
      const service =
        kind === 'services'
          ? await tx.service.findUnique({
              where: { id },
              select: { providerId: true, status: true },
            })
          : null;
      const providerId = kind === 'services' ? service?.providerId : id;
      if (!providerId) {
        if (!saved) return { saved: false };
        throw new NotFoundException('Услуга недоступна');
      }
      await lockCustomerInterest(tx, userId, providerId);
      if (saved) {
        if (service && service.status !== 'PUBLISHED')
          throw new NotFoundException('Услуга недоступна');
        const provider = await tx.provider.findUnique({
          where: { id: providerId },
          select: {
            id: true,
            ownerUserId: true,
            members: {
              where: { userId, status: 'ACTIVE' },
              select: { userId: true },
            },
          },
        });
        if (!provider) throw new NotFoundException('Исполнитель недоступен');
        if (provider.ownerUserId === userId || provider.members.length)
          throw new BadRequestException(
            'Нельзя сохранить собственный профиль или услугу',
          );
      }
      if (kind === 'services') {
        if (saved)
          await tx.serviceFavorite.upsert({
            where: { userId_serviceId: { userId, serviceId: id } },
            create: { userId, serviceId: id },
            update: {},
          });
        else
          await tx.serviceFavorite.deleteMany({
            where: { userId, serviceId: id },
          });
      } else {
        if (saved)
          await tx.providerFavorite.upsert({
            where: { userId_providerId: { userId, providerId: id } },
            create: { userId, providerId: id },
            update: {},
          });
        else
          await tx.providerFavorite.deleteMany({
            where: { userId, providerId: id },
          });
      }
      return { saved };
    });
  }

  async states(userId: string, serviceIds: string[], providerIds: string[]) {
    await this.customer(userId);
    const [services, providers] = await Promise.all([
      this.prisma.serviceFavorite.findMany({
        where: { userId, serviceId: { in: serviceIds } },
        select: { serviceId: true },
      }),
      this.prisma.providerFavorite.findMany({
        where: { userId, providerId: { in: providerIds } },
        select: { providerId: true },
      }),
    ]);
    return {
      services: services.map((row) => row.serviceId),
      providers: providers.map((row) => row.providerId),
    };
  }

  async list(userId: string, kind: 'services' | 'providers', page: number) {
    await this.customer(userId);
    const pagination = {
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      orderBy: [{ createdAt: 'desc' as const }],
    };
    if (kind === 'services') {
      const rows = await this.prisma.serviceFavorite.findMany({
        where: { userId },
        ...pagination,
        orderBy: [{ createdAt: 'desc' }, { serviceId: 'asc' }],
        select: {
          serviceId: true,
          createdAt: true,
          service: { select: serviceSelect },
        },
      });
      return {
        items: rows.slice(0, PAGE_SIZE).map((row) => ({
          id: row.serviceId,
          savedAt: row.createdAt.toISOString(),
          service:
            row.service.status === 'PUBLISHED'
              ? serviceDbRowToDtoPlain(row.service)
              : null,
        })),
        hasMore: rows.length > PAGE_SIZE,
      };
    }
    const rows = await this.prisma.providerFavorite.findMany({
      where: { userId },
      ...pagination,
      orderBy: [{ createdAt: 'desc' }, { providerId: 'asc' }],
      select: {
        providerId: true,
        createdAt: true,
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            slug: true,
            image: true,
            rating: true,
            reviewCount: true,
            city: { select: { name: true } },
          },
        },
      },
    });
    return {
      items: rows.slice(0, PAGE_SIZE).map((row) => ({
        id: row.providerId,
        savedAt: row.createdAt.toISOString(),
        provider: {
          ...row.provider,
          name: formatPublicProviderName(row.provider),
        },
      })),
      hasMore: rows.length > PAGE_SIZE,
    };
  }

  async interest(
    userId: string,
    query: {
      page: number;
      filter?: string;
      serviceId?: string;
      state?: string;
      summary?: string;
    },
  ) {
    const providerId = await this.provider(userId);
    const { plan } = await this.plans.access(providerId);
    const [profileCount, services, totals] = await Promise.all([
      this.prisma.providerFavorite.count({ where: { providerId } }),
      this.prisma.service.findMany({
        where: { providerId },
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          _count: { select: { favorites: true } },
        },
      }),
      this.prisma.$queryRaw<
        Array<{ count: bigint }>
      >`SELECT COUNT(DISTINCT "userId") AS count FROM (SELECT "userId" FROM "ProviderFavorite" WHERE "providerId" = ${providerId}::uuid UNION ALL SELECT f."userId" FROM "ServiceFavorite" f JOIN "Service" s ON s.id = f."serviceId" WHERE s."providerId" = ${providerId}::uuid) i`,
    ]);
    const summary = {
      providerId,
      profileCount,
      services: services.map((s) => ({
        id: s.id,
        title: s.title,
        count: s._count.favorites,
      })),
      interestedCount: Number(totals[0]?.count ?? 0),
      canContact: plan === 'BUSINESS',
    };
    if (plan !== 'BUSINESS' || query.summary === '1')
      return { ...summary, items: [], hasMore: false };
    const serviceFilter = query.serviceId
      ? Prisma.sql`AND f."serviceId" = ${query.serviceId}::uuid`
      : Prisma.empty;
    const stateFilter =
      query.state === 'NONE'
        ? Prisma.sql`AND c.id IS NULL`
        : query.state
          ? Prisma.sql`AND c."directState"::text = ${query.state}`
          : Prisma.empty;
    const ids = await this.prisma.$queryRaw<
      Array<{ userId: string; savedAt: Date }>
    >`
      SELECT i."userId", MAX(i."createdAt") AS "savedAt" FROM (
        SELECT "userId", "createdAt" FROM "ProviderFavorite" WHERE "providerId" = ${providerId}::uuid AND ${!query.serviceId}
        UNION ALL SELECT f."userId", f."createdAt" FROM "ServiceFavorite" f JOIN "Service" s ON s.id = f."serviceId" WHERE s."providerId" = ${providerId}::uuid AND ${query.filter !== 'profile'} ${serviceFilter}
      ) i LEFT JOIN "Conversation" c ON c."customerUserId" = i."userId" AND c."providerId" = ${providerId}::uuid AND c.kind = 'DIRECT'
      WHERE TRUE ${stateFilter} GROUP BY i."userId" ORDER BY MAX(i."createdAt") DESC, i."userId" ASC LIMIT ${PAGE_SIZE + 1} OFFSET ${query.page * PAGE_SIZE}`;
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids.slice(0, PAGE_SIZE).map((row) => row.userId) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        favoriteProviders: {
          where: { providerId },
          select: { providerId: true },
        },
        favoriteServices: {
          where: { service: { providerId } },
          select: {
            service: { select: { id: true, title: true, status: true } },
          },
        },
        customerConversations: {
          where: { providerId, kind: 'DIRECT' },
          select: { id: true, directState: true },
        },
      },
    });
    const items = ids.slice(0, PAGE_SIZE).map((row) => {
      const user = users.find((u) => u.id === row.userId)!;
      return {
        customerId: user.id,
        name: shortCustomerName(user),
        savedAt: row.savedAt.toISOString(),
        profile: user.favoriteProviders.length > 0,
        services: user.favoriteServices.map((f) => ({
          id: f.service.id,
          title: f.service.title,
          available: f.service.status === 'PUBLISHED',
        })),
        conversationId: user.customerConversations[0]?.id ?? null,
        state: user.customerConversations[0]?.directState ?? 'NONE',
      };
    });
    return { ...summary, items, hasMore: ids.length > PAGE_SIZE };
  }
}
