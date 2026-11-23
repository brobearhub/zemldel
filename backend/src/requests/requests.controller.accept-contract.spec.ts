import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestsController } from './requests.controller';
import type { RequestWithChanges } from './request-realtime.interceptor';

function setup() {
  const requests = {
    getRequiredActorUserId: vi.fn().mockReturnValue('u1'),
    acceptContractByCustomer: vi
      .fn()
      .mockResolvedValue({ id: 'r1', changedRequestIds: ['previous'] }),
  };
  return { requests, controller: new RequestsController(requests as never) };
}

describe('customer contract acceptance price snapshot', () => {
  it.each([
    {
      expected: 25000,
      input: { termsVersion: 'v1', expectedTotalAmountRubles: 25000 },
    },
    {
      expected: 0,
      input: { termsVersion: 'v1', expectedTotalAmountRubles: 0 },
    },
    {
      expected: null,
      input: { termsVersion: 'v1', expectedTotalAmountRubles: null },
    },
    { expected: undefined, input: { termsVersion: 'v1' } },
  ])('forwards valid snapshot $expected', async ({ expected, input }) => {
    const { requests, controller } = setup();
    const request = {} as RequestWithChanges;
    expect(
      await controller.customerAcceptContract(request, 'r1', input),
    ).toEqual({ id: 'r1' });
    expect(request.changedRequestIds).toEqual(['previous']);
    expect(requests.acceptContractByCustomer).toHaveBeenCalledWith('u1', 'r1', {
      termsVersion: 'v1',
      ...(expected !== undefined
        ? { expectedTotalAmountRubles: expected }
        : {}),
    });
  });

  it.each([-1, 1.5, '25000', {}, [], NaN, Infinity])(
    'rejects invalid snapshot %o',
    async (expected) => {
      const { requests, controller } = setup();
      await expect(
        controller.customerAcceptContract({} as never, 'r1', {
          termsVersion: 'v1',
          expectedTotalAmountRubles: expected,
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(requests.acceptContractByCustomer).not.toHaveBeenCalled();
    },
  );
});
