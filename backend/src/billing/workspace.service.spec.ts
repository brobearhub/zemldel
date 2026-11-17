import { describe, expect, it, vi } from 'vitest';
import { WorkspaceService } from './workspace.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PlanService } from './plan.service';
import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';

describe('WorkspaceService service views', () => {
  it('records a view with duplicate-safe insertion for the visitor and UTC day', async () => {
    const prisma = {
      service: { findFirst: vi.fn().mockResolvedValue({ id: 'service-1' }) },
      serviceView: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const workspace = new WorkspaceService(
      prisma as unknown as PrismaService,
      {} as PlanService,
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T09:14:23Z'));
    try {
      await expect(workspace.view('service-1', 'visitor-1')).resolves.toEqual({
        ok: true,
      });
      const hash = createHash('sha256')
        .update('service-1:visitor-1')
        .digest('hex');
      expect(prisma.serviceView.createMany).toHaveBeenCalledWith({
        data: [{ serviceId: 'service-1', visitorDay: `2026-11-17:${hash}` }],
        skipDuplicates: true,
      });
      prisma.serviceView.createMany.mockRejectedValueOnce(
        new Error('database unavailable'),
      );
      await expect(workspace.view('service-1', 'visitor-1')).rejects.toThrow(
        'database unavailable',
      );
      prisma.service.findFirst.mockResolvedValueOnce(null);
      await expect(
        workspace.view('missing', 'visitor-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.serviceView.createMany).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('WorkspaceService task entities', () => {
  it('returns client names and the complete task collection within the authorized provider', async () => {
    const tasks = Array.from({ length: 201 }, (_, id) => ({ id: String(id) }));
    const requests = [
      {
        id: 'guest',
        customerName: 'Имя из заявки',
        customerUser: null,
        message: 'Свободная заявка',
        service: null,
        status: 'NEW',
      },
      {
        id: 'registered',
        number: 17,
        customerName: null,
        customerUser: { name: 'Имя профиля' },
        message: '',
        service: { title: 'Межевание' },
        status: 'ACTIVE',
      },
    ];
    const prisma = {
      replyTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      providerTeamTask: {
        findMany: vi
          .fn()
          .mockImplementation(({ take }: { take?: number }) =>
            tasks.slice(0, take),
          ),
      },
      providerMember: { findMany: vi.fn().mockResolvedValue([]) },
      service: { findMany: vi.fn().mockResolvedValue([]) },
      request: { findMany: vi.fn().mockResolvedValue(requests) },
    };
    const plans = {
      member: vi.fn().mockResolvedValue({}),
      access: vi.fn().mockResolvedValue({
        plan: 'BUSINESS',
        limits: { team: true, statistics: 0 },
      }),
    };
    const service = new WorkspaceService(
      prisma as unknown as PrismaService,
      plans as unknown as PlanService,
    );
    const result = await service.read('user', 'provider');
    expect(plans.member).toHaveBeenCalledWith('user', 'provider');
    expect(prisma.providerTeamTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 'provider' } }),
    );
    expect(result.tasks).toHaveLength(201);
    expect(result.requests).toEqual([
      {
        id: 'guest',
        number: null,
        title: 'Свободная заявка',
        status: 'NEW',
        customerName: 'Имя из заявки',
      },
      {
        id: 'registered',
        number: 17,
        title: 'Межевание',
        status: 'ACTIVE',
        customerName: 'Имя профиля',
      },
    ]);
    plans.member.mockRejectedValueOnce(new Error('Forbidden'));
    prisma.providerTeamTask.findMany.mockClear();
    await expect(service.read('outsider', 'provider')).rejects.toThrow(
      'Forbidden',
    );
    expect(prisma.providerTeamTask.findMany).not.toHaveBeenCalled();
  });
});
