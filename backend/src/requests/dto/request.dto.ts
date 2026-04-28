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

export type RequestStatus =
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

export const ORDER_EXECUTION_STATUSES = [
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
] as const satisfies readonly RequestStatus[];

export function isOrderExecutionStatus(
  value: RequestStatus | string,
): value is (typeof ORDER_EXECUTION_STATUSES)[number] {
  return (ORDER_EXECUTION_STATUSES as readonly string[]).includes(value);
}

export const EXCLUSIVE_PROVIDER_STATUSES = [
  'PROVIDER_SELECTED',
  ...ORDER_EXECUTION_STATUSES,
] as const satisfies readonly RequestStatus[];

export function isExclusiveProviderStatus(
  value: RequestStatus | string,
): value is (typeof EXCLUSIVE_PROVIDER_STATUSES)[number] {
  return (EXCLUSIVE_PROVIDER_STATUSES as readonly string[]).includes(value);
}

export const ORDER_STATUSES = [
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
] as const satisfies readonly RequestStatus[];

export type RequestSubjectType = 'FREEFORM' | 'CATEGORY' | 'SERVICE';

export type RequestProviderOfferStatus = 'SELECTED' | 'DECLINED';
export type RequestContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED';

export class RequestContractSummaryDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  title!: string;

  @Expose()
  @IsEnum(['DRAFT', 'SENT', 'SIGNED', 'CANCELLED'])
  status!: RequestContractStatus;

  @Expose()
  @IsOptional()
  @IsUUID()
  requestId!: string | null;

  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

  @Expose()
  openCommentsCount!: number;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export class RequestCustomerOfferDto {
  @Expose()
  @IsUUID()
  providerId!: string;

  @Expose()
  @IsEnum(['SELECTED', 'DECLINED'])
  status!: RequestProviderOfferStatus;
}

function normalizeStatus(value: unknown): RequestStatus {
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
}): RequestSubjectType {
  if (row.serviceId) return 'SERVICE';
  if (row.categoryId) return 'CATEGORY';
  return 'FREEFORM';
}

export class RequestUnlinkedCreateDto {
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

export function parseRequestUnlinkedCreateDto(body: unknown): {
  data?: RequestUnlinkedCreateDto;
  issues?: unknown;
} {
  const safeBody = body && typeof body === 'object' ? body : {};
  const inst = plainToInstance(RequestUnlinkedCreateDto, safeBody, {
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

export class RequestCategoryCreateDto {
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

export function parseRequestCategoryCreateDto(body: unknown): {
  data?: RequestCategoryCreateDto;
  issues?: unknown;
} {
  const inst = plainToInstance(RequestCategoryCreateDto, body, {
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

export class RequestServiceCreateDto {
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

export function parseRequestServiceCreateDto(body: unknown): {
  data?: RequestServiceCreateDto;
  issues?: unknown;
} {
  const inst = plainToInstance(RequestServiceCreateDto, body, {
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

export class RequestCustomerDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: RequestSubjectType;

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
  status!: RequestStatus;

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
  offers!: RequestCustomerOfferDto[];

  @Expose()
  contract!: RequestContractSummaryDto | null;

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
  @IsOptional()
  @IsString()
  serviceTitle!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  providerName!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  customerEmail!: string | null;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export class RequestProDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: RequestSubjectType;

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
  status!: RequestStatus;

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
  offerStatus!: RequestProviderOfferStatus | null;

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
  contract!: RequestContractSummaryDto | null;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export type RequestDbRow = {
  id: string;
  status: RequestStatus;
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
  customerUser?: {
    customerCityId: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  provider?: { name: string } | null;
  providerOffers?: Array<{
    providerId: string;
    status: RequestProviderOfferStatus;
    selectedAt: Date;
    declinedAt: Date | null;
  }>;
  contractInstances?: Array<{
    id: string;
    title: string;
    status: RequestContractStatus;
    requestId: string | null;
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
    commentThreads?: Array<{ id: string }>;
  }>;
};

function toContractSummary(
  contract: NonNullable<RequestDbRow['contractInstances']>[number] | null,
): RequestContractSummaryDto | null {
  if (!contract) return null;
  const inst = plainToInstance(
    RequestContractSummaryDto,
    {
      id: contract.id,
      title: contract.title,
      status: contract.status,
      requestId: contract.requestId,
      providerId: contract.providerId,
      openCommentsCount: contract.commentThreads?.length ?? 0,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as RequestContractSummaryDto;
}

export function requestRowToCustomerDtoPlain(
  row: RequestDbRow,
): RequestCustomerDto {
  const offers = row.providerOffers ?? [];
  const selected = offers.filter((o) => o.status === 'SELECTED');
  const declined = offers.filter((o) => o.status === 'DECLINED');
  const visibleContracts = (row.contractInstances ?? []).filter((contract) => {
    if (contract.status === 'DRAFT') return false;
    if (!row.providerId) return true;
    return contract.providerId === row.providerId;
  });
  const contract = visibleContracts[0] ?? null;
  const lastSelectionAt =
    selected.length === 0
      ? null
      : selected
          .map((o) => o.selectedAt)
          .reduce((max, dt) => (dt.getTime() > max.getTime() ? dt : max))
          .toISOString();

  const inst = plainToInstance(
    RequestCustomerDto,
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
      contract: toContractSummary(contract),
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
      serviceTitle: row.service?.title ?? null,
      providerName: row.provider?.name ?? null,
      customerName: row.customerUser?.name ?? null,
      customerEmail: row.customerUser?.email ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as RequestCustomerDto;
}

export function requestRowToProDtoPlain(
  row: RequestDbRow,
  conversationsCount: number,
  actorProviderId: string,
  options?: {
    /**
     * When a request is locked to another provider, sensitive fields are hidden by default.
     * For the "Archive" scope (provider already participated in the conversation), we can
     * still reveal the original request message/location to improve UX.
     */
    revealMessageForLocked?: boolean;
  },
): RequestProDto {
  const locked =
    isExclusiveProviderStatus(row.status) &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId;

  const revealMessageForLocked = Boolean(options?.revealMessageForLocked);
  const canRevealBasicDetails = !locked || revealMessageForLocked;

  const offers = row.providerOffers ?? [];
  const myOffer = offers.find((o) => o.providerId === actorProviderId) ?? null;
  const contract = locked
    ? null
    : ((row.contractInstances ?? []).find(
        (item) => item.providerId === actorProviderId,
      ) ?? null);

  const subjectType = locked
    ? row.categoryId
      ? ('CATEGORY' as const)
      : ('FREEFORM' as const)
    : toSubjectType(row);

  const inst = plainToInstance(
    RequestProDto,
    {
      id: row.id,
      subjectType,
      status: row.status,
      serviceId: locked ? null : row.serviceId,
      serviceTitle: locked ? null : (row.service?.title ?? null),
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      providerId: locked ? null : row.providerId,
      offerStatus: myOffer?.status ?? null,
      offerSelectedAt: myOffer?.selectedAt
        ? myOffer.selectedAt.toISOString()
        : null,
      offerDeclinedAt: myOffer?.declinedAt
        ? myOffer.declinedAt.toISOString()
        : null,
      requestCityId: row.requestCityId,
      message: canRevealBasicDetails ? row.message : null,
      location: canRevealBasicDetails ? row.location : null,
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
      contract: toContractSummary(contract),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as RequestProDto;
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
