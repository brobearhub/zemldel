import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ContractsService } from './contracts.service';

function createService(prisma: any, auth: any) {
  return new ContractsService(prisma, auth);
}

describe('ContractsService contract editor guards', () => {
  it('allows only platform admins to list admin-managed contract blocks', async () => {
    const service = createService(
      { contractBlock: { findMany: vi.fn() } },
      {
        getServiceManagementContext: vi
          .fn()
          .mockResolvedValue({ isPlatformAdmin: false }),
      },
    );

    await expect(service.listBlocksAdmin('user-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks signing while anchored comments are open', async () => {
    const service = createService(
      {
        contractInstance: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'contract-id',
            status: 'SENT',
            content: {
              format: 'tiptap',
              version: 1,
              document: { type: 'doc' },
            },
            requestId: null,
            providerId: 'provider-id',
            customerUserId: 'customer-id',
            signatures: [],
          }),
        },
        contractCommentThread: { count: vi.fn().mockResolvedValue(1) },
      },
      {},
    );

    await expect(
      service.signByCustomer({
        actorUserId: 'customer-id',
        contractId: 'contract-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a sent contract when the customer signs even without provider signature', async () => {
    const contractUpdate = vi.fn();
    const requestUpdateMany = vi.fn();
    const service = createService(
      {
        contractInstance: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'contract-id',
            status: 'SENT',
            content: { format: 'markdown', markdown: 'Contract text' },
            requestId: 'request-id',
            providerId: 'provider-id',
            customerUserId: 'customer-id',
            signatures: [],
          }),
        },
        contractCommentThread: { count: vi.fn().mockResolvedValue(0) },
        $transaction: vi.fn().mockImplementation(async (callback) =>
          callback({
            contractSignature: { upsert: vi.fn() },
            contractInstance: { update: contractUpdate },
            request: { updateMany: requestUpdateMany },
          }),
        ),
      },
      {},
    );

    await expect(
      service.signByCustomer({
        actorUserId: 'customer-id',
        contractId: 'contract-id',
      }),
    ).resolves.toEqual({ ok: true });

    expect(contractUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-id' },
        data: { status: 'SIGNED' },
      }),
    );
    expect(requestUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-id', status: 'PROVIDER_SELECTED' },
        data: expect.objectContaining({ status: 'CONTRACT_ACCEPTED' }),
      }),
    );
  });

  it('attaches a provider draft contract to an eligible selected request', async () => {
    const contractUpdate = vi.fn().mockResolvedValue({ id: 'contract-id' });
    const service = createService(
      {
        request: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'request-id',
            status: 'PROVIDER_SELECTED',
            providerId: 'provider-id',
            customerUserId: 'customer-id',
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'request-id',
            customerName: 'Customer',
            customerEmail: 'customer@example.com',
            customerPhone: null,
            location: null,
            dealTerms: null,
            requestCity: null,
          }),
        },
        requestProviderOffer: { findFirst: vi.fn() },
        contractInstance: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'contract-id',
            status: 'DRAFT',
            requestId: null,
          }),
          update: contractUpdate,
        },
        provider: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'provider-id',
            name: 'Provider',
            slug: 'provider',
            type: 'COMPANY',
            city: null,
            legalProfile: null,
          }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'customer-id',
            name: 'Customer',
            email: 'customer@example.com',
            phone: null,
            customerCity: null,
            customerLegalProfile: null,
            passportDocument: null,
          }),
        },
      },
      {
        getServiceManagementContext: vi.fn().mockResolvedValue({
          isPlatformAdmin: false,
          providerId: 'provider-id',
        }),
      },
    );

    await expect(
      service.attachDraftToRequestByProvider('actor-id', {
        contractId: 'contract-id',
        requestId: 'request-id',
      }),
    ).resolves.toEqual({ id: 'contract-id' });

    expect(contractUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-id' },
        data: expect.objectContaining({
          requestId: 'request-id',
          customerUserId: 'customer-id',
        }),
      }),
    );
  });
});
