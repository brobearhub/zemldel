import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';
import { AuthService } from '../auth/auth.service';

const providerSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  ownerUserId: true,
  cityId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const providerMemberSelect = {
  id: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  },
} as const;

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async getActiveMembership(userId: string, providerId: string) {
    const membership = await this.prisma.providerMember.findUnique({
      where: {
        providerId_userId: {
          providerId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Provider access denied');
    }

    return membership;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async ensureProviderOwner(userId: string, providerId: string) {
    const membership = await this.getActiveMembership(userId, providerId);

    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Only provider owner can manage members');
    }

    return membership;
  }

  private async ensureProviderManagerOrOwner(userId: string, providerId: string) {
    const membership = await this.getActiveMembership(userId, providerId);

    if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
      throw new ForbiddenException('Provider access denied');
    }

    return membership;
  }

  async createProvider(userId: string, body: CreateProviderDto) {
    const name = body.name.trim();
    const slug = body.slug.trim().toLowerCase();
    const cityId = body.cityId ?? null;

    if (cityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: cityId },
        select: { id: true, typeName: true, level: true },
      });
      if (!city) {
        throw new NotFoundException('City not found');
      }
      const ok =
        (city.typeName === 'г' && (city.level === 5 || city.level === 1)) ||
        (city.typeName === 'г.о.' && city.level === 3);
      if (!ok) {
        throw new BadRequestException('Invalid city');
      }
    }

    const existingBySlug = await this.prisma.provider.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existingBySlug) {
      throw new ConflictException('Provider slug already exists');
    }

    if (body.type === 'SELF_EMPLOYED') {
      const existingSelfEmployed = await this.prisma.provider.findFirst({
        where: {
          type: 'SELF_EMPLOYED',
          ownerUserId: userId,
        },
        select: { id: true },
      });

      if (existingSelfEmployed) {
        throw new ConflictException(
          'User already owns a self-employed provider profile',
        );
      }
    }

    const provider = await this.prisma.$transaction(async (tx) => {
      const createdProvider = await tx.provider.create({
        data: {
          name,
          slug,
          type: body.type,
          ownerUserId: userId,
          cityId,
        },
        select: providerSelect,
      });

      await tx.providerMember.create({
        data: {
          providerId: createdProvider.id,
          userId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          activeProviderId: createdProvider.id,
        },
      });

      return createdProvider;
    });

    const authContext = await this.authService.getUserAuthContext(userId);

    return {
      provider,
      authContext,
    };
  }

  async updateProviderCity(
    userId: string,
    providerId: string,
    input: { cityId?: string | null },
  ) {
    if (!providerId) {
      throw new BadRequestException('providerId is required');
    }

    let nextCityId: string | null | undefined = input.cityId;

    if (nextCityId !== undefined && nextCityId !== null && typeof nextCityId !== 'string') {
      throw new BadRequestException('Invalid cityId');
    }

    if (typeof nextCityId === 'string') {
      nextCityId = nextCityId.trim();
      if (nextCityId.length === 0) nextCityId = null;
    }

    if (nextCityId === undefined) {
      throw new BadRequestException('cityId is required');
    }

    await this.ensureProviderManagerOrOwner(userId, providerId);

    if (nextCityId !== null) {
      if (!this.isUuid(nextCityId)) {
        throw new BadRequestException('Invalid cityId');
      }
      const exists = await this.prisma.city.findUnique({
        where: { id: nextCityId },
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

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        cityId: nextCityId,
      },
      select: {
        id: true,
        cityId: true,
        city: {
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
      cityId: updated.cityId,
      city: updated.city,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getMyProviders(userId: string) {
    return this.prisma.providerMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        role: true,
        status: true,
        provider: {
          select: providerSelect,
        },
      },
    });
  }

  async activateProvider(userId: string, providerId: string) {
    await this.getActiveMembership(userId, providerId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        activeProviderId: providerId,
      },
    });

    return this.authService.getUserAuthContext(userId);
  }

  async getProviderMembers(userId: string, providerId: string) {
    await this.getActiveMembership(userId, providerId);

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        members: {
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          select: providerMemberSelect,
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async addProviderManager(
    actorUserId: string,
    providerId: string,
    body: AddProviderManagerDto,
  ) {
    await this.ensureProviderOwner(actorUserId, providerId);

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        type: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.type === 'SELF_EMPLOYED') {
      throw new ConflictException(
        'Self-employed provider cannot have managers',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User with this email was not found');
    }

    if (user.id === actorUserId) {
      throw new ConflictException('Owner already has access to this provider');
    }

    const existingMembership = await this.prisma.providerMember.findUnique({
      where: {
        providerId_userId: {
          providerId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (existingMembership?.role === 'OWNER') {
      throw new ConflictException('User is already owner of this provider');
    }

    const membership = await this.prisma.providerMember.upsert({
      where: {
        providerId_userId: {
          providerId,
          userId: user.id,
        },
      },
      update: {
        role: 'MANAGER',
        status: 'ACTIVE',
      },
      create: {
        providerId,
        userId: user.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
      select: providerMemberSelect,
    });

    return membership;
  }
}
