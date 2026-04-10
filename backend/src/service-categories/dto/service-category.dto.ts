import { Expose, Transform } from 'class-transformer';
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
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  slug!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder!: number | null;

  @Expose()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements!: ServiceCategoryPlacement[];
}

export class ServiceCategoryCreateDto {
  @Expose()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @Expose()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  slug!: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId?: string | null;

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

  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements?: ServiceCategoryPlacement[];
}

export class ServiceCategoryPatchDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  name?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  slug?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  parentId?: string | null;

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

  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(['HOME'], { each: true })
  placements?: ServiceCategoryPlacement[];
}
