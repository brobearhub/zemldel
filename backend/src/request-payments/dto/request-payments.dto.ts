import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { RequestPaymentItemDto } from '../../requests/dto/request.dto';

export class SetRequestTotalDto {
  @ApiProperty({ example: 25000, description: 'Полная цена в рублях' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalAmountRubles!: number;
}

export class CreateRequestPaymentDto {
  @ApiProperty({ required: false, enum: ['CONTRACT', 'OTHER'], example: 'CONTRACT', description: 'Тип платежа' })
  @IsOptional()
  @IsString()
  @IsEnum(['CONTRACT', 'OTHER'])
  type?: 'CONTRACT' | 'OTHER';

  @ApiProperty({ example: 5000, description: 'Сумма поступления в рублях' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountRubles!: number;

  @ApiProperty({ example: 'Аванс', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  comment!: string;

  @ApiProperty({ required: false, example: '2026-08-13T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class RequestFinanceDto {
  @ApiProperty({ nullable: true, example: 25000 })
  totalAmountRubles!: number | null;

  @ApiProperty({ example: 5000 })
  paidAmountRubles!: number;

  @ApiProperty({ nullable: true, example: 20000 })
  remainingAmountRubles!: number | null;

  @ApiProperty({ type: [RequestPaymentItemDto] })
  @Type(() => RequestPaymentItemDto)
  @IsArray()
  payments!: RequestPaymentItemDto[];
}
