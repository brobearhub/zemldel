import 'reflect-metadata';
import {
  Expose,
  instanceToPlain,
  plainToInstance,
  Transform,
} from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  validateSync,
  type ValidationError,
} from 'class-validator';

export type ServiceRequestStatus =
  | 'NEW'
  | 'DISCUSSING'
  | 'TERMS_AGREED'
  | 'PROVIDER_SELECTED'
  | 'CONTRACT_ACCEPTED'
  | 'LOCKED'
  | 'ACCEPTANCE_PENDING'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'SERVICE_RENDERED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export const ORDER_PHASE_STATUSES = [
  'PROVIDER_SELECTED',
  'CONTRACT_ACCEPTED',
  'PAYMENT_PENDING',
  'PAYMENT_PROCESSING',
  'ACTIVE',
  'SERVICE_RENDERED',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'PAID',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly ServiceRequestStatus[];

export function isOrderPhaseStatus(
  value: ServiceRequestStatus | string,
): value is (typeof ORDER_PHASE_STATUSES)[number] {
  return (ORDER_PHASE_STATUSES as readonly string[]).includes(value);
}

export type ServiceRequestSubjectType = 'FREEFORM' | 'CATEGORY' | 'SERVICE';

export type ServiceRequestProviderOfferStatus = 'SELECTED' | 'DECLINED';

export class ServiceRequestCustomerOfferDto {
  @Expose()
  @IsUUID()
  providerId!: string;

  @Expose()
  @IsEnum(['SELECTED', 'DECLINED'])
  status!: ServiceRequestProviderOfferStatus;
}

function normalizeStatus(value: unknown): ServiceRequestStatus {
  if (value === 'DISCUSSING') return 'DISCUSSING';
  if (value === 'TERMS_AGREED') return 'TERMS_AGREED';
  if (value === 'PROVIDER_SELECTED') return 'PROVIDER_SELECTED';
  if (value === 'CONTRACT_ACCEPTED') return 'CONTRACT_ACCEPTED';
  if (value === 'LOCKED') return 'LOCKED';
  if (value === 'ACCEPTANCE_PENDING') return 'ACCEPTANCE_PENDING';
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'ACTIVE') return 'ACTIVE';
  if (value === 'SERVICE_RENDERED') return 'SERVICE_RENDERED';
  if (value === 'PAYMENT_PENDING') return 'PAYMENT_PENDING';
  if (value === 'PAYMENT_PROCESSING') return 'PAYMENT_PROCESSING';
  if (value === 'PAID') return 'PAID';
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  if (value === 'CLOSED') return 'CLOSED';
  return 'NEW';
}

function trimOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function trimOrUndefined(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toSubjectType(row: {
  serviceId: string | null;
  categoryId: string | null;
}): ServiceRequestSubjectType {
  if (row.serviceId) return 'SERVICE';
  if (row.categoryId) return 'CATEGORY';
  return 'FREEFORM';
}

export class ServiceRequestUnlinkedCreateDto {
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(10)
  message?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(2)
  location?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(7)
  customerPhone?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value), { toClassOnly: true })
  @IsUUID()
  requestCityId?: string;
}

export function parseServiceRequestUnlinkedCreateDto(body: unknown): {
  data?: ServiceRequestUnlinkedCreateDto;
  issues?: unknown;
} {
  const safeBody = body && typeof body === 'object' ? body : {};
  const inst = plainToInstance(ServiceRequestUnlinkedCreateDto, safeBody, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export class ServiceRequestCategoryCreateDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  message?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(7)
  customerPhone?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value), { toClassOnly: true })
  @IsUUID()
  requestCityId?: string;
}

export function parseServiceRequestCategoryCreateDto(body: unknown): {
  data?: ServiceRequestCategoryCreateDto;
  issues?: unknown;
} {
  const inst = plainToInstance(ServiceRequestCategoryCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export class ServiceRequestServiceCreateDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerName?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerEmail?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerPhone?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  message?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value), { toClassOnly: true })
  @IsUUID()
  requestCityId?: string;
}

