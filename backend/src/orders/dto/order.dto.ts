import 'reflect-metadata';
import {
  Expose,
  instanceToPlain,
  plainToInstance,
  Transform,
} from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export type OrderStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

function normalizeStatus(value: unknown): OrderStatus {
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
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
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
}

export type OrderDbRow = {
  id: string;
  serviceId: string;
  providerId: string;
  customerUserId: string;
  status: OrderStatus;
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
    },
    {
      excludeExtraneousValues: true,
      enableImplicitConversion: false,
    },
  );

  return instanceToPlain(instance) as OrderDto;
}
