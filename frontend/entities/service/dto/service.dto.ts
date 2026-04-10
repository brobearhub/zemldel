import "@/core/server/reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
  type ValidationError,
  ValidateIf,
} from "class-validator";
import type { ServiceIconKey, ServicePaletteColor } from "@/entities/service/types";

export type ServiceStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

function normalizeStatus(v: unknown): ServiceStatus {
  if (v === "PUBLISHED") return "PUBLISHED";
  if (v === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

const PALETTE_COLORS: readonly ServicePaletteColor[] = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
] as const;

const ICON_KEYS: readonly ServiceIconKey[] = ["map", "electric", "architecture"] as const;

function isPaletteColor(v: unknown): v is ServicePaletteColor {
  return typeof v === "string" && (PALETTE_COLORS as readonly string[]).includes(v);
}

function isIconKey(v: unknown): v is ServiceIconKey {
  return typeof v === "string" && (ICON_KEYS as readonly string[]).includes(v);
}

function trimOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : null;
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
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  parentId!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
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
  @ValidateIf((_, v) => v !== null && v !== undefined)
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
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status!: ServiceStatus;

  @Expose()
  @IsString()
  title!: string;

  @Expose()
  @Transform(({ value }) => (value === null ? null : value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  image!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  stockBadge!: string | null;

  @Expose()
  @IsString()
  price!: string;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  rating!: number | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  reviewCount!: number | null;

  @Expose()
  @IsString()
  ctaText!: string;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  ctaHref!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  description!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  highlight!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  badge!: string | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(PALETTE_COLORS)
  @Transform(({ value }) => (isPaletteColor(value) ? value : null), { toClassOnly: true })
  paletteColor!: ServicePaletteColor | null;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(ICON_KEYS)
  @Transform(({ value }) => (isIconKey(value) ? value : null), { toClassOnly: true })
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
    city: { id: string; name: string; regionCode: string; regionName: string } | null;
  };
};

export function serviceDbRowToDtoPlain(row: ServiceDbRow): ServiceDto {
  // `plainToInstance` gives us normalized category; `instanceToPlain` ensures JSON-safe output.
  const inst = plainToInstance(ServiceDto, row, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  return instanceToPlain(inst) as ServiceDto;
}

export class ServiceCreateDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsEnum(["DRAFT", "PUBLISHED"])
  status?: Extract<ServiceStatus, "DRAFT" | "PUBLISHED">;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  title?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  price?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  ctaHref?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  image?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  stockBadge?: string | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  rating?: number | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  description?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  highlight?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  badge?: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}

export class ServicePatchDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: ServiceStatus;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  title?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  price?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value), { toClassOnly: true })
  @IsString()
  @MinLength(1)
  ctaText?: string;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  ctaHref?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  image?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  stockBadge?: string | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  rating?: number | null;

  @Expose()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  reviewCount?: number | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  highlight?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  badge?: string | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(PALETTE_COLORS)
  paletteColor?: ServicePaletteColor | null;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEnum(ICON_KEYS)
  icon?: ServiceIconKey | null;
}

export function parseServiceCreateDto(body: unknown): { data?: ServiceCreateDto; issues?: unknown } {
  const inst = plainToInstance(ServiceCreateDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

export function parseServicePatchDto(body: unknown): { data?: ServicePatchDto; issues?: unknown } {
  const inst = plainToInstance(ServicePatchDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: inst };
}

function validationErrorsToIssues(errors: ValidationError[]) {
  const out: Array<{ path: string[]; message: string }> = [];

  function walk(err: ValidationError, prefix: string[] = []) {
    const path = [...prefix, err.property];
    if (err.constraints) {
      for (const msg of Object.values(err.constraints)) {
        out.push({ path, message: msg });
      }
    }
    if (err.children?.length) {
      for (const c of err.children) walk(c, path);
    }
  }

  for (const e of errors) walk(e);
  return out;
}

