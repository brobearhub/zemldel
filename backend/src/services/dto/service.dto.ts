import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Expose,
  Transform,
  Type,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import type { ServicePaletteColor } from '../service.types';
import { formatPublicProviderName } from '../../providers/provider-display-name';
import type { ProviderType } from '../../auth/authorization';

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

function isPaletteColor(value: unknown): value is ServicePaletteColor {
  return (
    typeof value === 'string' &&
    (PALETTE_COLORS as readonly string[]).includes(value)
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

function normalizeIsoDateOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
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

export class ServicePlaceDto {
  @ApiProperty({ enum: ['city', 'region'] })
  @Expose()
  @IsIn(['city', 'region'])
  kind!: 'city' | 'region';

  @ApiPropertyOptional()
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  cityId?: string;

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

export class ServicePlaceInputDto {
  @ApiProperty({ enum: ['city', 'region'] })
  @Expose()
  @IsIn(['city', 'region'])
  kind!: 'city' | 'region';

  @ApiPropertyOptional()
  @Expose()
  @ValidateIf((place: ServicePlaceInputDto) => place.kind === 'city')
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional()
  @Expose()
  @ValidateIf((place: ServicePlaceInputDto) => place.kind === 'region')
  @IsString()
  @MinLength(1)
  regionCode?: string;
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

  @ApiProperty()
  @Expose()
  @IsString()
  slug!: string;

  @ApiProperty()
  @Expose()
  @IsBoolean()
  verified!: boolean;

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
  @Transform(({ value }) => normalizeIsoDateOrNull(value), {
    toClassOnly: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  publishedAt!: string | null;

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

  @ApiProperty({ nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description!: string | null;

  @ApiProperty({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  @Transform(({ value }) => (isPaletteColor(value) ? value : null), {
    toClassOnly: true,
  })
  paletteColor!: ServicePaletteColor | null;

  @ApiProperty({ type: [ServicePlaceDto] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePlaceDto)
  places!: ServicePlaceDto[];

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
  publishedAt: Date | null;
  image: string | null;
  stockBadge: string | null;
  price: string;
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  paletteColor: string | null;
  provider: {
    id: string;
    name: string;
    slug: string;
    type: ProviderType;
    verificationStatus: string;
    city: {
      id: string;
      name: string;
      regionCode: string;
      regionName: string;
    } | null;
  };
  cities: Array<{
    city: {
      id: string;
      name: string;
      regionCode: string;
      regionName: string;
    };
  }>;
  regions: Array<{
    regionCode: string;
    regionName: string;
  }>;
};

function placesFromRow(row: ServiceDbRow): ServicePlaceDto[] {
  return [
    ...row.cities.map((link) => ({
      kind: 'city' as const,
      cityId: link.city.id,
      name: link.city.name,
      regionCode: link.city.regionCode,
      regionName: link.city.regionName,
    })),
    ...row.regions.map((region) => ({
      kind: 'region' as const,
      name: region.regionName,
      regionCode: region.regionCode,
      regionName: region.regionName,
    })),
  ];
}

export function serviceDbRowToDtoPlain(row: ServiceDbRow): ServiceDto {
  const instance = plainToInstance(
    ServiceDto,
    {
      ...row,
      places: placesFromRow(row),
      provider: {
        ...row.provider,
        name: formatPublicProviderName({
          type: row.provider.type,
          name: row.provider.name,
        }),
        verified: row.provider.verificationStatus === 'VERIFIED',
      },
    },
    {
      excludeExtraneousValues: true,
      enableImplicitConversion: false,
    },
  );
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

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null, maxLength: 33 })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(33)
  stockBadge?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @ApiProperty({ type: [ServicePlaceInputDto] })
  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServicePlaceInputDto)
  places!: ServicePlaceInputDto[];
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

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null, maxLength: 33 })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(33)
  stockBadge?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: PALETTE_COLORS, nullable: true, example: null })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @ApiPropertyOptional({ type: [ServicePlaceInputDto] })
  @Expose()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServicePlaceInputDto)
  places?: ServicePlaceInputDto[];
}
