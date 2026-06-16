import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatEnsureBodyDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceRequestId?: string;
}

export class ChatPostMessageBodyDto {
  @ApiProperty({ minLength: 1, example: 'Hello!' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientMessageId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}
