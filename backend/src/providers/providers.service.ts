import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { assertActiveSelectableCity } from '../cities/city-validation';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';
import { AuthService } from '../auth/auth.service';
import { LegalDocsService } from '../legal-docs/legal-docs.service';

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const slugLength = 3; // 16 000 000 combinations

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly legalDocs: LegalDocsService,
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

  private async ensureProviderManagerOrOwner(
    userId: string,
    providerId: string,
  ) {
    const membership = await this.getActiveMembership(userId, providerId);

    if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
      throw new ForbiddenException('Provider access denied');
    }

    return membership;
  }

  async checkSlugAvailability(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      return { available: false };
    }
    const existing = await this.prisma.provider.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });
    return { available: !existing };
  }

  async updateProviderSlug(userId: string, providerId: string, slug: string) {
    await this.ensureProviderOwner(userId, providerId);

    const normalized = slug.trim().toLowerCase();
    if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw new BadRequestException('Invalid slug format');
    }

    const existing = await this.prisma.provider.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });
    if (existing && existing.id !== providerId) {
      throw new ConflictException('Provider slug already exists');
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: { slug: normalized },
      select: { id: true, slug: true },
    });

    return updated;
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const baseSlug = slugify(base) || crypto.randomBytes(3).toString('hex');

    const exists = await this.prisma.provider.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    if (!exists) return baseSlug;

    for (let i = 2; i <= 20; i++) {
      const candidate = `${baseSlug}-${i}`;
      const taken = await this.prisma.provider.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }

    return `${baseSlug}-${crypto.randomBytes(slugLength).toString('hex')}`;
  }

  async createProvider(userId: string, body: CreateProviderDto) {
    const name = body.name.trim();
    const cityId = body.cityId ?? null;

    if (cityId) {
      await assertActiveSelectableCity(this.prisma, cityId);
    }

    let slug: string;
    if (body.slug) {
      slug = body.slug.trim().toLowerCase();
      const existingBySlug = await this.prisma.provider.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existingBySlug) {
        throw new ConflictException('Provider slug already exists');
      }
    } else {
      slug = await this.generateUniqueSlug(name);
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

    const offerVersions = await this.legalDocs.assertCurrentVersions({
      offer: body.offerVersion,
    });

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

      await tx.legalAcceptance.create({
        data: {
          userId,
          docId: 'OFFER',
          version: offerVersions.offer,
          context: 'PROVIDER_ONBOARDING',
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

    if (
      nextCityId !== undefined &&
      nextCityId !== null &&
      typeof nextCityId !== 'string'
    ) {
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
      await assertActiveSelectableCity(this.prisma, nextCityId);
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
