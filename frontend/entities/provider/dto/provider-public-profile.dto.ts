import "@/core/server/reflect-metadata";
import { Expose, instanceToPlain, plainToInstance, Transform } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, ValidateIf, validateSync, type ValidationError } from "class-validator";

export type ProviderType = "SELF_EMPLOYED" | "COMPANY";

export class ProviderPublicCityDto {
  @Expose()
  @IsUUID()
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

export class PublicProviderStatDto {
  @Expose()
  @IsString()
  value!: string;

  @Expose()
  @IsString()
  label!: string;
}

function trimOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export class PublicProviderProfileDto {
  @Expose()
  @IsUUID()
  id!: string;

  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  slug!: string;

  @Expose()
  @IsEnum(["SELF_EMPLOYED", "COMPANY"])
  type!: ProviderType;

  @Expose()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  rating!: number | null;

  @Expose()
  @IsInt()
  reviewCount!: number;

  @Expose()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  city!: ProviderPublicCityDto | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  image!: string | null;

  /**
   * Фото, загруженное именно у провайдера (без фолбэка на user.image).
   * Нужен, чтобы UI мог отличать "своё" фото провайдера от аватарки владельца.
   */
  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  providerImage!: string | null;

  @Expose()
  @IsString()
  subtitle!: string;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  about!: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  phone!: string | null;

  @Expose()
  @Transform(({ value }) => trimOrNull(value), { toClassOnly: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  email!: string | null;

  @Expose()
  @IsOptional()
  @IsBoolean()
  useOwnEmail!: boolean;

  @Expose()
  @IsString()
  availabilityLabel!: string;

  @Expose()
  @IsArray()
  stats!: PublicProviderStatDto[];
}

export function parsePublicProviderProfileDto(body: unknown): { data?: PublicProviderProfileDto; issues?: unknown } {
  const inst = plainToInstance(PublicProviderProfileDto, body, {
    excludeExtraneousValues: true,
    enableImplicitConversion: false,
  });
  const errors = validateSync(inst, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) return { issues: validationErrorsToIssues(errors) };
  return { data: instanceToPlain(inst) as PublicProviderProfileDto };
}

function validationErrorsToIssues(errors: ValidationError[]) {
  const out: Array<{ path: string[]; message: string }> = [];
  function walk(err: ValidationError, prefix: string[] = []) {
    const path = [...prefix, err.property];
    if (err.constraints) {
      for (const msg of Object.values(err.constraints)) out.push({ path, message: msg });
    }
    if (err.children?.length) {
      for (const c of err.children) walk(c, path);
    }
  }
  for (const e of errors) walk(e);
  return out;
}

