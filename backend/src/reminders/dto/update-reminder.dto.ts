import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReminderDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 500,
    example: 'Call the provider',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-06-14T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}
