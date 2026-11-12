import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatInboxItemDto {
  @ApiPropertyOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  peerName?: string;

  @ApiPropertyOptional()
  requestStatus?: string;

  @ApiPropertyOptional()
  contractPhase?: boolean;

  @ApiProperty({ format: 'uuid' })
  serviceRequestId!: string | null;

  @ApiPropertyOptional({ enum: ['REQUEST', 'DIRECT'] })
  kind?: 'REQUEST' | 'DIRECT';

  @ApiPropertyOptional()
  directState?: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 1 })
  requestNumber!: number | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  lastSnippet!: string | null;

  @ApiPropertyOptional({
    example: 0,
    description: 'Если не поддерживается — поле может отсутствовать.',
  })
  unreadCount?: number;
}

export class ServiceRequestConversationListItemDto {
  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ format: 'uuid' })
  providerId!: string;

  @ApiProperty()
  providerName!: string;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  lastSnippet!: string | null;
}

export class ChatRepliedToDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  senderUserId!: string;

  @ApiProperty({ nullable: true, example: null })
  senderName!: string | null;

  @ApiProperty()
  bodySnippet!: string;
}

export class ChatMessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ format: 'uuid' })
  senderUserId!: string;

  @ApiProperty({ nullable: true, example: null })
  senderName!: string | null;

  @ApiProperty({ nullable: true, example: null })
  senderImage!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: ['USER', 'SYSTEM'], example: 'USER' })
  kind!: 'USER' | 'SYSTEM';

  @ApiProperty({ format: 'uuid' })
  clientMessageId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ChatRepliedToDto, required: false })
  repliedTo?: ChatRepliedToDto;
}

export class ChatConversationAccessDto {
  @ApiProperty({ example: true })
  canRead!: true;

  @ApiProperty()
  canWrite!: boolean;

  @ApiProperty({
    required: false,
    example: 'CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION',
  })
  reasonCode?: string;
}

export class ChatPostMessageResponseDto {
  @ApiProperty({ type: ChatMessageDto })
  message!: ChatMessageDto;

  @ApiProperty()
  alreadyExisted!: boolean;
}

export class ChatMarkReadResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ format: 'date-time' })
  lastReadAt!: string;
}

export class ChatEnsureResponseDto {
  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ type: [ChatMessageDto] })
  messages!: ChatMessageDto[];
}
