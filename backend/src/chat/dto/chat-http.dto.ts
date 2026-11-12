import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
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

export class ChatInboxQueryDto {
  @ApiPropertyOptional({ enum: ['customer', 'provider'] })
  @IsOptional()
  @IsIn(['customer', 'provider'])
  role?: 'customer' | 'provider';
}

export class ChatDirectStartDto {
  @IsUUID() customerId!: string;
  @IsUUID() clientMessageId!: string;
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
}
export class ChatDirectStateDto {
  @IsIn(['decline', 'block', 'resume']) action!: 'decline' | 'block' | 'resume';
}
