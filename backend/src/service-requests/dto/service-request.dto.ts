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
  | 'LOCKED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type ServiceRequestSubjectType = 'FREEFORM' | 'CATEGORY' | 'SERVICE';

export type ServiceRequestPendingInitiator = 'CUSTOMER' | 'PROVIDER';

function normalizeStatus(value: unknown): ServiceRequestStatus {
  if (value === 'DISCUSSING') return 'DISCUSSING';
  if (value === 'LOCKED') return 'LOCKED';
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
    'LOCKED',
    'ACTIVE',
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
  @IsOptional()
  @IsUUID()
  pendingProviderId!: string | null;

  @Expose()
  @IsOptional()
  @IsEnum(['CUSTOMER', 'PROVIDER'])
  pendingInitiator!: ServiceRequestPendingInitiator | null;

  @Expose()
  @IsOptional()
  @IsString()
  pendingAt!: string | null;

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
    'LOCKED',
    'ACTIVE',
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
  @IsUUID()
  pendingProviderId!: string | null;

  @Expose()
  @IsOptional()
  @IsEnum(['CUSTOMER', 'PROVIDER'])
  pendingInitiator!: ServiceRequestPendingInitiator | null;

  @Expose()
  @IsOptional()
  @IsString()
  pendingAt!: string | null;

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
  pendingProviderId: string | null;
  pendingInitiator: ServiceRequestPendingInitiator | null;
  pendingAt: Date | null;
  customerUserId: string | null;
  requestCityId: string | null;
  message: string | null;
  location: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  service?: { title: string } | null;
  category?: { name: string } | null;
  customerUser?: { customerCityId: string | null } | null;
};

export function serviceRequestRowToCustomerDtoPlain(
  row: ServiceRequestDbRow,
): ServiceRequestCustomerDto {
  const inst = plainToInstance(
    ServiceRequestCustomerDto,
    {
      id: row.id,
      subjectType: toSubjectType(row),
      status: row.status,
      serviceId: row.serviceId,
      categoryId: row.categoryId,
      providerId: row.providerId,
      pendingProviderId: row.pendingProviderId,
      pendingInitiator: row.pendingInitiator,
      pendingAt: row.pendingAt ? row.pendingAt.toISOString() : null,
      requestCityId: row.requestCityId,
      message: row.message,
      location: row.location,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
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
    (row.status === 'ACTIVE' ||
      row.status === 'COMPLETED' ||
      row.status === 'CANCELLED') &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId;

  const inst = plainToInstance(
    ServiceRequestProDto,
    {
      id: row.id,
      subjectType: toSubjectType(row),
      status: row.status,
      serviceId: row.serviceId,
      serviceTitle: row.service?.title ?? null,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      providerId: row.providerId,
      pendingProviderId: row.pendingProviderId,
      pendingInitiator: row.pendingInitiator,
      pendingAt: row.pendingAt ? row.pendingAt.toISOString() : null,
      requestCityId: row.requestCityId,
      message: locked ? null : row.message,
      location: locked ? null : row.location,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
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
