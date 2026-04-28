import 'reflect-metadata';
import { Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export type PaymentTypeLiteral = 'PAYMENT' | 'PAYOUT';
export type PaymentStatusLiteral =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export class PaymentDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  serviceRequestId!: string;

  @Expose()
  @IsEnum(['PAYMENT', 'PAYOUT'])
  type!: PaymentTypeLiteral;

  @Expose()
  @IsEnum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])
  status!: PaymentStatusLiteral;

  @Expose()
  @IsString()
  providerKey!: string;

  @Expose()
  @IsInt()
  amountMinor!: number;

  @Expose()
  @IsString()
  currency!: string;

  @Expose()
  @IsOptional()
  @IsString()
  redirectUrl!: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  externalId!: string | null;

  @Expose()
  @IsString()
  createdAt!: string;

  @Expose()
  @IsString()
  updatedAt!: string;
}

export type PaymentDtoInput = {
  id: string;
  serviceRequestId: string;
  type: PaymentTypeLiteral;
  status: PaymentStatusLiteral;
  providerKey: string;
  amountMinor: number;
  currency: string;
  redirectUrl: string | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function paymentToDtoPlain(row: PaymentDtoInput): PaymentDto {
  const instance = plainToInstance(
    PaymentDto,
    {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    {
      excludeExtraneousValues: true,
      enableImplicitConversion: false,
    },
  );
  return instanceToPlain(instance) as PaymentDto;
}
