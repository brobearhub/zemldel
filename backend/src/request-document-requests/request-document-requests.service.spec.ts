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

    (prisma as any).$transaction = vi.fn((run: any) =>
      run({
        ...prisma,
        request: {
          ...prisma.request,
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );

    const svc = new RequestDocumentRequestsService(
      prisma as any,
      {} as any,
      {
        putObject: vi.fn().mockResolvedValue({}),
        deleteObject: vi.fn().mockResolvedValue(undefined),
        getObject: vi.fn(),
        isSecureKey: (key: string) => key.startsWith('documents/'),
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
      {
        putObject: vi.fn(),
        deleteObject: vi.fn().mockResolvedValue(undefined),
        getObject: vi.fn(),
        isSecureKey: (key: string) => key.startsWith('documents/'),
      } as any,
    );

    await expect(
      svc.deleteFileForCustomer({
        actorUserId: 'u1',
        requestId: 'r1',
        docRequestId: 'd1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('preserves the previous object if saving a replacement fails', async () => {
    const oldKey = 'private/previous.pdf';
    const request = {
      id: 'r1',
      providerId: 'p1',
      status: 'DISCUSSING',
      lockedAt: new Date(),
    };
    const doc = { id: 'd1', storageRelPath: oldKey };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue(request),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      requestDocumentRequest: {
        findFirst: vi.fn().mockResolvedValue(doc),
        update: vi.fn().mockRejectedValue(new Error('DB failed')),
      },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation((run) => run(prisma));
    const s3 = {
      putObject: vi.fn().mockResolvedValue({}),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
      isSecureKey: (key: string) => key.startsWith('documents/'),
    };
    const service = new RequestDocumentRequestsService(
      prisma as never,
      {} as never,
      s3 as never,
    );
    await expect(
      service.uploadForCustomer({
        actorUserId: 'u',
        requestId: 'r1',
        docRequestId: 'd1',
        file: {
          originalname: 'replacement.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('replacement'),
          size: 11,
        } as Express.Multer.File,
      }),
    ).rejects.toThrow('DB failed');
    const put = s3.putObject.mock.calls[0][0];
    expect(put.Key).not.toBe(oldKey);
    expect(put.Key).toMatch(/^documents\//);
    expect(s3.deleteObject).toHaveBeenCalledWith(put.Key);
    expect(s3.deleteObject).not.toHaveBeenCalledWith(oldKey);
  });
  it('does not upload any object if the provider scope changes before the write lock', async () => {
    const request = {
      id: 'r1',
      providerId: 'p1',
      status: 'DISCUSSING',
      lockedAt: new Date(),
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue(request),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      requestDocumentRequest: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'd1', storageRelPath: null }),
      },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation((run) => run(prisma));
    const s3 = {
      putObject: vi.fn(),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getObject: vi.fn(),
      isSecureKey: (key: string) => key.startsWith('documents/'),
    };
    const service = new RequestDocumentRequestsService(
      prisma as never,
      {} as never,
      s3 as never,
    );
    await expect(
      service.uploadForCustomer({
        actorUserId: 'u',
        requestId: 'r1',
        docRequestId: 'd1',
        file: {
          originalname: 'qa.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('QA'),
          size: 2,
        } as Express.Multer.File,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(s3.putObject).not.toHaveBeenCalled();
  });
});
