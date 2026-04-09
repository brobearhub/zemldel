import { Expose, Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

function trimOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export class ServiceTemplateDto {
  @Expose()
  @IsString()
  id!: string;

  @Expose()
  @IsString()
  categoryId!: string;

  @Expose()
  @IsString()
  title!: string;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  description!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  paletteColor!: string | null;

  @Expose()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  icon!: string | null;
}

export class ServiceTemplateCreateDto {
  @Expose()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  categoryId!: string;

  @Expose()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  title!: string;

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
  paletteColor?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  icon?: string | null;
}

export class ServiceTemplatePatchDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  title?: string;

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
  paletteColor?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  icon?: string | null;
}

export type ServiceTemplateWithIsAddedDto = ServiceTemplateDto & {
  isAdded: boolean;
};

