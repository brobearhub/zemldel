import 'reflect-metadata';
import {
  Expose,
  instanceToPlain,
  plainToInstance,
  Transform,
} from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export type OrderStatus =
  | 'CONTRACT_ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'ACTIVE'
  | 'SERVICE_RENDERED'
  | 'ACCEPTANCE_PENDING'
  | 'ACCEPTED'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED';

function normalizeStatus(value: unknown): OrderStatus {
  if (value === 'CONTRACT_ACCEPTED') return 'CONTRACT_ACCEPTED';
  if (value === 'PAYMENT_PENDING') return 'PAYMENT_PENDING';
  if (value === 'PAYMENT_PROCESSING') return 'PAYMENT_PROCESSING';
  if (value === 'SERVICE_RENDERED') return 'SERVICE_RENDERED';
  if (value === 'ACCEPTANCE_PENDING') return 'ACCEPTANCE_PENDING';
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'PAID') return 'PAID';
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  return 'ACTIVE';
}

export class OrderDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  serviceId!: string;

  @Expose()
  @IsString()
  providerId!: string;

  @Expose()
  @IsString()
  customerUserId!: string;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum([
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
  ])
  status!: OrderStatus;

  @Expose()
  @IsString()
  serviceTitle!: string;

  @Expose()
  @IsString()
  providerName!: string;

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

  @Expose()
  dealTerms!: unknown | null;

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
}

export type OrderDbRow = {
  id: string;
  serviceId: string;
  providerId: string;
  customerUserId: string;
  status: OrderStatus;
  dealTerms: unknown | null;
  acceptanceRequestedAt: Date | null;
  autoAcceptAt: Date | null;
  acceptedAt: Date | null;
  service: {
    title: string;
  };
  provider: {
    name: string;
  };
  customerUser: {
    name: string | null;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export function orderDbRowToDtoPlain(row: OrderDbRow): OrderDto {
  const instance = plainToInstance(
    OrderDto,
    {
      ...row,
      serviceTitle: row.service.title,
      providerName: row.provider.name,
      customerName: row.customerUser.name,
      customerEmail: row.customerUser.email,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      dealTerms: row.dealTerms ?? null,
      acceptanceRequestedAt: row.acceptanceRequestedAt
        ? row.acceptanceRequestedAt.toISOString()
        : null,
      autoAcceptAt: row.autoAcceptAt ? row.autoAcceptAt.toISOString() : null,
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    },
    {
      excludeExtraneousValues: true,
      enableImplicitConversion: false,
    },
  );

  return instanceToPlain(instance) as OrderDto;
}
