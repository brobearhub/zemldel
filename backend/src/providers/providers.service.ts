import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import { createHash } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { assertContactPhone } from '../common/contact-phone';
import { assertContactEmail } from '../common/contact-email';
import { assertActiveSelectableCity } from '../cities/city-validation';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';
import { UpdateProviderPublicProfileDto } from './dto/update-provider-public-profile.dto';
import { AuthService } from '../auth/auth.service';
import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { S3Service } from '../storage/s3.service';

const publicProviderSelect = {
  id: true,
  name: true,
  type: true,
  city: {
    select: {
      id: true,
      name: true,
      regionCode: true,
      regionName: true,
    },
  },
  slug: true,
  image: true,
  rating: true,
  reviewCount: true,
  subtitle: true,
  about: true,
  phone: true,
  email: true,
  useOwnEmail: true,
  stats: true,
  ownerUser: {
    select: {
      image: true,
      email: true,
    },
  },
} as const;

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

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function sniffImageExt(buf: Buffer, mimeType: string) {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  if (mimeType === 'image/png') {
    if (
      buf.length >= 8 &&
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return '.png';
    }
    return null;
  }
  if (mimeType === 'image/jpeg') {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return '.jpg';
    }
    return null;
  }
  if (mimeType === 'image/webp') {
    if (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return '.webp';
    }
    return null;
  }
  return null;
}

