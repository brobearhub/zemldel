import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type LandListing,
  type LandListingRevision,
} from '@prisma/client';
import { isUUID } from 'class-validator';
import { CADASTRAL_NUMBER } from '../common/cadastral-number';
import { assertActiveSelectableCity } from '../cities/city-validation';
import { citySuggestSelect, toSuggestItem } from '../cities/city-suggest-item';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import { PlanService } from '../billing/plan.service';
import { normalizeServicePlaces } from '../services/service-places';
import {
  LAND_CATEGORIES,
  LAND_PURPOSES,
  DEAL_TYPES,
  object,
  publicationErrors,
  readLandDraft,
  requireVersion,
  servicePrice,
  type LandDraft,
} from './land-input';
import { applyRevisionMedia } from './land-revision-media';

const include = {
  revision: true,
  parcel: true,
  city: { select: citySuggestSelect },
  provider: { select: { id: true, name: true, slug: true, image: true } },
  author: { select: { id: true, name: true, firstName: true } },
  media: {
    orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  service: {
    select: {
      cities: {
        include: {
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
      regions: true,
    },
  },
} satisfies Prisma.LandListingInclude;
type Row = Prisma.LandListingGetPayload<{ include: typeof include }>;
const publicInclude = {
  ...include,
  revision: { select: { publishedVersion: true, publishedUpdatedAt: true } },
  media: { ...include.media, where: { revisionOnly: false } },
} satisfies Prisma.LandListingInclude;
type PublicRow = Prisma.LandListingGetPayload<{
  include: typeof publicInclude;
}>;

function servicePlaces(
  service: {
    cities: Array<Pick<NonNullable<Row['service']>['cities'][number], 'city'>>;
    regions: { regionCode: string; regionName: string }[];
  } | null,
) {
  if (!service) return [];
  return [
    ...service.cities.map(({ city }) => ({
      kind: 'city' as const,
      cityId: city.id,
      ...city,
    })),
    ...service.regions.map(({ regionCode, regionName }) => ({
      kind: 'region' as const,
      regionCode,
      regionName,
      name: regionName,
    })),
  ];
}

type RevisionContent = LandDraft & {
  city: ReturnType<typeof toSuggestItem> | null;
  places: ReturnType<typeof servicePlaces>;
};

function revisionMedia(row: Pick<Row, 'media'>, revision: LandListingRevision) {
  const byId = new Map(row.media.map((file) => [file.id, file]));
  return revision.mediaIds.flatMap((id) => byId.get(id) ?? []);
}

const resetDocumentReview = {
  documentStatus: 'NOT_REQUESTED',
  documentReviewedAt: null,
  documentReviewScope: null,
} as const;
export type LandActor = {
  id: string;
  admin: boolean;
  providerIds: string[];
  activeProviderId: string | null;
};

@Injectable()
export class LandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
    private readonly plans: PlanService,
  ) {}

  async actor(userId: string): Promise<LandActor> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        systemRole: true,
        activeProviderId: true,
        providerMemberships: {
          where: { status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } },
          select: { providerId: true },
        },
      },
    });
    if (!user) throw new ForbiddenException('Пользователь недоступен');
    return {
      id: user.id,
      admin: user.systemRole === 'PLATFORM_ADMIN',
      providerIds: user.providerMemberships.map((m) => m.providerId),
      activeProviderId: user.activeProviderId,
    };
  }
  canManage(
    actor: LandActor,
    row: Pick<LandListing, 'providerId' | 'authorUserId'>,
  ) {
    // A former team member cannot retain access merely by being the original author.
    return (
      !actor.admin &&
      (row.providerId
        ? actor.providerIds.includes(row.providerId)
        : row.authorUserId === actor.id)
    );
  }
  assertManage(
    actor: LandActor,
    row: Pick<LandListing, 'providerId' | 'authorUserId'>,
  ) {
    if (!this.canManage(actor, row))
      throw new ForbiddenException('Нет доступа к объявлению');
  }
  assertAdmin(actor: LandActor) {
    if (!actor.admin)
      throw new ForbiddenException('Требуются права администратора');
  }
  async locked(tx: Prisma.TransactionClient, id: string, version?: number) {
    await tx.$queryRaw`SELECT id FROM "LandListing" WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.landListing.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Объявление не найдено');
    if (version != null && row.version !== version)
      throw new ConflictException(
        'Объявление изменилось. Обновите страницу, чтобы не потерять изменения.',
      );
    return row;
  }
  toDraft(row: PublicRow): LandDraft {
    return readLandDraft(
      {
        ...row,
        cadastralNumber: row.parcel?.cadastralNumber ?? '',
        areaM2: row.areaM2 == null ? null : Number(row.areaM2),
        priceRubles: row.priceRubles == null ? null : Number(row.priceRubles),
      },
      row.kind,
      'stored',
    );
  }
  dto(row: PublicRow, managed = false, revision?: LandListingRevision | null) {
    const content = revision?.draft as RevisionContent | undefined;
    const draft = content
      ? readLandDraft(content, row.kind, 'stored')
      : this.toDraft(row);
    if (!managed) delete draft.details.requestDocumentReview;
    const files = revision
      ? revisionMedia(row, revision)
      : row.media.filter((m) => !m.revisionOnly);
    const photos = files
      .filter((m) => m.kind === 'PHOTO')
      .map((m) => ({
        id: m.id,
        url: `/api/lands/media/${m.id}`,
        filename: m.filename,
      }));
    return {
      id: row.id,
      kind: row.kind,
      status:
        row.status === 'WITHDRAWN' && revision?.status === 'DRAFT'
          ? 'WITHDRAWN'
          : (revision?.status ?? row.status),
      version: managed
        ? row.version
        : (row.revision?.publishedVersion ?? row.version),
      ...draft,
      city: content ? content.city : row.city && toSuggestItem(row.city),
      phone: draft.showPhone || managed ? draft.phone : '',
      provider: row.provider,
      authorName:
        row.provider?.name ||
        row.author.firstName ||
        row.author.name?.split(' ')[0] ||
        'Продавец',
      providerId: row.providerId,
      serviceId: row.serviceId,
      photos,
      places: content ? content.places : servicePlaces(row.service),
      documentCount: files.filter((m) => m.kind === 'DOCUMENT').length,
      documentStatus: (revision ?? row).documentStatus,
      documentReviewScope: (revision ?? row).documentReviewScope,
      documentReviewedAt: (revision ?? row).documentReviewedAt,
      publishedAt: row.publishedAt,
      updatedAt: managed
        ? row.updatedAt
        : (row.revision?.publishedUpdatedAt ?? row.updatedAt),
      ...(managed
        ? {
            authorUserId: row.authorUserId,
            hasPublishedVersion: row.status === 'PUBLISHED',
            moderationReason: (revision ?? row).moderationReason,
            withdrawalReason: row.withdrawalReason,
            documents: files
              .filter((m) => m.kind === 'DOCUMENT')
              .map((m) => ({
                id: m.id,
                filename: m.filename,
                size: m.size,
                url: `/api/lands/media/${m.id}`,
              })),
          }
        : {}),
    };
  }
  async detail(id: string, actor?: LandActor, published = false) {
    // Prisma may load relations separately. A reader must see one commit for both content and media.
    const [row] = await this.prisma.$transaction(
      [
        this.prisma.landListing.findUnique({
          where: { id },
          include,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    if (!row) throw new NotFoundException('Объявление не найдено');
    const canManage = actor ? this.canManage(actor, row) : false;
    const favorite = actor
      ? Boolean(
          await this.prisma.landFavorite.findUnique({
            where: { userId_listingId: { userId: actor.id, listingId: id } },
            select: { listingId: true },
          }),
        )
      : false;
    if (
      (canManage || actor?.admin) &&
      (!published || row.status === 'PUBLISHED')
    )
      return {
        ...this.dto(row, true, published ? null : row.revision),
        canManage,
        favorite,
      };
    if (row.status !== 'PUBLISHED') {
      // Reveal no draft content, phone, coordinates or document metadata.
      if (row.publishedAt)
        return {
          id,
          status: 'UNAVAILABLE',
          title: 'Предложение больше не доступно',
        };
      throw new NotFoundException('Объявление не найдено');
    }
    return { ...this.dto(row), canManage: false, favorite };
  }
  private scope(actor: LandActor): Prisma.LandListingWhereInput {
    return {
      OR: [
        { authorUserId: actor.id, providerId: null },
        { providerId: { in: actor.providerIds } },
      ],
    };
  }
  async sitemap() {
    const rows = await this.prisma.landListing.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        updatedAt: true,
        revision: { select: { publishedUpdatedAt: true } },
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      updatedAt: row.revision?.publishedUpdatedAt ?? row.updatedAt,
    }));
  }
  async mine(actor: LandActor) {
    if (actor.admin)
      throw new ForbiddenException('Используйте очередь модерации');
    const rows = await this.prisma.landListing.findMany({
      where: this.scope(actor),
      include,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.dto(r, true, r.revision));
  }
  async moderation(actor: LandActor) {
    this.assertAdmin(actor);
    const awaitingReview = {
      OR: [
        { status: 'PENDING' as const },
        { documentStatus: 'REQUESTED' as const },
      ],
    };
    const limit = 200;
    const [originals, changes] = await this.prisma.$transaction(
      [
        this.prisma.landListing.findMany({
          where: awaitingReview,
          include,
          orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
          take: limit,
        }),
        this.prisma.landListing.findMany({
          where: { revision: awaitingReview },
          include,
          orderBy: [{ revision: { submittedAt: 'asc' } }, { id: 'asc' }],
          take: limit,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const queue = [
      ...originals.map((row) => ({
        submittedAt: row.submittedAt,
        item: {
          ...this.dto(row, true),
          ...(row.revision && { reviewPublishedDocuments: true }),
        },
      })),
      ...changes.map((row) => ({
        submittedAt: row.revision!.submittedAt,
        item: this.dto(row, true, row.revision),
      })),
    ];
    return queue
      .sort(
        (a, b) =>
          (a.submittedAt?.getTime() ?? Infinity) -
            (b.submittedAt?.getTime() ?? Infinity) ||
          a.item.id.localeCompare(b.item.id),
      )
      .slice(0, limit)
      .map((entry) => entry.item);
  }
  async catalog(query: Record<string, string>, actor?: LandActor) {
    const number = (key: string, min = 0, max = 1e12) => {
      if (!query[key]) return undefined;
      const n = Number(query[key]);
      if (!Number.isFinite(n) || n < min || n > max)
        throw new BadRequestException(`Некорректный фильтр ${key}`);
      return n;
    };
    const enumValue = (key: string, values: readonly string[]) => {
      const v = query[key];
      if (v && !values.includes(v))
        throw new BadRequestException(`Некорректный фильтр ${key}`);
      return v || undefined;
    };
    const purposes = query.purpose ? query.purpose.split(',') : [];
    const allowedPurposes: readonly string[] = LAND_PURPOSES;
    if (purposes.some((purpose) => !allowedPurposes.includes(purpose)))
      throw new BadRequestException('Некорректный фильтр purpose');
    const kind = enumValue('kind', ['SALE', 'SELECTION']) as
      | 'SALE'
      | 'SELECTION'
      | undefined;
    const dealType = enumValue('dealType', DEAL_TYPES) as
      | LandDraft['dealType']
      | undefined;
    const minPrice = number('minPrice'),
      maxPrice = number('maxPrice'),
      minArea = number('minArea'),
      maxArea = number('maxArea');
    if (
      (minPrice != null && maxPrice != null && minPrice > maxPrice) ||
      (minArea != null && maxArea != null && minArea > maxArea)
    )
      throw new BadRequestException('Нижняя граница диапазона больше верхней');
    const AND: Prisma.LandListingWhereInput[] = [];
    if (query.cityId && !isUUID(query.cityId))
      throw new BadRequestException('Некорректный город');
    const city = query.cityId
      ? await this.prisma.city.findUnique({
          where: { id: query.cityId },
          select: citySuggestSelect,
        })
      : null;
    if (query.cityId && !city) throw new BadRequestException('Город не найден');
    if (city) {
      AND.push(
        kind === 'SELECTION'
          ? {
              service: {
                OR: [
                  { allRussia: true },
                  { cities: { some: { cityId: city.id } } },
                  { regions: { some: { regionCode: city.regionCode } } },
                ],
              },
            }
          : { cityId: city.id },
      );
    }
    if (query.cadastralNumbers) {
      const numbers = [...new Set(query.cadastralNumbers.split(','))];
      if (numbers.some((value) => !CADASTRAL_NUMBER.test(value)))
        throw new BadRequestException('Укажите полный кадастровый номер');
      AND.push({ parcel: { cadastralNumber: { in: numbers } } });
    }
    if (query.q?.trim()) {
      const q = query.q.trim().slice(0, 200);
      AND.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { parcel: { cadastralNumber: { startsWith: q } } },
          {
            service: {
              regions: {
                some: { regionName: { contains: q, mode: 'insensitive' } },
              },
            },
          },
          {
            service: {
              cities: {
                some: { city: { name: { contains: q, mode: 'insensitive' } } },
              },
            },
          },
          { kind: 'SELECTION', details: { path: ['allRussia'], equals: true } },
        ],
      });
    }
    if (query.bbox) {
      const bbox = query.bbox.split(',').map(Number);
      if (
        bbox.length !== 4 ||
        bbox.some((v) => !Number.isFinite(v)) ||
        Math.abs(bbox[0]) > 180 ||
        Math.abs(bbox[2]) > 180 ||
        Math.abs(bbox[1]) > 85 ||
        Math.abs(bbox[3]) > 85 ||
        bbox[0] > bbox[2] ||
        bbox[1] > bbox[3]
      )
        throw new BadRequestException('Некорректная область карты');
      AND.push({
        latitude: { gte: bbox[1], lte: bbox[3] },
        longitude: { gte: bbox[0], lte: bbox[2] },
      });
    }
    for (const key of ['boundaries', 'buildings', 'restrictions']) {
      const value = enumValue(key, ['UNKNOWN', 'YES', 'NO']);
      if (value) AND.push({ details: { path: [key], equals: value } });
    }
    for (const key of ['electricity', 'gas', 'water', 'sewerage']) {
      const value = enumValue(key, ['UNKNOWN', 'CONNECTED', 'NEARBY', 'NONE']);
      if (value) AND.push({ details: { path: [key], equals: value } });
    }
    if (query.vri)
      AND.push({ permittedUses: { has: query.vri.slice(0, 300) } });
    const rentMax = number('rentMax');
    const period = enumValue('rentPeriod', ['MONTH', 'QUARTER', 'YEAR']);
    if (rentMax != null) {
      AND.push({
        dealType: 'LEASE_ASSIGNMENT',
        details: { path: ['rentRubles'], lte: rentMax },
      });
      if (!period)
        throw new BadRequestException('Выберите период арендной платы');
    }
    if (period)
      AND.push({
        dealType: 'LEASE_ASSIGNMENT',
        details: { path: ['rentPeriod'], equals: period },
      });
    if (query.leaseAfter) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.leaseAfter))
        throw new BadRequestException('Некорректная дата');
      AND.push({
        dealType: 'LEASE_ASSIGNMENT',
        OR: [
          { details: { path: ['leaseUntil'], gte: query.leaseAfter } },
          { details: { path: ['leaseIndefinite'], equals: true } },
        ],
      });
    }
    if (query.favorites === '1') {
      if (!actor)
        throw new ForbiddenException('Войдите для просмотра избранного');
      AND.push({ favorites: { some: { userId: actor.id } } });
    }
    const author = enumValue('author', ['PERSONAL', 'PROVIDER']);
    const where: Prisma.LandListingWhereInput = {
      status: 'PUBLISHED',
      kind: kind ?? 'SALE',
      dealType,
      category: enumValue('category', LAND_CATEGORIES),
      sellerRelation: enumValue('sellerRelation', [
        'OWNER',
        'REPRESENTATIVE',
        'TENANT',
      ]),
      ...(purposes.length ? { purposes: { hasSome: purposes } } : {}),
      ...(author
        ? { providerId: author === 'PERSONAL' ? null : { not: null } }
        : {}),
      ...(minPrice != null || maxPrice != null
        ? { priceRubles: { gte: minPrice, lte: maxPrice } }
        : {}),
      ...(minArea != null || maxArea != null
        ? { areaM2: { gte: minArea, lte: maxArea } }
        : {}),
      AND,
    };
    const page = Math.floor(number('page', 1, 10000) ?? 1);
    const map = query.map === '1';
    const limit = map ? 500 : 24;
    const order = enumValue('sort', [
      'NEWEST',
      'PRICE_ASC',
      'PRICE_DESC',
      'AREA_ASC',
    ]);
    const orderBy: Prisma.LandListingOrderByWithRelationInput[] =
      order === 'PRICE_ASC'
        ? [{ priceRubles: { sort: 'asc', nulls: 'last' } }]
        : order === 'PRICE_DESC'
          ? [{ priceRubles: { sort: 'desc', nulls: 'last' } }]
          : order === 'AREA_ASC'
            ? [{ areaM2: 'asc' }]
            : [{ publishedAt: 'desc' }];
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.landListing.findMany({
          where,
          include: publicInclude,
          orderBy: [...orderBy, { id: 'asc' }],
          skip: map ? 0 : (page - 1) * limit,
          take: limit,
        }),
        this.prisma.landListing.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const items = rows.map((r) => this.dto(r));
    const groups = new Map<
      string,
      {
        cadastralNumber: string;
        latitude: number;
        longitude: number;
        listingIds: string[];
      }
    >();
    if (map)
      for (const r of rows) {
        if (
          !r.parcel ||
          r.latitude == null ||
          r.longitude == null ||
          r.kind !== 'SALE'
        )
          continue;
        const key = r.parcel.cadastralNumber;
        const group = groups.get(key) ?? {
          cadastralNumber: key,
          latitude: r.latitude,
          longitude: r.longitude,
          listingIds: [],
        };
        group.listingIds.push(r.id);
        groups.set(key, group);
      }
    const favorites = actor
      ? await this.prisma.landFavorite.findMany({
          where: { userId: actor.id, listingId: { in: rows.map((r) => r.id) } },
          select: { listingId: true },
        })
      : [];
    return {
      items,
      city: city && toSuggestItem(city),
      total,
      page,
      pages: Math.ceil(total / limit),
      truncated: map && total > limit,
      markers: [...groups.values()],
      favoriteIds: favorites.map((f) => f.listingId),
    };
  }
  async create(actor: LandActor, raw: unknown) {
    const b = object(raw);
    if (actor.admin)
      throw new ForbiddenException(
        'Администратор не публикует объявления от чужого имени',
      );
    const kind = b.kind ?? 'SALE';
    if (kind !== 'SALE' && kind !== 'SELECTION')
      throw new BadRequestException('Неизвестный тип предложения');
    const providerId = typeof b.providerId === 'string' ? b.providerId : null;
    if (providerId && !actor.providerIds.includes(providerId))
      throw new ForbiddenException('Нет доступа к профилю исполнителя');
    if (kind === 'SELECTION' && !providerId)
      throw new ForbiddenException('Подбор публикуется от профиля исполнителя');
    const draft = readLandDraft(b, kind);
    const row = await this.prisma.$transaction(async (tx) => {
      const data = await this.draftData(tx, draft);
      const created = await tx.landListing.create({
        data: { ...data, authorUserId: actor.id, providerId, kind },
        include,
      });
      await this.syncService(tx, created, draft, actor.id);
      return tx.landListing.findUniqueOrThrow({
        where: { id: created.id },
        include,
      });
    });
    return this.dto(row, true);
  }
  private async draftData(
    tx: Prisma.TransactionClient,
    d: LandDraft,
    previousCityId?: string | null,
  ) {
    const { cadastralNumber, details, ...rest } = d;
    if (d.cityId && d.cityId !== previousCityId)
      await assertActiveSelectableCity(tx, d.cityId);
    const parcel = cadastralNumber
      ? await tx.landParcel.upsert({
          where: { cadastralNumber },
          create: { cadastralNumber },
          update: {},
        })
      : null;
    return {
      ...rest,
      parcelId: parcel?.id ?? null,
      details: details as Prisma.InputJsonValue,
    };
  }
  async ensureRevision(tx: Prisma.TransactionClient, row: Row) {
    if (row.revision) return row.revision;
    if (row.status !== 'PUBLISHED')
      throw new ConflictException('Нет опубликованной версии');
    const content: RevisionContent = {
      ...this.toDraft(row),
      city: row.city && toSuggestItem(row.city),
      places: servicePlaces(row.service),
    };
    return tx.landListingRevision.create({
      data: {
        listingId: row.id,
        draft: content as Prisma.InputJsonObject,
        mediaIds: row.media.map((file) => file.id),
        publishedVersion: row.version,
        publishedUpdatedAt: row.updatedAt,
      },
    });
  }

  private async selectionPlaces(
    tx: Prisma.TransactionClient,
    providerId: string,
    draft: LandDraft,
  ) {
    const normalized =
      !draft.details.allRussia && draft.details.places?.length
        ? normalizeServicePlaces(draft.details.places)
        : { places: [] };
    if ('error' in normalized) throw new BadRequestException(normalized.error);
    const places = await this.services.resolveStoredPlaces(
      normalized.places,
      tx,
    );
    await this.plans.validateService(
      providerId,
      { allRussia: draft.details.allRussia, regionCodes: places.regionCodes },
      tx,
    );
    return places;
  }

  async syncService(
    tx: Prisma.TransactionClient,
    row: LandListing,
    draft: LandDraft,
    actorId: string,
  ) {
    if (row.kind !== 'SELECTION' || !row.providerId) return;
    const places = await this.selectionPlaces(tx, row.providerId, draft);
    const category = await tx.serviceCategory.upsert({
      where: { slug: 'land-selection' },
      create: {
        slug: 'land-selection',
        name: 'Подбор земельного участка',
        shortName: 'Подбор участка',
      },
      update: {},
    });
    const photos = await tx.landMedia.findMany({
      where: { listingId: row.id, kind: 'PHOTO', revisionOnly: false },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const images = photos.map((m) => `/api/lands/media/${m.id}`);
    const data = {
      categoryId: category.id,
      title: draft.title || 'Подбор участка',
      description: [
        draft.description,
        draft.details.scope && `Состав работы: ${draft.details.scope}`,
        draft.details.result && `Результат: ${draft.details.result}`,
        draft.details.timeline && `Срок: ${draft.details.timeline}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      price: servicePrice(draft),
      status:
        row.status === 'PUBLISHED'
          ? ('PUBLISHED' as const)
          : ('DRAFT' as const),
      publishedAt: row.publishedAt,
      allRussia: draft.details.allRussia ?? false,
      regionOrder: places.regionCodes,
      images,
      image: images[0] ?? null,
      updatedByUserId: actorId,
    };
    const service = row.serviceId
      ? await tx.service.update({ where: { id: row.serviceId }, data })
      : await tx.service.create({
          data: {
            ...data,
            providerId: row.providerId,
            createdByUserId: actorId,
          },
        });
    if (!row.serviceId)
      await tx.landListing.update({
        where: { id: row.id },
        data: { serviceId: service.id },
      });
    await this.services.replaceServicePlaces(tx, service.id, places);
  }
  private async assertChatSubject(
    tx: Prisma.TransactionClient,
    row: Row,
    draft: LandDraft,
  ) {
    if (
      (draft.cadastralNumber !== (row.parcel?.cadastralNumber ?? '') ||
        draft.dealType !== row.dealType) &&
      (await tx.conversation.count({ where: { landListingId: row.id } }))
    )
      throw new ConflictException(
        'По предложению уже есть переписка. Для другого участка или типа сделки создайте новое объявление.',
      );
  }

  private async managedDetail(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.landListing.findUniqueOrThrow({
      where: { id },
      include,
    });
    return this.dto(row, true, row.revision);
  }

  async update(actor: LandActor, id: string, raw: unknown) {
    const version = requireVersion(raw);
    return this.prisma.$transaction(async (tx) => {
      const before = await this.locked(tx, id, version);
      this.assertManage(actor, before);
      if ((before.revision ?? before).status === 'PENDING')
        throw new ConflictException('Сначала отзовите объявление с модерации');
      const d = readLandDraft(
        {
          cityId: before.revision
            ? (before.revision.draft as RevisionContent).cityId
            : before.cityId,
          ...object(raw),
        },
        before.kind,
      );
      await this.assertChatSubject(tx, before, d);
      if (before.status === 'PUBLISHED' || before.revision) {
        await this.ensureRevision(tx, before);
        if (d.cityId && d.cityId !== before.cityId)
          await assertActiveSelectableCity(tx, d.cityId);
        const city = d.cityId
          ? await tx.city.findUniqueOrThrow({
              where: { id: d.cityId },
              select: citySuggestSelect,
            })
          : null;
        const geography =
          before.kind === 'SELECTION' && before.providerId
            ? await this.selectionPlaces(tx, before.providerId, d)
            : null;
        const content: RevisionContent = {
          ...d,
          city: city && toSuggestItem(city),
          places: geography
            ? servicePlaces({
                cities: geography.cities
                  .filter((c) => geography.cityIds.includes(c.id))
                  .map((city) => ({ city })),
                regions: geography.regions,
              })
            : [],
        };
        await tx.landListingRevision.update({
          where: { listingId: id },
          data: {
            draft: content as Prisma.InputJsonObject,
            status: 'DRAFT',
            moderationReason: null,
            ...resetDocumentReview,
          },
        });
        await tx.landListing.update({
          where: { id },
          data: {
            version: { increment: 1 },
            ...(before.status === 'WITHDRAWN' && { status: 'DRAFT' }),
          },
        });
        return this.managedDetail(tx, id);
      }
      const row = await tx.landListing.update({
        where: { id },
        data: {
          ...(await this.draftData(tx, d, before.cityId)),
          status: 'DRAFT',
          version: { increment: 1 },
          ...resetDocumentReview,
        },
        include,
      });
      await this.syncService(tx, row, d, actor.id);
      return this.managedDetail(tx, id);
    });
  }
  async action(actor: LandActor, id: string, raw: unknown) {
    const b = object(raw);
    const version = requireVersion(raw);
    return this.prisma.$transaction(async (tx) => {
      const row = await this.locked(tx, id, version);
      this.assertManage(actor, row);
      const rev = row.revision;
      const working = rev ?? row;
      let data: Partial<
        Pick<
          LandListing,
          | 'status'
          | 'submittedAt'
          | 'moderationReason'
          | keyof typeof resetDocumentReview
        >
      >;
      if (b.action === 'submit') {
        if (
          !['DRAFT', 'CHANGES_REQUIRED', 'WITHDRAWN'].includes(working.status)
        )
          throw new ConflictException(
            'Этот статус нельзя отправить на модерацию',
          );
        const draft = rev
          ? readLandDraft(rev.draft, row.kind, 'stored')
          : this.toDraft(row);
        await this.assertChatSubject(tx, row, draft);
        const errors = publicationErrors(draft, row.kind);
        if (Object.keys(errors).length)
          throw new BadRequestException({
            message: 'Заполните обязательные поля',
            fields: errors,
          });
        const verifyDocuments =
          b.verifyDocuments === undefined
            ? draft.details.requestDocumentReview === true
            : b.verifyDocuments === true;
        const files = rev ? revisionMedia(row, rev) : row.media;
        if (verifyDocuments && !files.some((m) => m.kind === 'DOCUMENT'))
          throw new BadRequestException(
            'Сначала загрузите документы для проверки',
          );
        data = {
          status: 'PENDING',
          submittedAt: new Date(),
          moderationReason: null,
          ...resetDocumentReview,
          documentStatus: verifyDocuments ? 'REQUESTED' : 'NOT_REQUESTED',
        };
      } else if (b.action === 'recall' && working.status === 'PENDING')
        data = {
          status: 'DRAFT',
          ...(working.documentStatus === 'REQUESTED' && {
            documentStatus: 'NOT_REQUESTED',
          }),
        };
      else if (b.action === 'withdraw' && row.status === 'PUBLISHED') {
        if (
          typeof b.reason !== 'string' ||
          !b.reason.trim() ||
          b.reason.length > 500
        )
          throw new BadRequestException('Укажите причину снятия');
        if (rev)
          await tx.landListingRevision.update({
            where: { listingId: id },
            data: {
              status: 'DRAFT',
              submittedAt: null,
              moderationReason: null,
              ...resetDocumentReview,
            },
          });
        await tx.landListing.update({
          where: { id },
          data: {
            status: 'WITHDRAWN',
            withdrawalReason: b.reason.trim(),
            version: { increment: 1 },
            ...(row.documentStatus === 'REQUESTED' && {
              documentStatus: 'NOT_REQUESTED',
            }),
          },
        });
        if (row.serviceId)
          await tx.service.update({
            where: { id: row.serviceId },
            data: { status: 'DRAFT' },
          });
        return this.managedDetail(tx, id);
      } else
        throw new ConflictException('Действие недоступно в текущем статусе');
      if (rev) {
        await tx.landListingRevision.update({ where: { listingId: id }, data });
        await tx.landListing.update({
          where: { id },
          data: {
            version: { increment: 1 },
            withdrawalReason: null,
            ...(row.status === 'WITHDRAWN' && {
              status: 'DRAFT',
            }),
          },
        });
        return this.managedDetail(tx, id);
      }
      const next = await tx.landListing.update({
        where: { id },
        data: { ...data, withdrawalReason: null, version: { increment: 1 } },
        include,
      });
      await this.syncService(tx, next, this.toDraft(next), actor.id);
      return this.dto(next, true);
    });
  }
  async review(actor: LandActor, id: string, raw: unknown) {
    this.assertAdmin(actor);
    const b = object(raw);
    const version = requireVersion(raw);
    if (
      !['CONTENT', 'DOCUMENT'].includes(String(b.kind)) ||
      !['APPROVE', 'REJECT'].includes(String(b.decision))
    )
      throw new BadRequestException('Некорректное решение');
    const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
    if (
      reason.length > 3000 ||
      ((b.decision === 'REJECT' || b.kind === 'DOCUMENT') && reason.length < 5)
    )
      throw new BadRequestException(
        'Укажите причину или предмет и результат проверки (от 5 символов)',
      );
    return this.prisma.$transaction(async (tx) => {
      const row = await this.locked(tx, id, version);
      const publishedDocuments = b.reviewPublishedDocuments === true;
      if (
        publishedDocuments &&
        (b.kind !== 'DOCUMENT' || row.status !== 'PUBLISHED')
      )
        throw new ConflictException(
          'Проверка опубликованных документов недоступна',
        );
      const revision = publishedDocuments ? null : row.revision;
      const target = revision ?? row;
      if (
        (b.kind === 'CONTENT' && target.status !== 'PENDING') ||
        (b.kind === 'DOCUMENT' && target.documentStatus !== 'REQUESTED')
      )
        throw new ConflictException(
          'Заявка на проверку уже обработана или отозвана',
        );
      const publishing = b.kind === 'CONTENT' && b.decision === 'APPROVE';
      const draft = revision
        ? readLandDraft(revision.draft, row.kind, 'stored')
        : this.toDraft(row);
      if (publishing) {
        const errors = publicationErrors(draft, row.kind);
        if (Object.keys(errors).length)
          throw new BadRequestException({
            message: 'Объявление не готово к публикации',
            fields: errors,
          });
        await this.assertChatSubject(tx, row, draft);
      }
      await tx.landReview.create({
        data: {
          listingId: id,
          reviewerUserId: actor.id,
          kind: String(b.kind),
          decision: String(b.decision),
          reason,
          listingVersion:
            publishedDocuments && row.revision
              ? row.revision.publishedVersion
              : row.version,
        },
      });
      if (publishing) {
        const approved = revision && {
          ...(await this.draftData(tx, draft, row.cityId)),
          documentStatus: revision.documentStatus,
          documentReviewedAt: revision.documentReviewedAt,
          documentReviewScope: revision.documentReviewScope,
          submittedAt: revision.submittedAt,
        };
        if (revision) {
          await applyRevisionMedia(tx, id, revision.mediaIds);
          await tx.landListingRevision.delete({ where: { listingId: id } });
        }
        const next = await tx.landListing.update({
          where: { id },
          data: {
            ...approved,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            moderationReason: reason || null,
            withdrawalReason: null,
            version: { increment: 1 },
          },
        });
        await this.syncService(tx, next, draft, actor.id);
      } else {
        const decision =
          b.kind === 'CONTENT'
            ? { status: 'CHANGES_REQUIRED' as const, moderationReason: reason }
            : {
                documentStatus:
                  b.decision === 'APPROVE'
                    ? ('VERIFIED' as const)
                    : ('REJECTED' as const),
                documentReviewScope: reason,
                documentReviewedAt: new Date(),
              };
        if (revision)
          await tx.landListingRevision.update({
            where: { listingId: id },
            data: decision,
          });
        const next = await tx.landListing.update({
          where: { id },
          data: {
            ...(!revision && decision),
            version: { increment: 1 },
          },
        });
        if (publishedDocuments && row.revision) {
          await tx.landListingRevision.update({
            where: { listingId: id },
            data: {
              publishedVersion: next.version,
              publishedUpdatedAt: next.updatedAt,
            },
          });
          const published = await tx.landListing.findUniqueOrThrow({
            where: { id },
            include,
          });
          return this.dto(published, true);
        }
      }
      return this.managedDetail(tx, id);
    });
  }
  async favorite(actor: LandActor, id: string, enabled: boolean) {
    if (enabled) {
      // Serialize with draft deletion and publication changes.
      await this.prisma.$transaction(async (tx) => {
        const row = await this.locked(tx, id);
        if (row.status !== 'PUBLISHED')
          throw new NotFoundException('Предложение недоступно');
        await tx.landFavorite.upsert({
          where: { userId_listingId: { userId: actor.id, listingId: id } },
          create: { userId: actor.id, listingId: id },
          update: {},
        });
      });
    } else
      await this.prisma.landFavorite.deleteMany({
        where: { userId: actor.id, listingId: id },
      });
    return { ok: true };
  }
  async delete(actor: LandActor, id: string, version: number) {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.locked(tx, id, version);
      this.assertManage(actor, row);
      if (
        row.status !== 'DRAFT' ||
        row.publishedAt ||
        (await tx.conversation.count({ where: { landListingId: id } }))
      )
        throw new ConflictException(
          'Удалить можно только неопубликованный черновик без переписки',
        );
      if (
        row.serviceId &&
        (await tx.request.count({ where: { serviceId: row.serviceId } }))
      )
        throw new ConflictException(
          'У услуги уже есть заявки. Снимите объявление вместо удаления.',
        );
      for (const media of row.media)
        await tx.landObjectCleanup.create({
          data: { objectKey: media.storageKey, notBefore: new Date() },
        });
      await tx.landListing.delete({ where: { id } });
      if (row.serviceId)
        await tx.service.delete({ where: { id: row.serviceId } });
    });
    return { ok: true };
  }
}
