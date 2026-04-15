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
import type { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatService } from './chat.service';
import { ChatEnsureBodyDto, ChatPostMessageBodyDto } from './dto/chat-http.dto';

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('chat/service-requests/:id/conversations')
  async listRequestConversations(
    @Req() request: Request,
    @Param('id') serviceRequestId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.listServiceRequestConversationsForCustomer(
      userId,
      serviceRequestId,
    );
  }

  @Post('chat/ensure')
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
  async getConversationAccess(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.getConversationAccess(userId, conversationId);
  }

  @Post('chat/conversations/:conversationId/messages')
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
  async markRead(
    @Req() request: Request,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = this.chat.getRequiredActorUserId(request);
    return this.chat.markRead(userId, conversationId);
  }
}
