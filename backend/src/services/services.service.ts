import { PlanService } from '../billing/plan.service';
import { publicServiceForPlan } from '../billing/service-plan';
import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { S3Service } from '../storage/s3.service';
import {
  type ServiceStatus,
  type ServiceCreateDto,
  type ServiceDbRow,
  type ServiceDto,
  type ServicePatchDto,
  serviceDbRowToDtoPlain,
} from './dto/service.dto';
import type { ServiceManagementAction } from '../auth/authorization';
import { assertActiveSelectableCity } from '../cities/city-validation';
import {
  normalizeServicePlaces,
  orderByExplicitCity,
  type NormalizedServicePlace,
} from './service-places';

const serviceSelect = {
  allRussia: true,
  regionOrder: true,
  id: true,
  categoryId: true,
  status: true,
  title: true,
  image: true,
  images: true,
  stockBadge: true,
  price: true,
  rating: true,
  reviewCount: true,
  description: true,
  paletteColor: true,
  publishedAt: true,
  provider: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      verificationStatus: true,
      billingTestAccount: {
        select: {
          plan: true,
          planExpiresAt: true,
          graceUntil: true,
          autoRenew: true,
        },
      },
      city: {
        select: {
          id: true,
          name: true,
          regionCode: true,
          regionName: true,
        },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  },
  cities: {
    select: {
      city: {
        select: {
          id: true,
          name: true,
          regionCode: true,
          regionName: true,
        },
      },
    },
    orderBy: { city: { name: 'asc' } },
  },
  regions: {
    select: {
      regionCode: true,
      regionName: true,
    },
    orderBy: { regionName: 'asc' },
  },
} satisfies Prisma.ServiceSelect;

