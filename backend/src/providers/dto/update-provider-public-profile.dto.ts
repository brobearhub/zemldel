import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

function trimOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function trimOrSame(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProviderPublicStatDto {
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  value!: string;

  @Transform(({ value }: { value: unknown }) => trimOrSame(value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  label!: string;
}

export class UpdateProviderPublicProfileDto {
  @ApiPropertyOptional({ minLength: 2, nullable: true, example: "Земледел" })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(2)
  name?: string | null;

  @ApiPropertyOptional({ minLength: 1, nullable: true, example: 'Эксперт по услуге' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  subtitle?: string | null;

  @ApiPropertyOptional({ minLength: 1, nullable: true, example: null })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  about?: string | null;

  @ApiPropertyOptional({ type: [UpdateProviderPublicStatDto] })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => UpdateProviderPublicStatDto)
  stats?: UpdateProviderPublicStatDto[];
}

