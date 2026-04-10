import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
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

export class CityRefDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  regionCode!: string;

  @Expose()
  @IsString()
  regionName!: string;
}

export class ServiceProviderRefDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  city!: CityRefDto | null;
}

export class ServiceDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  categoryId!: string;

  @Expose()
  category!: ServiceCategoryDto;

  @Expose()
  @Transform(({ value }) => normalizeStatus(value), { toClassOnly: true })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status!: ServiceStatus;

  @Expose()
  @IsString()
  title!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge!: string | null;

  @Expose()
  @IsString()
  price!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating!: number | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount!: number | null;

  @Expose()
  @IsString()
  ctaText!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  @Transform(({ value }) => (isPaletteColor(value) ? value : null), {
    toClassOnly: true,
  })
  paletteColor!: ServicePaletteColor | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  @Transform(({ value }) => (isIconKey(value) ? value : null), {
    toClassOnly: true,
  })
  icon!: ServiceIconKey | null;

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
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsEnum(['DRAFT', 'PUBLISHED'])
  status?: Extract<ServiceStatus, 'DRAFT' | 'PUBLISHED'>;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  title?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  price?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge?: string | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating?: number | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}

export class ServicePatchDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: ServiceStatus;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  title?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  price?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimOrSame(value), {
    toClassOnly: true,
  })
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  ctaHref?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  stockBadge?: string | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating?: number | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  highlight?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  badge?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}