function tryExtractKeyFromPublicUrl(input: { url: string; baseUrl: string }) {
  try {
    const u = new URL(input.url);
    const b = new URL(input.baseUrl);
    if (u.origin !== b.origin) return null;
    const key = u.pathname.replace(/^\//, '');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

type PublicProviderRow = {
  id: string;
  name: string;
  slug: string;
  type: 'SELF_EMPLOYED' | 'COMPANY';
  rating: number | null;
  reviewCount: number;
  city: {
    id: string;
    name: string;
    regionCode: string;
    regionName: string;
  } | null;
  image: string | null;
  subtitle: string | null;
  about: string | null;
  phone: string | null;
  email: string | null;
  useOwnEmail: boolean;
  stats: unknown;
  ownerUser: { image: string | null; email: string | null } | null;
};

const DEFAULT_PROVIDER_STATS: Array<{ value: string; label: string }> = [
  { value: '12 лет', label: 'практики в недвижимости' },
  { value: '640+', label: 'сопровождённых сделок' },
  { value: '98%', label: 'клиентов рекомендуют нас' },
];

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly legalDocs: LegalDocsService,
    private readonly s3: S3Service,
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

  private async hasActiveMembership(userId: string, providerId: string) {
    const membership = await this.prisma.providerMember.findFirst({
      where: { userId, providerId, status: 'ACTIVE' },
      select: { id: true },
    });
    return Boolean(membership);
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

  async getPublicProviderProfile(providerId: string, actorUserId?: string | null) {
    const id = providerId?.trim();
    if (!id) {
      throw new BadRequestException('providerId is required');
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: publicProviderSelect,
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const revealOwnerEmail = actorUserId
      ? await this.hasActiveMembership(actorUserId, id)
      : false;
    return this.toPublicProviderProfile(provider as unknown as PublicProviderRow, {
      revealOwnerEmail,
    });
  }

  async getPublicProviderProfileBySlug(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) throw new NotFoundException('Provider not found');
    const provider = await this.prisma.provider.findUnique({
      where: { slug: normalized },
      select: publicProviderSelect,
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.toPublicProviderProfile(provider as unknown as PublicProviderRow);
  }

  async updatePublicProviderProfile(
    actorUserId: string,
    providerId: string,
    input: UpdateProviderPublicProfileDto,
  ) {
    const id = providerId?.trim();
    if (!id) {
      throw new BadRequestException('providerId is required');
    }

    const hasAnyField =
      input.name !== undefined ||
      input.subtitle !== undefined ||
      input.about !== undefined ||
      input.phone !== undefined ||
      input.email !== undefined ||
      input.useOwnEmail !== undefined ||
      input.stats !== undefined;
    if (!hasAnyField) {
      throw new BadRequestException('No fields to update');
    }

    const nextName =
      input.name !== undefined
        ? typeof input.name === 'string' && input.name.trim().length > 0
          ? input.name.trim()
          : null
        : undefined;

    if (nextName === null) {
      throw new BadRequestException('Invalid name');
    }

    if (nextName !== undefined) {
      // Why: provider name is a public identifier in UI; only owner can change it.
      await this.ensureProviderOwner(actorUserId, id);
    } else {
      await this.ensureProviderManagerOrOwner(actorUserId, id);
    }

    const nextStats =
      input.stats !== undefined
        ? input.stats.map((s) => ({
            value: s.value.trim(),
            label: s.label.trim(),
          }))
        : undefined;

    const nextPhone =
      input.phone === undefined
        ? undefined
        : input.phone === null
          ? null
          : assertContactPhone(input.phone);

    const nextEmail =
      input.email === undefined
        ? undefined
        : input.email === null
          ? null
          : assertContactEmail(input.email);

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        name: nextName,
        subtitle: input.subtitle,
        about: input.about,
        phone: nextPhone,
        email: nextEmail,
        useOwnEmail: input.useOwnEmail,
        stats: nextStats,
      },
      select: publicProviderSelect,
    });

    return this.toPublicProviderProfile(updated as unknown as PublicProviderRow, {
      revealOwnerEmail: true,
    });
  }

  private toPublicProviderProfile(
    provider: PublicProviderRow,
    options?: { revealOwnerEmail?: boolean },
  ) {
    function isPublicStats(
      value: unknown,
    ): value is Array<{ value: string; label: string }> {
      if (!Array.isArray(value)) return false;
      if (value.length !== 3) return false;
      return value.every((item) => {
        if (typeof item !== 'object' || item === null) return false;
        const obj = item as Record<string, unknown>;
        const valueField = obj.value;
        const labelField = obj.label;
        if (typeof valueField !== 'string') return false;
        if (typeof labelField !== 'string') return false;
        if (valueField.trim().length === 0) return false;
        if (labelField.trim().length === 0) return false;
        return true;
      });
    }

    // Why: Public profile must not leak private/membership/legal data.
    // Until provider-controlled fields exist, we return safe defaults matching current landing design.
    const subtitle =
      provider.subtitle?.trim() ? provider.subtitle.trim() : 'Эксперт по услуге';
    const about = provider.about?.trim()
      ? provider.about.trim()
      : 'Разберёмся в вашей ситуации, объясним варианты и предложим понятный путь к результату.';
    const stats = isPublicStats(provider.stats)
      ? provider.stats.map((s) => ({ value: s.value.trim(), label: s.label.trim() }))
      : DEFAULT_PROVIDER_STATS;

    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      type: provider.type,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      city: provider.city,
      providerImage: provider.image ?? null,
      image: provider.image ?? provider.ownerUser?.image ?? null,
      subtitle,
      about,
      phone: provider.phone?.trim() ? provider.phone.trim() : null,
      email: provider.email?.trim() ? provider.email.trim() : null,
      useOwnEmail: provider.useOwnEmail,
      ...(options?.revealOwnerEmail
        ? { ownerEmail: provider.ownerUser?.email?.trim() || null }
        : {}),
      availabilityLabel: 'На связи сегодня',
      stats,
    };
  }

  async uploadProviderImage(input: {
    actorUserId: string;
    providerId: string;
    file: Express.Multer.File;
  }) {
    const providerId = input.providerId?.trim();
    if (!providerId) {
      throw new BadRequestException('providerId is required');
    }

    await this.ensureProviderManagerOrOwner(input.actorUserId, providerId);

    const bucket = this.s3.requirePublicBucket();
    const cdnBase = this.s3.requirePublicCdnBaseUrl();

    const buf = input.file.buffer as Buffer | undefined;
    if (!buf || buf.length === 0) {
      throw new BadRequestException('file is required');
    }

    const ext = sniffImageExt(buf, input.file.mimetype);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const prev = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { image: true },
    });
    if (!prev) {
      throw new NotFoundException('Provider not found');
    }

    const hash = sha256Buffer(buf);
    const key = `${this.s3.publicPrefix}providers/${providerId}/${hash}${ext}`;
    const url = `${cdnBase.replace(/\/+$/, '')}/${key}`;

    try {
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ACL: 'public-read',
          ContentType: input.file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch {
      throw new BadGatewayException('File storage unavailable');
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: { image: url },
      select: publicProviderSelect,
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({
            url: prev.image,
            baseUrl: this.s3.publicCdnBaseUrl,
          })
        : null;

    if (
      prevKey &&
      prevKey !== key &&
      prevKey.startsWith(`${this.s3.publicPrefix}providers/${providerId}/`)
    ) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return this.toPublicProviderProfile(updated as unknown as PublicProviderRow, {
      revealOwnerEmail: true,
    });
  }

  async deleteProviderImage(input: { actorUserId: string; providerId: string }) {
    const providerId = input.providerId?.trim();
    if (!providerId) {
      throw new BadRequestException('providerId is required');
    }

    await this.ensureProviderManagerOrOwner(input.actorUserId, providerId);

    const bucket = this.s3.requirePublicBucket();
    const prev = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { image: true },
    });
    if (!prev) {
      throw new NotFoundException('Provider not found');
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: { image: null },
      select: publicProviderSelect,
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({
            url: prev.image,
            baseUrl: this.s3.publicCdnBaseUrl,
          })
        : null;

    if (prevKey && prevKey.startsWith(`${this.s3.publicPrefix}providers/${providerId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return this.toPublicProviderProfile(updated as unknown as PublicProviderRow, {
      revealOwnerEmail: true,
    });
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
