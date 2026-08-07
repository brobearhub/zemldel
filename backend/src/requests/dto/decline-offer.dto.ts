import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsString, MinLength, validateSync, type ValidationError } from 'class-validator';

export function formatProviderDeclineChatMessage(reason: string): string {
  return `Исполнитель отказался от выполнения заявки по причине: "${reason.trim()}"`;
}

export class DeclineOfferDto {
  @ApiProperty({ minLength: 1 })
  @Expose()
  @IsString()
  @MinLength(1)
  reason!: string;
}

export function parseDeclineOfferDto(body: unknown): {
  ok: true;
  value: DeclineOfferDto;
} | {
  ok: false;
  issues: ValidationError[];
} {
  const instance = plainToInstance(DeclineOfferDto, body ?? {}, {
    excludeExtraneousValues: true,
  });
  if (typeof instance.reason === 'string') {
    instance.reason = instance.reason.trim();
  }
  const issues = validateSync(instance, { whitelist: true });
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: instance };
}
