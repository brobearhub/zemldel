import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requirePartnerChatAccess } from '../partners/partner-access';
import { chatMessageInclude } from './direct-chat.service';

export class PartnerChatService {
  constructor(private readonly prisma: PrismaService) {}

  async send(
    userId: string,
    conversationId: string,
    input: {
      body: string;
      clientMessageId: string;
      replyToMessageId?: string | null;
    },
  ) {
    const body = input.body.trim();
    if (!body || body.length > 5000)
      throw new BadRequestException(
        'Сообщение должно содержать от 1 до 5000 символов',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation || conversation.kind !== 'PARTNER')
        throw new NotFoundException('Диалог не найден');
      await requirePartnerChatAccess(tx, userId, conversation);
      const existing = await tx.message.findUnique({
        where: {
          conversationId_senderUserId_clientMessageId: {
            conversationId,
            senderUserId: userId,
            clientMessageId: input.clientMessageId,
          },
        },
        include: chatMessageInclude,
      });
      if (existing) {
        if (
          existing.body !== body ||
          (existing.replyToMessageId ?? null) !==
            (input.replyToMessageId ?? null)
        )
          throw new ConflictException(
            'Идентификатор сообщения уже использован',
          );
        return { message: existing, alreadyExisted: true };
      }
      if (
        input.replyToMessageId &&
        !(await tx.message.findFirst({
          where: { id: input.replyToMessageId, conversationId },
          select: { id: true },
        }))
      )
        throw new BadRequestException('Сообщение для ответа не найдено');
      const message = await tx.message.create({
        data: {
          conversationId,
          senderUserId: userId,
          body,
          clientMessageId: input.clientMessageId,
          replyToMessageId: input.replyToMessageId,
        },
        include: chatMessageInclude,
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });
      return { message, alreadyExisted: false };
    });
  }
}
