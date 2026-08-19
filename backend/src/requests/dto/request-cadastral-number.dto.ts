import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import {
  IsString,
  MinLength,
  validateSync,
  type ValidationError,
} from 'class-validator';
import type { RequestStatus } from './request.dto';

export const TERMINAL_REQUEST_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
] as const satisfies readonly RequestStatus[];

export function isTerminalRequestStatus(status: RequestStatus | string): boolean {
  return (TERMINAL_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function normalizeCadastralNumberValue(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCadastralNumbers(
  values: string[] | undefined | null,
): string[] {
  if (!values?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const normalized = normalizeCadastralNumberValue(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function parseCadastralNumberIndex(raw: string): number {
  const index = Number.parseInt(raw, 10);
  if (!Number.isInteger(index) || index < 0) {
    return Number.NaN;
  }
  return index;
}

export class RequestCadastralNumberAppendDto {
  @ApiProperty({ minLength: 1, example: '50:12:0000000:51755' })
  @Expose()
  @IsString()
  @MinLength(1)
  value!: string;
}

export class RequestCadastralNumberUpdateDto {
  @ApiProperty({ minLength: 1, example: '50:12:0000000:51755' })
  @Expose()
  @IsString()
  @MinLength(1)
  value!: string;
}

function toIssues(errors: ValidationError[]) {
  return errors.flatMap((error) =>
    Object.values(error.constraints ?? {}).map((message) => ({
      path: [error.property],
      message,
    })),
  );
}

function parseCadastralValueDto<T extends object>(
  cls: new () => T,
  input: unknown,
): { data: T | null; issues: ReturnType<typeof toIssues> | null } {
  const dto = plainToInstance(cls, input ?? {});
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) return { data: null, issues: toIssues(errors) };
  return { data: dto, issues: null };
}

export function parseRequestCadastralNumberAppendDto(input: unknown) {
  return parseCadastralValueDto(RequestCadastralNumberAppendDto, input);
}

export function parseRequestCadastralNumberUpdateDto(input: unknown) {
  return parseCadastralValueDto(RequestCadastralNumberUpdateDto, input);
}
