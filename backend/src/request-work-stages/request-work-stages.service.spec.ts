import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestWorkStagesService } from './request-work-stages.service';

function makeService(prisma: unknown, auth?: unknown) {
  return new RequestWorkStagesService(
    prisma as any,
    (auth ?? {
      getServiceManagementContext: vi.fn().mockResolvedValue({
        isPlatformAdmin: false,
        providerId: 'p1',
      }),
    }) as any,
    {
      privatePrefix: 'private/',
      privateBucket: 'b',
      client: { send: vi.fn().mockResolvedValue({}) },
    } as any,
  );
}

const activeRequest = {
  id: 'r1',
  status: 'ACTIVE',
  providerId: 'p1',
  lockedAt: new Date('2026-08-07T00:00:00.000Z'),
  customerUserId: 'c1',
};

describe('RequestWorkStagesService', () => {
  it('createDraft ok при ACTIVE', async () => {
    const created = {
      id: 's1',
      requestId: 'r1',
      title: 'Этап',
      description: '',
      statusKey: 'AWAITING_RESPONSE',
      statusLabel: 'Ожидание ответа',
      lifecycle: 'DRAFT',
      publishedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      docSlots: [],
    };
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      providerUserSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      requestWorkStage: {
        aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: null } }),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const svc = makeService(prisma);
    const result = await svc.createDraft({
      actorUserId: 'u1',
      requestId: 'r1',
      title: 'Этап',
      statusKey: 'AWAITING_RESPONSE',
    });
    expect(result.lifecycle).toBe('DRAFT');
    expect(result.statusLabel).toBe('Ожидание ответа');
  });

  it('createDraft отклоняет не-ACTIVE', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          ...activeRequest,
          status: 'DISCUSSING',
        }),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.createDraft({
        actorUserId: 'u1',
        requestId: 'r1',
        title: 'Этап',
        statusKey: 'AWAITING_RESPONSE',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publish переводит draft в published; повтор — ошибка', async () => {
    const published = {
      id: 's1',
      requestId: 'r1',
      title: 'Этап',
      description: '',
      statusKey: 'AWAITING_RESPONSE',
      statusLabel: 'Ожидание ответа',
      lifecycle: 'PUBLISHED',
      publishedAt: new Date(),
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      docSlots: [],
    };
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      requestWorkStage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: 's1', lifecycle: 'DRAFT' })
          .mockResolvedValueOnce({ id: 's1', lifecycle: 'PUBLISHED' }),
        update: vi.fn().mockResolvedValue(published),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.publish({ actorUserId: 'u1', requestId: 'r1', stageId: 's1' }),
    ).resolves.toMatchObject({ lifecycle: 'PUBLISHED' });
    await expect(
      svc.publish({ actorUserId: 'u1', requestId: 'r1', stageId: 's1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateDraft title после publish — ошибка', async () => {
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      requestWorkStage: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 's1', lifecycle: 'PUBLISHED' }),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.updateDraft({
        actorUserId: 'u1',
        requestId: 'r1',
        stageId: 's1',
        title: 'Новое',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateStatus после publish — ok', async () => {
    const updated = {
      id: 's1',
      requestId: 'r1',
      title: 'Этап',
      description: '',
      statusKey: 'COMPLETED',
      statusLabel: 'Завершено',
      lifecycle: 'PUBLISHED',
      publishedAt: new Date(),
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      docSlots: [],
    };
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      providerUserSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      requestWorkStage: {
        findFirst: vi.fn().mockResolvedValue({ id: 's1' }),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.updateStatus({
        actorUserId: 'u1',
        requestId: 'r1',
        stageId: 's1',
        statusKey: 'COMPLETED',
      }),
    ).resolves.toMatchObject({
      statusKey: 'COMPLETED',
      statusLabel: 'Завершено',
    });
  });

  it('listForCustomer не возвращает DRAFT', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          providerId: 'p1',
          status: 'ACTIVE',
          lockedAt: new Date(),
        }),
      },
      requestWorkStage: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const svc = makeService(prisma);
    await svc.listForCustomer({ actorUserId: 'c1', requestId: 'r1' });
    expect(prisma.requestWorkStage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lifecycle: 'PUBLISHED' }),
      }),
    );
  });

  it('deleteStage отклоняет не-последний этап', async () => {
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      requestWorkStage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: 's1',
            files: [],
            docSlots: [],
          })
          .mockResolvedValueOnce({ id: 's2' }),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.deleteStage({ actorUserId: 'u1', requestId: 'r1', stageId: 's1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteStage удаляет последний опубликованный этап', async () => {
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(activeRequest) },
      requestWorkStage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            id: 's2',
            files: [{ storageRelPath: 'private/a.bin' }],
            docSlots: [{ storageRelPath: 'private/b.bin' }, { storageRelPath: null }],
          })
          .mockResolvedValueOnce({ id: 's2' }),
        delete: vi.fn().mockResolvedValue({ id: 's2' }),
      },
    };
    const svc = makeService(prisma);
    const result = await svc.deleteStage({
      actorUserId: 'u1',
      requestId: 'r1',
      stageId: 's2',
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.requestWorkStage.delete).toHaveBeenCalledWith({
      where: { id: 's2' },
      select: { id: true },
    });
  });

  it('replaceCustomStatuses запрещает удаление при ACTIVE использовании', async () => {
    const prisma = {
      providerUserSettings: {
        findUnique: vi.fn().mockResolvedValue({
          workStageStatuses: [{ key: 'custom_1', label: 'Кастом' }],
        }),
        upsert: vi.fn(),
      },
      requestWorkStage: {
        findFirst: vi.fn().mockResolvedValue({ id: 's1' }),
      },
    };
    const svc = makeService(prisma);
    await expect(
      svc.replaceCustomWorkStageStatuses({
        actorUserId: 'u1',
        custom: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.providerUserSettings.upsert).not.toHaveBeenCalled();
  });
});
