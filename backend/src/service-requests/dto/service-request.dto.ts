import 'reflect-metadata';
import { Expose, instanceToPlain, plainToInstance, Transform } from 'class-transformer';
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

export type ServiceRequestKind = 'UNLINKED' | 'TEMPLATE' | 'SERVICE';
export type ServiceRequestStatus =
  | 'NEW'
  | 'DISCUSSING'
  | 'LOCKED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

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
}

export function parseServiceRequestUnlinkedCreateDto(body: unknown): { data?: ServiceRequestUnlinkedCreateDto; issues?: unknown } {
  const inst = plainToInstance(ServiceRequestUnlinkedCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export class ServiceRequestTemplateCreateDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  message?: string | null;
}

export function parseServiceRequestTemplateCreateDto(body: unknown): { data?: ServiceRequestTemplateCreateDto; issues?: unknown } {
  const inst = plainToInstance(ServiceRequestTemplateCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true });
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
}

export function parseServiceRequestServiceCreateDto(body: unknown): { data?: ServiceRequestServiceCreateDto; issues?: unknown } {
  const inst = plainToInstance(ServiceRequestServiceCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export class ServiceRequestCustomerDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['UNLINKED', 'TEMPLATE', 'SERVICE'])
  kind!: ServiceRequestKind;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(['NEW', 'DISCUSSING', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'CLOSED'])
  status!: ServiceRequestStatus;

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
  @IsUUID()
  providerId!: string | null;

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

export class ServiceRequestProFeedItemDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['UNLINKED', 'TEMPLATE'])
  kind!: 'UNLINKED' | 'TEMPLATE';

  @Expose()
  @IsOptional()
  @IsUUID()
  templateId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  templateTitle!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  message!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(['NEW', 'DISCUSSING', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'CLOSED'])
  status!: ServiceRequestStatus;

  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

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

export class ServiceRequestProDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsEnum(['UNLINKED', 'TEMPLATE', 'SERVICE'])
  kind!: ServiceRequestKind;

  @Expose()
  @IsOptional()
  @IsUUID()
  templateId!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  templateTitle!: string | null;

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
  @IsString()
  message!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  location!: string | null;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(['NEW', 'DISCUSSING', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'CLOSED'])
  status!: ServiceRequestStatus;

  @Expose()
  @IsOptional()
  @IsUUID()
  providerId!: string | null;

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
  kind: ServiceRequestKind;
  status: ServiceRequestStatus;
  templateId: string | null;
  serviceId: string | null;
  providerId: string | null;
  customerUserId: string | null;
  message: string | null;
  location: string | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  template: { title: string } | null;
  service?: { title: string } | null;
};

export function serviceRequestRowToCustomerDtoPlain(row: ServiceRequestDbRow): ServiceRequestCustomerDto {
  const inst = plainToInstance(
    ServiceRequestCustomerDto,
    {
      id: row.id,
      kind: row.kind,
      status: row.status,
      message: row.message,
      location: row.location,
      providerId: row.providerId,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as ServiceRequestCustomerDto;
}

export function serviceRequestRowToProFeedItemDtoPlain(row: ServiceRequestDbRow, conversationsCount: number, actorProviderId: string): ServiceRequestProFeedItemDto {
  const locked =
    (row.status === 'LOCKED' || row.status === 'ACTIVE' || row.status === 'COMPLETED' || row.status === 'CANCELLED') &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId;

  const inst = plainToInstance(
    ServiceRequestProFeedItemDto,
    {
      id: row.id,
      kind: row.kind === 'TEMPLATE' ? 'TEMPLATE' : 'UNLINKED',
      templateId: row.kind === 'TEMPLATE' ? row.templateId : null,
      templateTitle: row.kind === 'TEMPLATE' ? row.template?.title ?? null : null,
      message: locked ? null : row.message,
      location: locked ? null : row.location,
      status: row.status,
      providerId: row.providerId,
      lockedAt: row.lockedAt ? row.lockedAt.toISOString() : null,
      conversationsCount,
      isLocked: locked,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { excludeExtraneousValues: true, enableImplicitConversion: false },
  );
  return instanceToPlain(inst) as ServiceRequestProFeedItemDto;
}

export function serviceRequestRowToProDtoPlain(row: ServiceRequestDbRow, conversationsCount: number, actorProviderId: string): ServiceRequestProDto {
  const locked =
    (row.status === 'LOCKED' || row.status === 'ACTIVE' || row.status === 'COMPLETED' || row.status === 'CANCELLED') &&
    Boolean(row.providerId) &&
    row.providerId !== actorProviderId;

  const inst = plainToInstance(
    ServiceRequestProDto,
    {
      id: row.id,
      kind: row.kind,
      templateId: row.kind === 'TEMPLATE' ? row.templateId : null,
      templateTitle: row.kind === 'TEMPLATE' ? row.template?.title ?? null : null,
      serviceId: row.serviceId,
      serviceTitle: row.service?.title ?? null,
      message: locked ? null : row.message,
      location: locked ? null : row.location,
      status: row.status,
      providerId: row.providerId,
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

