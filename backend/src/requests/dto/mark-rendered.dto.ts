import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { IsString, MaxLength, MinLength, validateSync } from 'class-validator';

export type ValidationIssue = { path: string[]; message: string };

export class MarkRenderedDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Expose()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  summary!: string;
}

export function parseMarkRenderedDto(input: unknown): {
  data: MarkRenderedDto | null;
  issues: ValidationIssue[] | null;
} {
  const dto = plainToInstance(MarkRenderedDto, input ?? {});
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length === 0) return { data: dto, issues: null };

  return {
    data: null,
    issues: errors.flatMap((error) =>
      Object.values(error.constraints ?? {}).map((message) => ({
        path: [error.property],
        message,
      })),
    ),
  };
}
