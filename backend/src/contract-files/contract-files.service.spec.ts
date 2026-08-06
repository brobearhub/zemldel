import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ContractFilesService } from './contract-files.service';

describe('ContractFilesService', () => {
  it('deleteForProvider запрещает удаление после ACTIVE', async () => {
    const prisma = {
      requestContractFile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'f1',
          requestId: 'r1',
          uploadedByUserId: 'u1',
          storageRelPath: 'private/requests/r1/contract-files/f1.pdf',
        }),
        delete: vi.fn(),
      },
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'p1',
          lockedAt: new Date('2026-08-06T00:00:00.000Z'),
          customerUserId: 'c1',
        }),
      },
      requestProviderOffer: {
        findFirst: vi.fn(),
      },
    };

    const authService = {
      getServiceManagementContext: vi.fn().mockResolvedValue({
        isPlatformAdmin: false,
        providerId: 'p1',
      }),
    };

    const s3 = {
      privateBucket: 'b',
      privatePrefix: 'private/',
      client: { send: vi.fn() },
    };

    const svc = new ContractFilesService(prisma as any, authService as any, s3 as any);

    await expect(svc.deleteForProvider({ actorUserId: 'u1', fileId: 'f1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('deleteForProvider запрещает удаление чужого файла (по uploadedByUserId)', async () => {
    const prisma = {
      requestContractFile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'f1',
          requestId: 'r1',
          uploadedByUserId: 'u2',
          storageRelPath: 'private/requests/r1/contract-files/f1.pdf',
        }),
      },
    };

    const authService = {
      getServiceManagementContext: vi.fn().mockResolvedValue({
        isPlatformAdmin: false,
        providerId: 'p1',
      }),
    };

    const s3 = {
      privateBucket: 'b',
      privatePrefix: 'private/',
      client: { send: vi.fn() },
    };

    const svc = new ContractFilesService(prisma as any, authService as any, s3 as any);

    await expect(svc.deleteForProvider({ actorUserId: 'u1', fileId: 'f1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

