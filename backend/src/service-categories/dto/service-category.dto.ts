import { Expose, Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

function trimOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
}

export class ServiceCategoryCreateDto {
  @Expose()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  name!: string;

  @Expose()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
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
  @Transform(({ value }) => (value === null ? null : value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder?: number | null;
}

export class ServiceCategoryPatchDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  name?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
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
  @Transform(({ value }) => (value === null ? null : value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  sortOrder?: number | null;
}

