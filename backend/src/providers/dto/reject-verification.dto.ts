import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectVerificationDto {
  @ApiProperty({ description: 'Причина для исполнителя, дословно' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
