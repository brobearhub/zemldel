import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty({ minLength: 1, maxLength: 500, example: 'Call the provider' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @ApiProperty({ format: 'date-time', example: '2026-06-14T12:00:00.000Z' })
  @IsDateString()
  remindAt!: string;
}
