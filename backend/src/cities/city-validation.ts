import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { isAllowedLocationRow } from './location';

type CityLookupClient = Pick<PrismaService, 'city'>;

export async function assertActiveSelectableCity(
  prisma: CityLookupClient,
  cityId: string,
): Promise<void> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { id: true, typeName: true, level: true, status: true },
  });
  if (!city) {
    throw new NotFoundException('City not found');
  }
  if (!isAllowedLocationRow(city)) {
    throw new BadRequestException('Invalid location');
  }
  if (city.status !== 'ACTIVE') {
    throw new BadRequestException('City is not available');
  }
}
