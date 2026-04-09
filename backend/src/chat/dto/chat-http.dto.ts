import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ChatEnsureBodyDto {
  @IsOptional()
  @IsUUID()
  serviceRequestId?: string;
}

export class ChatPostMessageBodyDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsUUID()
  clientMessageId!: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}
