import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiBody as ApiBodyDoc,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatService } from './chat.service';
import { ChatEnsureBodyDto, ChatPostMessageBodyDto } from './dto/chat-http.dto';
import {
  ChatConversationAccessDto,
  ChatEnsureResponseDto,
  ChatMarkReadResponseDto,
  ChatMessageDto,
  ChatPostMessageResponseDto,
  ServiceRequestConversationListItemDto,
} from './dto/chat-responses.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('chat')
@ApiStandardErrors()
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('chat/requests/:id/conversations')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [ServiceRequestConversationListItemDto] })
  async listRequestConversations(
    @Req() request: Request,
    @Param('id') requestId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.listServiceRequestConversationsForCustomer(
      userId,
      requestId,
    );
  }

  @Post('chat/ensure')
  @ApiBodyDoc({ type: ChatEnsureBodyDto })
  @ApiOkResponse({ type: ChatEnsureResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async ensure(@Req() request: Request, @Body() body: unknown) {
    const dto = plainToInstance(ChatEnsureBodyDto, body);
    const issues = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (issues.length > 0) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    const hasRequest =
      typeof dto.serviceRequestId === 'string' &&
      dto.serviceRequestId.length > 0;
    if (!hasRequest) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['serviceRequestId'],
            message: 'serviceRequestId is required',
          },
        ],
      });
    }
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.ensureServiceRequestConversation(
      userId,
      dto.serviceRequestId!,
    );
  }

  @Get('chat/conversations/:conversationId/messages')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [ChatMessageDto] })
  async listMessages(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.chat.listMessages(userId, conversationId, {
      before,
      after,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Get('chat/conversations/:conversationId/access')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ type: ChatConversationAccessDto })
  async getConversationAccess(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.getConversationAccess(userId, conversationId);
  }

  @Post('chat/conversations/:conversationId/messages')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiBodyDoc({ type: ChatPostMessageBodyDto })
  @ApiOkResponse({ type: ChatPostMessageResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async postMessage(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const dto = plainToInstance(ChatPostMessageBodyDto, body);
    const issues = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (issues.length > 0) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    const userId = this.chat.getRequiredActorUserId(request);
    const { message, alreadyExisted } = await this.chat.createMessage(
      userId,
      conversationId,
      {
        body: dto.body,
        clientMessageId: dto.clientMessageId,
        replyToMessageId: dto.replyToMessageId,
      },
    );
    return { message, alreadyExisted };
  }

  @Post('chat/conversations/:conversationId/read')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ type: ChatMarkReadResponseDto })
  async markRead(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.markRead(userId, conversationId);
  }
}
