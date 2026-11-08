import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from './plan.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlanService,
  ) {}

  async read(userId: string, providerId: string) {
    await this.plans.member(userId, providerId);
    const { plan, limits } = await this.plans.access(providerId);
    const [templates, tasks, members, services, requests] = await Promise.all([
      this.prisma.replyTemplate.findMany({
        where: { providerId, OR: [{ authorUserId: userId }, { shared: true }] },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.providerTeamTask.findMany({
        where: { providerId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.providerMember.findMany({
        where: { providerId, status: 'ACTIVE' },
        select: { userId: true, user: { select: { name: true, email: true } } },
      }),
      this.prisma.service.findMany({
        where: { providerId },
        select: {
          id: true,
          title: true,
          views: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true },
          },
          _count: { select: { views: true, requests: true } },
        },
      }),
      this.prisma.request.findMany({
        where: {
          OR: [{ providerId }, { conversations: { some: { providerId } } }],
        },
        select: {
          id: true,
          createdAt: true,
          message: true,
          customerName: true,
          customerUser: { select: { name: true } },
          service: { select: { title: true } },
          status: true,
          serviceId: true,
          requestCity: { select: { regionName: true } },
          _count: { select: { workStages: true } },
        },
      }),
    ]);
    const stats: Record<string, unknown> = {
      services: services.length,
      requests: requests.length,
    };
    if (limits.statistics >= 1)
      stats.byService = services.map((s) => {
        const since = s.views[0]?.createdAt;
        const leads = since
          ? requests.filter((r) => r.serviceId === s.id && r.createdAt >= since)
              .length
          : 0;
        return {
          id: s.id,
          title: s.title,
          views: s._count.views,
          leads,
          conversion: s._count.views
            ? Math.round((leads / s._count.views) * 10000) / 100
            : 0,
        };
      });
    if (limits.statistics >= 2) {
      const regions: Record<string, number> = {},
        stages: Record<string, number> = {};
      for (const request of requests) {
        const region = request.requestCity?.regionName ?? 'Не указан';
        regions[region] = (regions[region] ?? 0) + 1;
        stages[request.status] = (stages[request.status] ?? 0) + 1;
      }
      stats.regions = regions;
      stats.stages = stages;
      stats.team = members.map((m) => ({
        userId: m.userId,
        name: m.user.name ?? m.user.email,
        tasks: tasks.filter((t) => t.assigneeUserId === m.userId).length,
        completed: tasks.filter((t) => t.assigneeUserId === m.userId && t.done)
          .length,
      }));
    }
    return {
      plan,
      limits,
      templates,
      tasks,
      members: members.map((m) => ({
        id: m.userId,
        name: m.user.name ?? m.user.email,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        title:
          r.service?.title ?? r.message?.slice(0, 80) ?? 'Свободная заявка',
        status: r.status,
        customerName: r.customerName ?? r.customerUser?.name ?? null,
      })),
      stats,
    };
  }

  async template(
    userId: string,
    providerId: string,
    input: {
      id: string;
      title: string;
      body: string;
      shared: boolean;
      remove?: boolean;
    },
  ) {
    await this.plans.member(userId, providerId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Provider" WHERE id = ${providerId}::uuid FOR UPDATE`;
      await this.plans.requireFeature(
        providerId,
        input.shared ? 'sharedTemplates' : 'templates',
        tx,
      );
      const previous = await tx.replyTemplate.findUnique({
        where: { id: input.id },
      });
      if (
        previous &&
        (previous.providerId !== providerId ||
          (!previous.shared && previous.authorUserId !== userId))
      )
        throw new ForbiddenException('Нет доступа к шаблону');
      if (previous?.shared)
        await this.plans.requireFeature(providerId, 'sharedTemplates', tx);
      if (input.remove) {
        if (!previous) throw new NotFoundException();
        return tx.replyTemplate.delete({ where: { id: input.id } });
      }
      if (!input.title.trim() || !input.body.trim())
        throw new BadRequestException('Заполните название и текст');
      return tx.replyTemplate.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          providerId,
          authorUserId: userId,
          title: input.title.trim(),
          body: input.body.trim(),
          shared: input.shared,
        },
        update: {
          title: input.title.trim(),
          body: input.body.trim(),
          shared: input.shared,
        },
      });
    });
  }

  async task(
    userId: string,
    providerId: string,
    input: {
      id: string;
      title: string;
      note: string;
      assigneeUserId?: string | null;
      requestId?: string | null;
      dueAt?: string | null;
      done: boolean;
    },
  ) {
    await this.plans.member(userId, providerId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Provider" WHERE id = ${providerId}::uuid FOR UPDATE`;
      await this.plans.requireFeature(providerId, 'team', tx);
      const previous = await tx.providerTeamTask.findUnique({
        where: { id: input.id },
      });
      if (previous && previous.providerId !== providerId)
        throw new ForbiddenException();
      if (!input.title.trim())
        throw new BadRequestException('Укажите название задачи');
      if (
        input.assigneeUserId &&
        !(await tx.providerMember.findFirst({
          where: { providerId, userId: input.assigneeUserId, status: 'ACTIVE' },
        }))
      )
        throw new BadRequestException('Сотрудник не состоит в профиле');
      if (
        input.requestId &&
        !(await tx.request.findFirst({
          where: {
            id: input.requestId,
            OR: [{ providerId }, { conversations: { some: { providerId } } }],
          },
        }))
      )
        throw new ForbiddenException('Нет доступа к заявке');
      const data = {
        title: input.title.trim(),
        note: input.note,
        assigneeUserId: input.assigneeUserId ?? null,
        requestId: input.requestId ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        done: input.done,
      };
      const event = {
        userId,
        at: new Date().toISOString(),
        ...data,
        dueAt: data.dueAt?.toISOString() ?? null,
      };
      const history = [
        ...(Array.isArray(previous?.history) ? previous.history : []),
        event,
      ] as Prisma.InputJsonArray;
      return tx.providerTeamTask.upsert({
        where: { id: input.id },
        create: { id: input.id, providerId, ...data, history },
        update: { ...data, history },
      });
    });
  }

  async view(serviceId: string, visitorId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!service) throw new NotFoundException();
    const visitorDay =
      new Date().toISOString().slice(0, 10) +
      ':' +
      createHash('sha256').update(`${serviceId}:${visitorId}`).digest('hex');
    await this.prisma.serviceView.upsert({
      where: { serviceId_visitorDay: { serviceId, visitorDay } },
      create: { serviceId, visitorDay },
      update: {},
    });
    return { ok: true };
  }
}
