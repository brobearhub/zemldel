import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ServiceCategoryPlacement } from '@prisma/client';

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

export class ServiceCategoryDto {
  @ApiProperty()
  @Expose()
  @IsString()
  id!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  name!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  slug!: string;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder!: number | null;

  @ApiProperty({ enum: ['HOME'], isArray: true })
  @Expose()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements!: ServiceCategoryPlacement[];
}

export class ServiceCategoryCreateDto {
  @ApiProperty({ minLength: 1 })
  @Expose()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ minLength: 1 })
  @Expose()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => (value === null ? null : value),
    {
      toClassOnly: true,
    },
  )
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder?: number | null;

  @ApiPropertyOptional({ enum: ['HOME'], isArray: true })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements?: ServiceCategoryPlacement[];
}

export class ServiceCategoryPatchDto {
  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  slug?: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => (value === null ? null : value),
    {
      toClassOnly: true,
    },
  )
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder?: number | null;

  @ApiPropertyOptional({ enum: ['HOME'], isArray: true })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements?: ServiceCategoryPlacement[];
}
