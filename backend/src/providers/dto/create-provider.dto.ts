import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PROVIDER_TYPES, type ProviderType } from '../../auth/authorization';

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ProviderLegalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Полное наименование организации' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({
    description: '10 цифр для организации, 12 для остальных',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  inn?: string;

  @ApiPropertyOptional({ description: 'ОГРН 13 цифр или ОГРНИП 15 цифр' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  ogrn?: string;
}

export class ProviderContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  middleName?: string;
}

export class CreateProviderDto {
  @ApiPropertyOptional({
    minLength: 2,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    example: 'ivan-petrov',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiProperty({ enum: PROVIDER_TYPES })
  @IsEnum(PROVIDER_TYPES)
  type!: ProviderType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cityId!: string;

  /** Версия оферты платных услуг, с которой исполнитель ознакомился (не акцепт-оплата). */
  @ApiProperty({ example: '2026-08-04', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @Transform(trimString)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  offerVersion!: string;

  @ApiProperty({ type: ProviderLegalDto })
  @ValidateNested()
  @Type(() => ProviderLegalDto)
  legal!: ProviderLegalDto;

  @ApiPropertyOptional({ type: ProviderContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderContactDto)
  contact?: ProviderContactDto;
}
