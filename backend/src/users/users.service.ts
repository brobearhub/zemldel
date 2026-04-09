import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  createUser(body: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: string, input: { customerCityId?: string | null }) {
    let nextCustomerCityId: string | null | undefined = input.customerCityId;

    if (
      nextCustomerCityId !== undefined &&
      nextCustomerCityId !== null &&
      typeof nextCustomerCityId !== 'string'
    ) {
      throw new BadRequestException('Invalid customerCityId');
    }

    if (typeof nextCustomerCityId === 'string') {
      nextCustomerCityId = nextCustomerCityId.trim();
      if (nextCustomerCityId.length === 0) {
        nextCustomerCityId = null;
      }
    }

    if (nextCustomerCityId !== undefined && nextCustomerCityId !== null) {
      if (!this.isUuid(nextCustomerCityId)) {
        throw new BadRequestException('Invalid customerCityId');
      }
      const exists = await this.prisma.city.findUnique({
        where: { id: nextCustomerCityId },
        select: { id: true, typeName: true, level: true },
      });
      if (!exists) {
        throw new NotFoundException('City not found');
      }
      const ok =
        (exists.typeName === 'г' && (exists.level === 5 || exists.level === 1)) ||
        (exists.typeName === 'г.о.' && exists.level === 3);
      if (!ok) {
        throw new BadRequestException('Invalid city');
      }
    }

    if (nextCustomerCityId === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        customerCityId: nextCustomerCityId,
      },
      select: {
        id: true,
        customerCityId: true,
        customerCity: {
          select: {
            id: true,
            name: true,
            regionCode: true,
            regionName: true,
          },
        },
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      customerCityId: updated.customerCityId,
      customerCity: updated.customerCity,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
