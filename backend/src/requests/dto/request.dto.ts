import 'reflect-metadata';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Expose,
  instanceToPlain,
  plainToInstance,
  Transform,
  Type,
} from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  validateSync,
  type ValidationError,
} from 'class-validator';
import {
  remainingRubles,
  sumPaidRublesByType,
  type PaymentAmountWithTypeAndPaidAt,
} from './request-finance';

export type RequestStatus =
  | 'NEW'
  | 'DISCUSSING'
  | 'TERMS_AGREED'
  | 'ACTIVE'
  | 'ACCEPTANCE_PENDING'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export const REQUEST_STATUS_VALUES = [
  'NEW',
  'DISCUSSING',
  'TERMS_AGREED',
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
] as const satisfies readonly RequestStatus[];

export const ORDER_EXECUTION_STATUSES = [
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly RequestStatus[];

export function isOrderExecutionStatus(
  value: RequestStatus | string,
): value is (typeof ORDER_EXECUTION_STATUSES)[number] {
  return (ORDER_EXECUTION_STATUSES as readonly string[]).includes(value);
}

/** Заявка зафиксирована за исполнителем (фаза заказа/договора и далее). */
export function hasRequestLock(row: {
  lockedAt: Date | string | null | undefined;
}): boolean {
  return row.lockedAt != null;
}

export function isLockedToOtherProvider(
  row: {
    lockedAt: Date | string | null | undefined;
    providerId: string | null | undefined;
  },
  actorProviderId: string,
): boolean {
  return (
    hasRequestLock(row) &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId
  );
}

export function isExclusiveForActorProvider(
  row: {
    lockedAt: Date | string | null | undefined;
    providerId: string | null | undefined;
  },
  actorProviderId: string,
): boolean {
  return hasRequestLock(row) && row.providerId === actorProviderId;
}

export const ORDER_STATUSES = [
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly RequestStatus[];

export type RequestSubjectType = 'FREEFORM' | 'CATEGORY' | 'SERVICE';

export type RequestProviderOfferStatus = 'SELECTED' | 'DECLINED';

export type RequestPaymentType = 'CONTRACT' | 'OTHER';

export class RequestPaymentItemDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: ['CONTRACT', 'OTHER'], example: 'CONTRACT' })
  @Expose()
  @IsEnum(['CONTRACT', 'OTHER'])
  type!: RequestPaymentType;

  @ApiProperty({ example: 5000 })
  @Expose()
  @IsInt()
  amountRubles!: number;

  @ApiProperty({ example: 'Аванс' })
  @Expose()
  @IsString()
  comment!: string;

  @ApiProperty({ nullable: true, example: '2026-08-13T10:00:00.000Z' })
  @Expose()
  @IsOptional()
  @IsString()
  paidAt!: string | null;

  @ApiProperty()
  @Expose()
  @IsString()
  createdAt!: string;
}

export class RequestCustomerOfferDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  @IsUUID()
  providerId!: string;

  @ApiProperty({ enum: ['SELECTED', 'DECLINED'] })
  @Expose()
  @IsEnum(['SELECTED', 'DECLINED'])
  status!: RequestProviderOfferStatus;
}

function normalizeStatus(value: unknown): RequestStatus {
  if (value === 'DISCUSSING') return 'DISCUSSING';
  if (value === 'TERMS_AGREED') return 'TERMS_AGREED';
  if (value === 'ACCEPTANCE_PENDING') return 'ACCEPTANCE_PENDING';
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'ACTIVE') return 'ACTIVE';
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

function nonemptyOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export class RequestUnlinkedCreateDto {
  @ApiPropertyOptional({ nullable: true, minLength: 10, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(10)
  message?: string | null;

  @ApiPropertyOptional({ nullable: true, minLength: 2, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(2)
  location?: string | null;

  @ApiPropertyOptional({ nullable: true, minLength: 7, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(7)
  customerPhone?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value), { toClassOnly: true })
  @IsUUID()
  requestCityId?: string;

  @ApiPropertyOptional({ type: [String], example: ['50:12:0000000:51755'] })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cadastralNumbers?: string[];
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
  @ApiPropertyOptional({ nullable: true, minLength: 3, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  message?: string | null;

  @ApiPropertyOptional({ nullable: true, minLength: 7, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(7)
  customerPhone?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value), { toClassOnly: true })
  @IsUUID()
  requestCityId?: string;

  @ApiPropertyOptional({ type: [String], example: ['50:12:0000000:51755'] })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cadastralNumbers?: string[];
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
  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerEmail?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  customerPhone?: string | null;

  @ApiPropertyOptional({ nullable: true, minLength: 3, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  message?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
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
  @ApiProperty({ format: 'uuid' })
  @Expose()
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: ['FREEFORM', 'CATEGORY', 'SERVICE'] })
  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: RequestSubjectType;

  @ApiProperty({ enum: REQUEST_STATUS_VALUES })
  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(REQUEST_STATUS_VALUES)
  status!: RequestStatus;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  serviceId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  categoryId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

  @ApiProperty({ type: [String] })
  @Expose()
  selectedProviderIds!: string[];

  @ApiProperty({ type: [String] })
  @Expose()
  declinedProviderIds!: string[];

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  lastSelectionAt!: string | null;

  @ApiProperty({ type: [RequestCustomerOfferDto] })
  @Expose()
  offers!: RequestCustomerOfferDto[];

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  requestCityId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  message!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  lockedAt!: string | null;

  @ApiProperty({ nullable: true, type: Object, example: null })
  @Expose()
  dealTerms!: unknown | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  offerVersion!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  termsVersion!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  contractAcceptedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  acceptanceRequestedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  autoAcceptAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  acceptedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  serviceTitle!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  providerName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  providerPhone!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  providerEmail!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  providerImage!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerEmail!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsInt()
  totalAmountRubles!: number | null;

  @ApiProperty({ example: 0 })
  @Expose()
  @IsInt()
  paidAmountRubles!: number;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsInt()
  remainingAmountRubles!: number | null;

  @ApiProperty({ type: [RequestPaymentItemDto] })
  @Expose()
  @Type(() => RequestPaymentItemDto)
  @IsArray()
  payments!: RequestPaymentItemDto[];

  @ApiProperty({ type: [String], example: ['50:12:0000000:51755'] })
  @Expose()
  @IsArray()
  @IsString({ each: true })
  cadastralNumbers!: string[];

  @ApiProperty()
  @Expose()
  @IsString()
  createdAt!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  updatedAt!: string;

  @ApiProperty({
    description:
      'Клиент может закрыть заявку без сделки, если по ней ещё не было ответа исполнителя',
  })
  @Expose()
  @IsBoolean()
  canDeleteByCustomer!: boolean;
}

export class RequestProDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: ['FREEFORM', 'CATEGORY', 'SERVICE'] })
  @Expose()
  @IsEnum(['FREEFORM', 'CATEGORY', 'SERVICE'])
  subjectType!: RequestSubjectType;

  @ApiProperty({ enum: REQUEST_STATUS_VALUES })
  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(REQUEST_STATUS_VALUES)
  status!: RequestStatus;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  serviceId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  serviceTitle!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  categoryId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  categoryName!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

  @ApiProperty({ enum: ['SELECTED', 'DECLINED'], nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsEnum(['SELECTED', 'DECLINED'])
  offerStatus!: RequestProviderOfferStatus | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  offerSelectedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  offerDeclinedAt!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Expose()
  @IsOptional()
  @IsUUID()
  requestCityId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  message!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  lockedAt!: string | null;

  @ApiProperty({ nullable: true, type: Object, example: null })
  @Expose()
  dealTerms!: unknown | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  offerVersion!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  termsVersion!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  contractAcceptedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  acceptanceRequestedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  autoAcceptAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  acceptedAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerEmail!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerPhone!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsString()
  customerImage!: string | null;

  @ApiProperty()
  @Expose()
  conversationsCount!: number;

  @ApiProperty()
  @Expose()
  isLocked!: boolean;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsInt()
  totalAmountRubles!: number | null;

  @ApiProperty({ example: 0 })
  @Expose()
  @IsInt()
  paidAmountRubles!: number;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @IsInt()
  remainingAmountRubles!: number | null;

  @ApiProperty({ type: [RequestPaymentItemDto] })
  @Expose()
  @Type(() => RequestPaymentItemDto)
  @IsArray()
  payments!: RequestPaymentItemDto[];

  @ApiProperty({ type: [String], example: ['50:12:0000000:51755'] })
  @Expose()
  @IsArray()
  @IsString({ each: true })
  cadastralNumbers!: string[];

  @ApiProperty()
  @Expose()
  @IsString()
  createdAt!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  updatedAt!: string;
}

export function canCustomerDeleteRequest(
  row: Pick<
    RequestDbRow,
    'status' | 'lockedAt' | 'dealTerms' | 'providerOffers'
  >,
  hasProviderResponse: boolean,
): boolean {
  if (row.status === 'CLOSED') return false;
  if (hasRequestLock(row)) return false;
  if (isOrderExecutionStatus(row.status)) return false;
  if (row.status !== 'NEW' && row.status !== 'DISCUSSING') return false;
  if (hasProviderResponse) return false;
  if (row.dealTerms != null) return false;
  const offers = row.providerOffers ?? [];
  if (offers.some((offer) => offer.status === 'SELECTED')) return false;
  return true;
}

export type RequestDbRow = {
  id: string;
  status: RequestStatus;
  serviceId: string | null;
  categoryId: string | null;
  providerId: string | null;
  customerUserId: string | null;
  requestCityId: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  message: string | null;
  location: string | null;
  cadastralNumbers?: string[];
  lockedAt: Date | null;
  dealTerms?: unknown | null;
  offerVersion?: string | null;
  termsVersion?: string | null;
  contractAcceptedAt?: Date | null;
  acceptanceRequestedAt?: Date | null;
  autoAcceptAt?: Date | null;
  acceptedAt?: Date | null;
  totalAmountRubles?: number | null;
  createdAt: Date;
  updatedAt: Date;
  service?: { title: string } | null;
  category?: { name: string } | null;
  customerUser?: {
    customerCityId: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  provider?: {
    name: string;
    legalProfile?: { phone: string | null; email: string | null } | null;
    ownerUser?: { image?: string | null } | null;
  } | null;
  providerOffers?: Array<{
    providerId: string;
    status: RequestProviderOfferStatus;
    selectedAt: Date;
    declinedAt: Date | null;
  }>;
  payments?: Array<{
    id: string;
    type: RequestPaymentType;
    amountRubles: number;
    comment: string;
    paidAt: Date;
    createdAt: Date;
  }>;
};

function toFinanceDto(row: RequestDbRow, reveal: boolean) {
  if (!reveal) {
    return {
      totalAmountRubles: null,
      paidAmountRubles: 0,
      remainingAmountRubles: null,
      payments: [] as RequestPaymentItemDto[],
    };
  }
  const payments = row.payments ?? [];
  const paidAmountRubles = sumPaidRublesByType(payments as unknown as PaymentAmountWithTypeAndPaidAt[], 'CONTRACT');
  return {
    totalAmountRubles: row.totalAmountRubles ?? null,
    paidAmountRubles,
    remainingAmountRubles: remainingRubles(row.totalAmountRubles ?? null, paidAmountRubles),
    payments: payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      amountRubles: payment.amountRubles,
      comment: payment.comment,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export function requestRowToCustomerDtoPlain(
  row: RequestDbRow,
  options?: { hasProviderResponse?: boolean },
): RequestCustomerDto {
  const hasProviderResponse = options?.hasProviderResponse ?? false;
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
      requestCityId: row.requestCityId,
      message: row.message,
      location: row.location,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      dealTerms: row.dealTerms ?? null,
      offerVersion: row.offerVersion ?? null,
      termsVersion: row.termsVersion ?? null,
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
      providerPhone: hasRequestLock(row)
        ? nonemptyOrNull(row.provider?.legalProfile?.phone)
        : null,
      providerEmail: hasRequestLock(row)
        ? nonemptyOrNull(row.provider?.legalProfile?.email)
        : null,
      providerImage: hasRequestLock(row)
        ? nonemptyOrNull(row.provider?.ownerUser?.image)
        : null,
      customerName: row.customerUser?.name ?? null,
      customerEmail: row.customerUser?.email ?? null,
      cadastralNumbers: row.cadastralNumbers ?? [],
      ...toFinanceDto(row, hasRequestLock(row)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      canDeleteByCustomer: canCustomerDeleteRequest(row, hasProviderResponse),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  const plain = instanceToPlain(inst) as RequestCustomerDto;
  plain.canDeleteByCustomer = canCustomerDeleteRequest(row, hasProviderResponse);
  return plain;
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
  const locked = isLockedToOtherProvider(row, actorProviderId);

  const revealMessageForLocked = Boolean(options?.revealMessageForLocked);
  const canRevealBasicDetails = !locked || revealMessageForLocked;

  const offers = row.providerOffers ?? [];
  const myOffer = offers.find((o) => o.providerId === actorProviderId) ?? null;

  const subjectType = locked
    ? row.categoryId
      ? ('CATEGORY' as const)
      : ('FREEFORM' as const)
    : toSubjectType(row);

  const revealCustomerContacts = isExclusiveForActorProvider(
    row,
    actorProviderId,
  );

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
      cadastralNumbers: canRevealBasicDetails ? row.cadastralNumbers ?? [] : [],
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      dealTerms: locked ? null : (row.dealTerms ?? null),
      offerVersion: row.offerVersion ?? null,
      termsVersion: row.termsVersion ?? null,
      contractAcceptedAt: row.contractAcceptedAt
        ? row.contractAcceptedAt.toISOString()
        : null,
      acceptanceRequestedAt: row.acceptanceRequestedAt
        ? row.acceptanceRequestedAt.toISOString()
        : null,
      autoAcceptAt: row.autoAcceptAt ? row.autoAcceptAt.toISOString() : null,
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
      customerName: revealCustomerContacts
        ? nonemptyOrNull(row.customerName)
        : null,
      customerEmail: revealCustomerContacts
        ? nonemptyOrNull(row.customerEmail)
        : null,
      customerPhone: revealCustomerContacts
        ? nonemptyOrNull(row.customerPhone)
        : null,
      customerImage: revealCustomerContacts
        ? nonemptyOrNull(row.customerUser?.image)
        : null,
      conversationsCount,
      isLocked: locked,
      ...toFinanceDto(row, revealCustomerContacts),
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