type ServiceScope = {
  providerId?: string | null;
  cityId?: string | null;
  excludeCityId?: string | null;
  /** Публичная выборка: вместе с providerId отдаёт только PUBLISHED. */
  publishedOnly?: boolean;
  actorUserId?: string;
  canPublish?: boolean;
  canArchive?: boolean;
};

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
    if (
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff
    ) {
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

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
    private readonly s3: S3Service,
    private readonly plans: PlanService = new PlanService(prisma),
  ) {}

  private async resolveScopedServiceId(id: string, providerId?: string | null) {
    if (!providerId) {
      return id;
    }

    const row = await this.prisma.service.findFirst({
      where: {
        id,
        providerId,
      },
      select: { id: true },
    });

    if (!row) {
      throw new NotFoundException('Service not found');
    }

    return row.id;
  }

  async getServices(
    scope?: Pick<
      ServiceScope,
      'providerId' | 'cityId' | 'excludeCityId' | 'publishedOnly'
    >,
  ): Promise<ServiceDto[]> {
    // Кабинет провайдера видит все статусы. Публичная витрина — только PUBLISHED.
    const where: Prisma.ServiceWhereInput = scope?.providerId
      ? {
          providerId: scope.providerId,
          ...(scope.publishedOnly ? { status: 'PUBLISHED' as const } : {}),
        }
      : { status: 'PUBLISHED' };

    const catalogOrder = [
      {
        ratingSortScore: {
          sort: 'desc' as const,
          nulls: 'last' as const,
        },
      },
      { publishedAt: 'desc' as const },
      { id: 'asc' as const },
    ];
    const orderBy =
      scope?.providerId && !scope.publishedOnly
        ? [{ category: { slug: 'asc' as const } }, { title: 'asc' as const }]
        : catalogOrder;

    const city = scope?.cityId
      ? await this.prisma.city.findUnique({
          where: { id: scope.cityId },
          select: { id: true, regionCode: true },
        })
      : null;
    const excludedCity = scope?.excludeCityId
      ? await this.prisma.city.findUnique({
          where: { id: scope.excludeCityId },
          select: { id: true, regionCode: true },
        })
      : null;
    if (scope?.cityId && !city) return [];
    const rankCityId = city?.id ?? null;
    const rows = await this.prisma.service.findMany({
      where,
      select: serviceSelect,
      orderBy,
    });

    const isPublic = !scope?.providerId || scope.publishedOnly;
    const visible = isPublic
      ? rows.flatMap((row) => {
          const effective = publicServiceForPlan(
            row,
            row.provider.billingTestAccount,
          );
          if (!effective) return [];
          const matches = (place: { id: string; regionCode: string }) =>
            effective.allRussia ||
            effective.cities.some((c) => c.city.id === place.id) ||
            effective.regions.some((r) => r.regionCode === place.regionCode);
          return (!city || matches(city)) &&
            (!excludedCity || !matches(excludedCity))
            ? [effective]
            : [];
        })
      : rows;
    const ordered = rankCityId
      ? orderByExplicitCity(
          visible.map((row) => ({
            row,
            cityIds: row.cities.map((link) => link.city.id),
          })),
          rankCityId,
        ).map((item) => item.row)
      : visible;

    return ordered.map((row) => serviceDbRowToDtoPlain(row));
  }

  async getServiceById(
    id: string,
    scope?: Pick<ServiceScope, 'providerId'>,
  ): Promise<ServiceDto | null> {
    const row = scope?.providerId
      ? await this.prisma.service.findFirst({
          where: { id, providerId: scope.providerId },
          select: serviceSelect,
        })
      : await this.prisma.service.findFirst({
          where: { id, status: 'PUBLISHED' },
          select: serviceSelect,
        });

    if (!row) return null;
    const effective = scope?.providerId
      ? row
      : publicServiceForPlan(row, row.provider.billingTestAccount);
    return effective ? serviceDbRowToDtoPlain(effective as ServiceDbRow) : null;
  }

  async createService(
    service: ServiceCreateDto,
    scope: { providerId: string; actorUserId?: string },
  ): Promise<ServiceDto> {
    const nextStatus: ServiceStatus = service.status ?? 'DRAFT';
    const resolvedCategoryId = service.categoryId ?? null;
    if (!resolvedCategoryId)
      throw new BadRequestException('categoryId is required');

    const resolvedTitle = service.title ?? null;
    if (!resolvedTitle) throw new BadRequestException('title is required');

    const resolvedPrice = service.price ?? null;
    if (!resolvedPrice) throw new BadRequestException('price is required');

    const normalized = service.allRussia
      ? { places: [] as NormalizedServicePlace[] }
      : normalizeServicePlaces(service.places);
    if ('error' in normalized) throw new BadRequestException(normalized.error);
    const storedPlaces = await this.resolveStoredPlaces(normalized.places);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.plans.validateService(
        scope.providerId,
        { ...service, regionCodes: storedPlaces.regionCodes },
        tx,
      );
      const created = await tx.service.create({
        data: {
          allRussia: service.allRussia ?? false,
          regionOrder: storedPlaces.regionCodes,
          categoryId: resolvedCategoryId,
          title: resolvedTitle,
          price: resolvedPrice,
          image: service.image,
          images: service.image ? [service.image] : [],
          stockBadge: service.stockBadge,
          description: service.description ?? null,
          paletteColor: service.paletteColor,
          status: nextStatus,
          publishedAt: nextStatus === 'PUBLISHED' ? new Date() : null,
          providerId: scope.providerId,
          createdByUserId: scope.actorUserId,
          updatedByUserId: scope.actorUserId,
        },
        select: { id: true },
      });
      await this.replaceServicePlaces(tx, created.id, storedPlaces);
      return tx.service.findUniqueOrThrow({
        where: { id: created.id },
        select: serviceSelect,
      });
    });

    return serviceDbRowToDtoPlain(row as ServiceDbRow);
  }

  async updateService(
    id: string,
    service: ServicePatchDto,
    scope?: ServiceScope,
  ): Promise<ServiceDto> {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);
    const nextStatus = service.status;

    if (
      (nextStatus === 'PUBLISHED' || nextStatus === 'DRAFT') &&
      scope?.canPublish === false
    ) {
      throw new ForbiddenException('Publishing services is not allowed');
    }

    if (nextStatus === 'ARCHIVED' && scope?.canArchive === false) {
      throw new ForbiddenException('Archiving services is not allowed');
    }

    const normalizedPlaces =
      service.places === undefined
        ? null
        : service.allRussia
          ? { places: [] as NormalizedServicePlace[] }
          : normalizeServicePlaces(service.places);
    if (normalizedPlaces && 'error' in normalizedPlaces) {
      throw new BadRequestException(normalizedPlaces.error);
    }
    const storedPlaces = normalizedPlaces
      ? await this.resolveStoredPlaces(normalizedPlaces.places)
      : null;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${serviceId}::uuid FOR UPDATE`;
      const before = await tx.service.findUniqueOrThrow({
        where: { id: serviceId },
        include: { cities: true, regions: true },
      });
      const placesChanged =
        storedPlaces &&
        (JSON.stringify([...storedPlaces.cityIds].sort()) !==
          JSON.stringify(before.cities.map((c) => c.cityId).sort()) ||
          JSON.stringify(
            storedPlaces.regions.map((r) => r.regionCode).sort(),
          ) !== JSON.stringify(before.regions.map((r) => r.regionCode).sort()));
      await this.plans.validateService(
        before.providerId,
        {
          stockBadge:
            service.stockBadge !== before.stockBadge
              ? service.stockBadge
              : undefined,
          paletteColor:
            service.paletteColor !== before.paletteColor
              ? service.paletteColor
              : undefined,
          allRussia:
            service.allRussia !== before.allRussia
              ? service.allRussia
              : undefined,
          regionCodes: placesChanged ? storedPlaces.regionCodes : undefined,
        },
        tx,
      );
      let images: string[] | undefined;
      if (service.images) {
        const old = before.images.length
          ? before.images
          : before.image
            ? [before.image]
            : [];
        if (
          service.images.length !== old.length ||
          new Set(service.images).size !== old.length ||
          service.images.some((url) => !old.includes(url))
        )
          throw new BadRequestException(
            'Можно только менять порядок существующих фотографий',
          );
        images = service.images;
      }
      if (service.image !== undefined && service.images === undefined) {
        await tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${serviceId}::uuid FOR UPDATE`;
        const current = await tx.service.findUniqueOrThrow({
          where: { id: serviceId },
          select: { image: true, images: true },
        });
        const gallery = current.images.length
          ? current.images
          : current.image
            ? [current.image]
            : [];
        images = service.image
          ? [
              service.image,
              ...gallery.filter(
                (url) => url !== current.image && url !== service.image,
              ),
            ]
          : gallery.filter((url) => url !== current.image);
      }
      if (images && images.length > before.images.length) {
        const { limits } = await this.plans.access(before.providerId, tx);
        if (images.length > limits.photos)
          throw new ForbiddenException(`Тариф позволяет ${limits.photos} фото`);
      }
      await tx.service.update({
        where: { id: serviceId },
        data: {
          allRussia: service.allRussia,
          regionOrder: storedPlaces?.regionCodes,
          categoryId: service.categoryId,
          status: service.status,
          title: service.title,
          price: service.price,
          image: images ? (images[0] ?? null) : undefined,
          images,
          stockBadge: service.stockBadge,
          description: service.description,
          paletteColor: service.paletteColor,
          publishedAt:
            nextStatus === 'PUBLISHED'
              ? new Date()
              : nextStatus === 'DRAFT' || nextStatus === 'ARCHIVED'
                ? null
                : undefined,
          updatedByUserId: scope?.actorUserId,
        },
      });
      if (storedPlaces) {
        await this.replaceServicePlaces(tx, serviceId, storedPlaces);
      }
      return tx.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: serviceSelect,
      });
    });

    return serviceDbRowToDtoPlain(row as ServiceDbRow);
  }

  private async resolveStoredPlaces(places: readonly NormalizedServicePlace[]) {
    const cityIds = places.flatMap((place) =>
      place.kind === 'city' ? [place.cityId] : [],
    );
    for (const cityId of cityIds) {
      await assertActiveSelectableCity(this.prisma, cityId);
    }

    const regions: Array<{ regionCode: string; regionName: string }> = [];
    for (const place of places) {
      if (place.kind !== 'region') continue;
      const city = await this.prisma.city.findFirst({
        where: { regionCode: place.regionCode, status: 'ACTIVE' },
        select: { regionName: true },
      });
      if (!city) throw new BadRequestException('Region is not available');
      regions.push({
        regionCode: place.regionCode,
        regionName: city.regionName,
      });
    }

    const cityRows = cityIds.length
      ? await this.prisma.city.findMany({
          where: { id: { in: cityIds } },
          select: { id: true, regionCode: true },
        })
      : [];
    const regionCodes = [
      ...new Set(
        places.map((place) =>
          place.kind === 'region'
            ? place.regionCode
            : cityRows.find((c) => c.id === place.cityId)!.regionCode,
        ),
      ),
    ];
    return { cityIds, regions, regionCodes };
  }

  private async replaceServicePlaces(
    tx: Prisma.TransactionClient,
    serviceId: string,
    stored: {
      cityIds: readonly string[];
      regions: readonly { regionCode: string; regionName: string }[];
    },
  ) {
    await tx.serviceCity.deleteMany({ where: { serviceId } });
    await tx.serviceRegion.deleteMany({ where: { serviceId } });
    if (stored.cityIds.length) {
      await tx.serviceCity.createMany({
        data: stored.cityIds.map((cityId) => ({ serviceId, cityId })),
      });
    }
    if (stored.regions.length) {
      await tx.serviceRegion.createMany({
        data: stored.regions.map((region) => ({
          serviceId,
          regionCode: region.regionCode,
          regionName: region.regionName,
        })),
      });
    }
  }

  async uploadServiceImage(input: {
    actorUserId: string;
    providerId: string;
    serviceId: string;
    file: Express.Multer.File;
  }) {
    const serviceId = await this.resolveScopedServiceId(
      input.serviceId,
      input.providerId,
    );
    const bucket = this.s3.requirePublicBucket();
    const cdnBase = this.s3.requirePublicCdnBaseUrl();
    const buf = input.file.buffer;
    if (!buf?.length || buf.length > 10 * 1024 * 1024)
      throw new BadRequestException(
        'Изображение должно быть размером до 10 МБ',
      );
    const ext = sniffImageExt(buf, input.file.mimetype);
    if (!ext) throw new BadRequestException('Unsupported image type');
    const hash = sha256Buffer(buf);
    const row = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${serviceId}::uuid FOR UPDATE`;
        const current = await tx.service.findUniqueOrThrow({
          where: { id: serviceId },
          select: serviceSelect,
        });
        const images = current.images.length
          ? current.images
          : current.image
            ? [current.image]
            : [];
        // Retrying the same file does not consume another gallery slot.
        const prefix = `${cdnBase.replace(/\/+$/, '')}/${this.s3.publicPrefix}services/${serviceId}/`;
        if (
          images.some(
            (url) =>
              url.startsWith(prefix) &&
              (url.endsWith(`/${hash}${ext}`) ||
                url === `${prefix}${hash}${ext}`),
          )
        )
          return current;
        const { limits } = await this.plans.access(input.providerId, tx);
        if (images.length >= limits.photos)
          throw new BadRequestException(
            `Тариф позволяет загрузить не более ${limits.photos} фотографий`,
          );
        // Unique paths prevent a delayed delete from removing a later re-upload.
        const key = `${this.s3.publicPrefix}services/${serviceId}/${randomUUID()}/${hash}${ext}`;
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
        try {
          return await tx.service.update({
            where: { id: serviceId },
            data: {
              image: images[0] ?? url,
              images: [...images, url],
              updatedByUserId: input.actorUserId,
            },
            select: serviceSelect,
          });
        } catch (error) {
          await this.s3.client
            .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
            .catch(() => null);
          throw error;
        }
      },
      { timeout: 90_000, maxWait: 90_000 },
    );
    return serviceDbRowToDtoPlain(row as ServiceDbRow);
  }

  async deleteServiceImage(input: {
    actorUserId: string;
    providerId: string;
    serviceId: string;
    imageUrl?: string;
  }) {
    const serviceId = await this.resolveScopedServiceId(
      input.serviceId,
      input.providerId,
    );
    const bucket = this.s3.requirePublicBucket();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${serviceId}::uuid FOR UPDATE`;
      const current = await tx.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: { image: true, images: true },
      });
      const images = current.images.length
        ? current.images
        : current.image
          ? [current.image]
          : [];
      const target = input.imageUrl ?? current.image;
      const removed = target && images.includes(target) ? target : null;
      const remaining = images.filter((url) => url !== target);
      const row = await tx.service.update({
        where: { id: serviceId },
        data: {
          image: remaining[0] ?? null,
          images: remaining,
          updatedByUserId: input.actorUserId,
        },
        select: serviceSelect,
      });
      return { row, removed };
    });
    const key =
      result.removed && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({
            url: result.removed,
            baseUrl: this.s3.publicCdnBaseUrl,
          })
        : null;
    if (key?.startsWith(`${this.s3.publicPrefix}services/${serviceId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => null);
    }
    return serviceDbRowToDtoPlain(result.row as ServiceDbRow);
  }

  async deleteService(id: string, scope?: Pick<ServiceScope, 'providerId'>) {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);

    await this.prisma.service.delete({
      where: { id: serviceId },
    });
  }

  async getManagementContext(
    request: Request,
    action: ServiceManagementAction,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    try {
      return await this.authService.getServiceManagementContext(userId, action);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw error;
    }
  }
}
