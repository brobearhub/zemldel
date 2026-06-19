import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsString,
  MinLength,
  validateSync,
  type ValidationError,
} from 'class-validator';

export type RequestRemarkStatus = 'OPEN' | 'DONE';
export type RequestRemarkAuthorSide = 'CUSTOMER' | 'PROVIDER';

export class RequestRemarkDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  requestId!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'PROVIDER'] })
  @Expose()
  @IsEnum(['CUSTOMER', 'PROVIDER'])
  authorSide!: RequestRemarkAuthorSide;

  @ApiProperty({ enum: ['OPEN', 'DONE'] })
  @Expose()
  @IsEnum(['OPEN', 'DONE'])
  status!: RequestRemarkStatus;

  @ApiProperty()
  @Expose()
  @IsString()
  text!: string;

  @ApiProperty()
  @Expose()
  createdAt!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  doneAt!: string | null;
}

export class RequestRemarkCreateDto {
  @ApiProperty({ minLength: 3 })
  @Expose()
  @IsString()
  @MinLength(3)
  text!: string;
}

export type ValidationIssue = { path: string[]; message: string };

function toIssues(errors: ValidationError[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const e of errors) {
    const constraints = e.constraints ? Object.values(e.constraints) : [];
    for (const msg of constraints) {
      issues.push({ path: [e.property], message: msg });
    }
  }
  return issues;
}

export function parseRequestRemarkCreateDto(input: unknown): {
  data: RequestRemarkCreateDto | null;
  issues: ValidationIssue[] | null;
} {
  const dto = plainToInstance(RequestRemarkCreateDto, input ?? {});
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) return { data: null, issues: toIssues(errors) };
  return { data: dto, issues: null };
}

export function requestRemarkToDtoPlain(input: {
  id: string;
  requestId: string;
  authorSide: RequestRemarkAuthorSide;
  status: RequestRemarkStatus;
  text: string;
  createdAt: Date;
  doneAt: Date | null;
}): RequestRemarkDto {
  return instanceToPlain(
    plainToInstance(RequestRemarkDto, {
      id: input.id,
      requestId: input.requestId,
      authorSide: input.authorSide,
      status: input.status,
      text: input.text,
      createdAt: input.createdAt.toISOString(),
      doneAt: input.doneAt ? input.doneAt.toISOString() : null,
    }),
  ) as unknown as RequestRemarkDto;
}

