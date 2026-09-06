import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { assertActiveSelectableCity } from './city-validation';

describe('assertActiveSelectableCity', () => {
  it('throws NotFoundException when city is missing', async () => {
    const prisma = {
      city: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      assertActiveSelectableCity(prisma as never, '00000000-0000-0000-0000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when city is inactive', async () => {
    const prisma = {
      city: {
        findUnique: vi.fn().mockResolvedValue({
          id: '00000000-0000-0000-0000-000000000001',
          typeName: 'г',
          level: 5,
          status: 'INACTIVE',
        }),
      },
    };

    await expect(
      assertActiveSelectableCity(prisma as never, '00000000-0000-0000-0000-000000000001'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes for active allowed location', async () => {
    const prisma = {
      city: {
        findUnique: vi.fn().mockResolvedValue({
          id: '00000000-0000-0000-0000-000000000001',
          typeName: 'г',
          level: 5,
          status: 'ACTIVE',
        }),
      },
    };

    await expect(
      assertActiveSelectableCity(prisma as never, '00000000-0000-0000-0000-000000000001'),
    ).resolves.toBeUndefined();
  });
});
