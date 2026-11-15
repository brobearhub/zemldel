import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 50;
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  accountKind: true,
  createdAt: true,
} as const;

function parsePage(value?: string) {
  const page = Number(value ?? '1');
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000)
    throw new BadRequestException('Некорректный номер страницы');
  return page;
}

@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdmin(actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { systemRole: true },
    });
    if (actor?.systemRole !== 'PLATFORM_ADMIN')
      throw new ForbiddenException('Только для администратора платформы');
  }

  async list(actorUserId: string, query: { q?: string; page?: string }) {
    await this.assertAdmin(actorUserId);
    const page = parsePage(query.page);
    const q = query.q?.trim() ?? '';
    if (q.length > 200)
      throw new BadRequestException('Поисковый запрос слишком длинный');
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              q,
            )
              ? [{ id: q }]
              : []),
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async passportAudit(actorUserId: string, userId: string, pageValue?: string) {
    await this.assertAdmin(actorUserId);
    const page = parsePage(pageValue);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const where = { passportUserId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.passportAccessAudit.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          action: true,
          actorUserId: true,
          actorProviderId: true,
          requestId: true,
          createdAt: true,
        },
      }),
      this.prisma.passportAccessAudit.count({ where }),
    ]);
    const actorIds = [
      ...new Set(
        rows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])),
      ),
    ];
    const providerIds = [
      ...new Set(
        rows.flatMap((row) =>
          row.actorProviderId ? [row.actorProviderId] : [],
        ),
      ),
    ];
    const requestIds = [
      ...new Set(rows.flatMap((row) => (row.requestId ? [row.requestId] : []))),
    ];
    // Audit references deliberately survive deletion of the actor, provider or request.
    const [actors, providers, requests] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true },
      }),
      this.prisma.request.findMany({
        where: { id: { in: requestIds } },
        select: {
          id: true,
          number: true,
          service: { select: { title: true } },
          category: { select: { name: true } },
        },
      }),
    ]);
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const providerById = new Map(
      providers.map((provider) => [provider.id, provider.name]),
    );
    const requestById = new Map(
      requests.map((request) => [request.id, request]),
    );
    return {
      user,
      items: rows.map((row) => {
        const actor = row.actorUserId ? actorById.get(row.actorUserId) : null;
        const request = row.requestId ? requestById.get(row.requestId) : null;
        return {
          ...row,
          actorName: actor?.name?.trim() || actor?.email || null,
          providerName: row.actorProviderId
            ? (providerById.get(row.actorProviderId) ?? null)
            : null,
          requestNumber: request?.number ?? null,
          requestTitle:
            request?.service?.title ?? request?.category?.name ?? null,
        };
      }),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }
}