export function parseServiceRequestServiceCreateDto(body: unknown): {
  data?: ServiceRequestServiceCreateDto;
  issues?: unknown;
} {
  const inst = plainToInstance(ServiceRequestServiceCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export class ServiceRequestCustomerDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: ServiceRequestSubjectType;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum([
    'NEW',
    'DISCUSSING',
    'TERMS_AGREED',
    'PROVIDER_SELECTED',
    'CONTRACT_ACCEPTED',
    'LOCKED',
    'ACTIVE',
    'SERVICE_RENDERED',
    'PAYMENT_PENDING',
    'PAYMENT_PROCESSING',
    'ACCEPTANCE_PENDING',
    'ACCEPTED',
    'PAID',
    'COMPLETED',
    'CANCELLED',
    'CLOSED',
  ])
  status!: ServiceRequestStatus;

  @Expose()
  @IsOptional()
  @IsUUID()
  serviceId!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  categoryId!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

  @Expose()
  selectedProviderIds!: string[];

  @Expose()
  declinedProviderIds!: string[];

  @Expose()
  @IsOptional()
  @IsString()
  lastSelectionAt!: string | null;

  @Expose()
  offers!: ServiceRequestCustomerOfferDto[];

  @Expose()
  @IsOptional()
  @IsUUID()
  requestCityId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  message!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  lockedAt!: string | null;

  @Expose()
  dealTerms!: unknown | null;

  @Expose()
  @IsOptional()
  @IsString()
  offerVersion!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  contractAcceptedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  acceptanceRequestedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  autoAcceptAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  acceptedAt!: string | null;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export class ServiceRequestProDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: ServiceRequestSubjectType;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum([
    'NEW',
    'DISCUSSING',
    'TERMS_AGREED',
    'PROVIDER_SELECTED',
    'CONTRACT_ACCEPTED',
    'LOCKED',
    'ACTIVE',
    'SERVICE_RENDERED',
    'PAYMENT_PENDING',
    'PAYMENT_PROCESSING',
    'ACCEPTANCE_PENDING',
    'ACCEPTED',
    'PAID',
    'COMPLETED',
    'CANCELLED',
    'CLOSED',
  ])
  status!: ServiceRequestStatus;

  @Expose()
  @IsOptional()
  @IsUUID()
  serviceId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  serviceTitle!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  categoryId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  categoryName!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

  @Expose()
  @IsOptional()
  @IsEnum(['SELECTED', 'DECLINED'])
  offerStatus!: ServiceRequestProviderOfferStatus | null;

  @Expose()
  @IsOptional()
  @IsString()
  offerSelectedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  offerDeclinedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  requestCityId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  message!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  lockedAt!: string | null;

  @Expose()
  dealTerms!: unknown | null;

  @Expose()
  @IsOptional()
  @IsString()
  offerVersion!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  contractAcceptedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  acceptanceRequestedAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  autoAcceptAt!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  acceptedAt!: string | null;

  @Expose()
  conversationsCount!: number;

  @Expose()
  isLocked!: boolean;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export type ServiceRequestDbRow = {
  id: string;
  status: ServiceRequestStatus;
  serviceId: string | null;
  categoryId: string | null;
  providerId: string | null;
  customerUserId: string | null;
  requestCityId: string | null;
  message: string | null;
  location: string | null;
  lockedAt: Date | null;
  dealTerms?: unknown | null;
  offerVersion?: string | null;
  contractAcceptedAt?: Date | null;
  acceptanceRequestedAt?: Date | null;
  autoAcceptAt?: Date | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  service?: { title: string } | null;
  category?: { name: string } | null;
  customerUser?: { customerCityId: string | null } | null;
  providerOffers?: Array<{
    providerId: string;
    status: ServiceRequestProviderOfferStatus;
    selectedAt: Date;
    declinedAt: Date | null;
  }>;
};

export function serviceRequestRowToCustomerDtoPlain(
  row: ServiceRequestDbRow,
): ServiceRequestCustomerDto {
  const offers = row.providerOffers ?? [];
  const selected = offers.filter((o) => o.status === 'SELECTED');
  const declined = offers.filter((o) => o.status === 'DECLINED');
  const lastSelectionAt =
    selected.length === 0
      ? null
      : selected
          .map((o) => o.selectedAt)
          .reduce((max, dt) => (dt.getTime() > max.getTime() ? dt : max))
          .toISOString();

  const inst = plainToInstance(
    ServiceRequestCustomerDto,
    {
      id: row.id,
      subjectType: toSubjectType(row),
      status: row.status,
      serviceId: row.serviceId,
      categoryId: row.categoryId,
      providerId: row.providerId,
      selectedProviderIds: selected.map((o) => o.providerId),
      declinedProviderIds: declined.map((o) => o.providerId),
      lastSelectionAt,
      offers: offers.map((offer) => ({
        providerId: offer.providerId,
        status: offer.status,
      })),
      requestCityId: row.requestCityId,
      message: row.message,
      location: row.location,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      dealTerms: row.dealTerms ?? null,
      offerVersion: row.offerVersion ?? null,
      contractAcceptedAt: row.contractAcceptedAt
        ? row.contractAcceptedAt.toISOString()
        : null,
      acceptanceRequestedAt: row.acceptanceRequestedAt
        ? row.acceptanceRequestedAt.toISOString()
        : null,
      autoAcceptAt: row.autoAcceptAt ? row.autoAcceptAt.toISOString() : null,
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as ServiceRequestCustomerDto;
}

export function serviceRequestRowToProDtoPlain(
  row: ServiceRequestDbRow,
  conversationsCount: number,
  actorProviderId: string,
): ServiceRequestProDto {
  const locked =
    isOrderPhaseStatus(row.status) &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId;

  const offers = row.providerOffers ?? [];
  const myOffer = offers.find((o) => o.providerId === actorProviderId) ?? null;

  const subjectType = locked
    ? row.categoryId
      ? ('CATEGORY' as const)
      : ('FREEFORM' as const)
    : toSubjectType(row);

  const inst = plainToInstance(
    ServiceRequestProDto,
    {
      id: row.id,
      subjectType,
      status: row.status,
      serviceId: locked ? null : row.serviceId,
      serviceTitle: locked ? null : row.service?.title ?? null,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      providerId: locked ? null : row.providerId,
      offerStatus: myOffer?.status ?? null,
      offerSelectedAt: myOffer?.selectedAt ? myOffer.selectedAt.toISOString() : null,
      offerDeclinedAt: myOffer?.declinedAt ? myOffer.declinedAt.toISOString() : null,
      requestCityId: row.requestCityId,
      message: locked ? null : row.message,
      location: locked ? null : row.location,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      dealTerms: locked ? null : (row.dealTerms ?? null),
      offerVersion: row.offerVersion ?? null,
      contractAcceptedAt: row.contractAcceptedAt
        ? row.contractAcceptedAt.toISOString()
        : null,
      acceptanceRequestedAt: row.acceptanceRequestedAt
        ? row.acceptanceRequestedAt.toISOString()
        : null,
      autoAcceptAt: row.autoAcceptAt ? row.autoAcceptAt.toISOString() : null,
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
      conversationsCount,
      isLocked: locked,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as ServiceRequestProDto;
}

function validationErrorsToIssues(errors: ValidationError[]) {
  const out: Array<{ path: string[]; message: string }> = [];

  function walk(err: ValidationError, prefix: string[] = []) {
    const path = [...prefix, err.property];
    if (err.constraints) {
      for (const msg of Object.values(err.constraints)) {
        out.push({ path, message: msg });
      }
    }
    if (err.children?.length) {
      for (const child of err.children) walk(child, path);
    }
  }

  for (const error of errors) walk(error);
  return out;
}
