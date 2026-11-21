import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Conversation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { chatMessageInclude } from './direct-chat.service';

export class LandChatService {
  constructor(private readonly prisma: PrismaService) {}
  async authorize(
    tx: Prisma.TransactionClient,
    userId: string,
    conv: Pick<
      Conversation,
      'customerUserId' | 'providerId' | 'landSellerUserId'
    >,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (!user || user.systemRole === 'PLATFORM_ADMIN')
      throw new ForbiddenException('Нет доступа к переписке');
    if (userId === conv.customerUserId) return 'customer' as const;
    if (!conv.providerId && userId === conv.landSellerUserId)
      return 'provider' as const;
    const member = conv.providerId
      ? await tx.providerMember.findUnique({
          where: { providerId_userId: { providerId: conv.providerId, userId } },
        })
      : null;
    if (!member || member.status !== 'ACTIVE' || member.role === 'EMPLOYEE')
      throw new ForbiddenException('Нет доступа к переписке');
    return 'provider' as const;
  }
  async start(userId: string, listingId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "LandListing" WHERE id = ${listingId}::uuid FOR UPDATE`;
      const row = await tx.landListing.findUnique({ where: { id: listingId } });
      if (!row || row.kind !== 'SALE')
        throw new NotFoundException('Предложение не найдено');
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });
      if (!user || user.systemRole === 'PLATFORM_ADMIN')
        throw new ForbiddenException('Нет доступа к переписке');
      const ownProvider = row.providerId
        ? await tx.providerMember.findFirst({
            where: { providerId: row.providerId, userId, status: 'ACTIVE' },
          })
        : null;
      if ((!row.providerId && row.authorUserId === userId) || ownProvider)
        throw new BadRequestException('Это ваше объявление');
      const existing = await tx.conversation.findUnique({
        where: {
          landListingId_customerUserId: {
            landListingId: listingId,
            customerUserId: userId,
          },
        },
      });
      if (existing) return { conversationId: existing.id };
      if (row.status !== 'PUBLISHED')
        throw new NotFoundException('Предложение больше не доступно');
      const conv = await tx.conversation.create({
        data: {
          kind: 'LAND',
          landListingId: listingId,
          customerUserId: userId,
          providerId: row.providerId,
          landSellerUserId: row.providerId ? null : row.authorUserId,
        },
      });
      return { conversationId: conv.id };
    });
  }
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
      throw new BadRequestException('Сообщение — от 1 до 5000 символов');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
      const conv = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv || conv.kind !== 'LAND')
        throw new NotFoundException('Переписка не найдена');
      await this.authorize(tx, userId, conv);
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
