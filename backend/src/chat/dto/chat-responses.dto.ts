import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatInboxItemDto {
  @ApiProperty({ format: 'uuid' })
  serviceRequestId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'date-time', nullable: true, example: null })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true, example: null })
  lastSnippet!: string | null;

  @ApiPropertyOptional({ example: 0, description: 'Если не поддерживается — поле может отсутствовать.' })
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

  @ApiProperty()
  body!: string;

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

  @ApiProperty({ required: false })
  reason?: string;
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

