import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestDocumentRequestsService } from './request-document-requests.service';

describe('RequestDocumentRequestsService', () => {
  it('uploadForCustomer allows upload without enforcing order', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          providerId: 'p1',
          status: 'DISCUSSING',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
        }),
      },
      requestDocumentRequest: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'd2',
          storageRelPath: null,
        }),
        update: vi.fn().mockResolvedValue({ id: 'd2' }),
      },
    };

    const svc = new RequestDocumentRequestsService(
      prisma as any,
      {} as any,
      {
        privatePrefix: 'private/',
        privateBucket: 'b',
        client: { send: vi.fn().mockResolvedValue({}) },
      } as any,
    );

    await expect(
      svc.uploadForCustomer({
        actorUserId: 'u1',
        requestId: 'r1',
        docRequestId: 'd2',
        file: {
          originalname: 'x.pdf',
          mimetype: 'application/pdf',
          size: 10,
          buffer: Buffer.from('123'),
        } as any,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it('deleteFileForCustomer запрещает удаление после ACTIVE', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          providerId: 'p1',
          status: 'ACTIVE',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
        }),
      },
    };

    const svc = new RequestDocumentRequestsService(
      prisma as any,
      {} as any,
      { privatePrefix: 'private/', privateBucket: 'b', client: { send: vi.fn() } } as any,
    );

    await expect(
      svc.deleteFileForCustomer({
        actorUserId: 'u1',
        requestId: 'r1',
        docRequestId: 'd1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
