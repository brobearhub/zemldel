import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Expose,
  Transform,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import type { ServiceIconKey, ServicePaletteColor } from '../service.types';

export type ServiceStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

function normalizeStatus(value: unknown): ServiceStatus {
  if (value === 'PUBLISHED') return 'PUBLISHED';
  if (value === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}

const PALETTE_COLORS: readonly ServicePaletteColor[] = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
] as const;

const ICON_KEYS: readonly ServiceIconKey[] = [
  'map',
  'electric',
  'architecture',
] as const;

function isPaletteColor(value: unknown): value is ServicePaletteColor {
  return (
    typeof value === 'string' &&
    (PALETTE_COLORS as readonly string[]).includes(value)
  );
}

function isIconKey(value: unknown): value is ServiceIconKey {
  return (
    typeof value === 'string' &&
    (ICON_KEYS as readonly string[]).includes(value)
  );
}

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
}

export class CityRefDto {
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
  regionCode!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  regionName!: string;
}

export class ServiceProviderRefDto {
  @ApiProperty()
  @Expose()
  @IsString()
  id!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  name!: string;

  @ApiProperty({ type: CityRefDto, nullable: true })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  city!: CityRefDto | null;
}

export class ServiceDto {
  @ApiProperty()
  @Expose()
  @IsString()
  id!: string;

  @ApiProperty()
  @Expose()
  @IsString()
  categoryId!: string;

  @ApiProperty({ type: ServiceCategoryDto })
  @Expose()
  category!: ServiceCategoryDto;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status!: ServiceStatus;

  @ApiProperty()
  @Expose()
  @IsString()
  title!: string;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge!: string | null;

  @ApiProperty()
  @Expose()
  @IsString()
  price!: string;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating!: number | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount!: number | null;

  @ApiProperty()
  @Expose()
  @IsString()
  ctaText!: string;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight!: string | null;

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge!: string | null;

  @ApiProperty({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  @Transform(({ value }) => (isPaletteColor(value) ? value : null), {
    toClassOnly: true,
  })
  paletteColor!: ServicePaletteColor | null;

  @ApiProperty({ enum: ICON_KEYS, nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  @Transform(({ value }) => (isIconKey(value) ? value : null), {
    toClassOnly: true,
  })
  icon!: ServiceIconKey | null;

  @ApiProperty({ type: ServiceProviderRefDto })
  @Expose()
  provider!: ServiceProviderRefDto;
}

export type ServiceDbRow = {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    sortOrder: number | null;
  };
  status: ServiceStatus;
  title: string;
  image: string | null;
  stockBadge: string | null;
  price: string;
  rating: number | null;
  reviewCount: number | null;
  ctaText: string;
  ctaHref: string | null;
  description: string | null;
  highlight: string | null;
  badge: string | null;
  paletteColor: string | null;
  icon: string | null;
  provider: {
    id: string;
    name: string;
    city: {
      id: string;
      name: string;
      regionCode: string;
      regionName: string;
    } | null;
  };
};

export function serviceDbRowToDtoPlain(row: ServiceDbRow): ServiceDto {
  const instance = plainToInstance(ServiceDto, row, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  return instanceToPlain(instance) as ServiceDto;
}

export class ServiceCreateDto {
  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED'] })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsEnum(['DRAFT', 'PUBLISHED'])
  status?: Extract<ServiceStatus, 'DRAFT' | 'PUBLISHED'>;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  price?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating?: number | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge?: string | null;

  @ApiPropertyOptional({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @ApiPropertyOptional({ enum: ICON_KEYS, nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}

export class ServicePatchDto {
  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: ServiceStatus;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  price?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating?: number | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge?: string | null;

  @ApiPropertyOptional({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @ApiPropertyOptional({ enum: ICON_KEYS, nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}
