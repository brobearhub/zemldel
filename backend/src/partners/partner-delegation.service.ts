import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import { PartnersService } from './partners.service';
import { partnerPairKey, requirePartnerManager } from './partner-access';

@Injectable()
export class PartnerDelegationService {
  private readonly logger = new Logger(PartnerDelegationService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly partners: PartnersService,
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  async delegate(
    userId: string,
    requestId: string,
    partnerProviderId: string,
    confirmed: boolean,
  ) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Подтвердите передачу заявки и потерю доступа к ней',
      );
    const providerId = await this.partners.activeProvider(userId);
    if (providerId === partnerProviderId)
      throw new BadRequestException('Выберите другого исполнителя');
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize with contract acceptance, payments, assignment and competing delegation.
      await tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${requestId}::uuid FOR UPDATE`;
      await requirePartnerManager(tx, userId, providerId);
      const request = await tx.request.findUnique({
        where: { id: requestId },
        include: {
          payments: { select: { id: true }, take: 1 },
          contractFiles: {
            where: {
              OR: [
                { role: 'CONTRACT_SIGNATURE' },
                { role: 'CONTRACT_DOCUMENT', status: 'APPROVED' },
              ],
            },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!request || request.providerId !== providerId)
        throw new NotFoundException(
          'Заявка больше не принадлежит этому исполнителю',
        );
      if (request.providerWorkStatus) {
        throw new BadRequestException(
          'Приватная заявка принадлежит кабинету исполнителя',
        );
      }
      if (
        [
          'CLOSED',
          'CANCELLED',
          'COMPLETED',
          'ACCEPTED',
          'ACCEPTANCE_PENDING',
        ].includes(request.status)
      )
        throw new BadRequestException(
          'Нельзя передать закрытую заявку или заявку на приёмке',
        );
      if (
        request.contractAcceptedAt ||
        request.payments.length ||
        request.contractFiles.length
      )
        throw new BadRequestException(
          'Передать можно только заявку без подписанного договора и оплат',
        );
      const partnership = await tx.providerPartnership.findUnique({
        where: { pairKey: partnerPairKey(providerId, partnerProviderId) },
      });
      if (partnership?.status !== 'ACTIVE')
        throw new ForbiddenException('Выберите подтверждённого партнёра');
      const target = await tx.provider.findFirst({
        where: {
          id: partnerProviderId,
          members: { some: { role: 'OWNER', status: 'ACTIVE' } },
        },
        select: { name: true },
      });
      if (!target) throw new BadRequestException('Профиль партнёра недоступен');
      const members = await tx.providerMember.findMany({
        where: {
          providerId: { in: [providerId, partnerProviderId] },
          status: 'ACTIVE',
        },
        select: { userId: true, providerId: true },
      });
      const oldConversations = await tx.conversation.findMany({
        where: { requestId, providerId },
        select: { id: true },
      });
      const oldIds = oldConversations.map((row) => row.id);

      // Stop queued deliveries to the former provider, including messages queued before transfer.
      await tx.messengerDelivery.updateMany({
        where: {
          message: { conversation: { requestId } },
          connection: {
            userId: {
              in: members
                .filter((member) => member.providerId === providerId)
                .map((member) => member.userId),
            },
          },
          status: { in: ['PENDING', 'FAILED'] },
        },
        data: { status: 'CANCELLED', leaseToken: null },
      });

      let conversation = await tx.conversation.findUnique({
        where: {
          requestId_providerId: { requestId, providerId: partnerProviderId },
        },
      });
      const source = oldConversations[0];
      if (source) {
        if (conversation) {
          // Keep both histories if the recipient already discussed this request.
          const targetMessages = await tx.message.findMany({
            where: { conversationId: conversation.id },
            select: { senderUserId: true, clientMessageId: true },
          });
          const occupied = new Set(
            targetMessages.map(
              (message) => `${message.senderUserId}:${message.clientMessageId}`,
            ),
          );
          const sourceMessages = await tx.message.findMany({
            where: { conversationId: source.id },
            select: { id: true, senderUserId: true, clientMessageId: true },
          });
          for (const message of sourceMessages) {
            // Client IDs are unique per conversation; merging must not discard a message.
            if (
              occupied.has(`${message.senderUserId}:${message.clientMessageId}`)
            )
              await tx.message.update({
                where: { id: message.id },
                data: { clientMessageId: randomUUID() },
              });
          }
          await tx.message.updateMany({
            where: { conversationId: source.id },
            data: { conversationId: conversation.id },
          });
          await tx.conversation.delete({ where: { id: source.id } });
        } else {
          conversation = await tx.conversation.update({
            where: { id: source.id },
            data: { providerId: partnerProviderId },
          });
          await tx.conversationReadState.deleteMany({
            where: {
              conversationId: source.id,
              userId: {
                in: members
                  .filter((member) => member.providerId === providerId)
                  .map((member) => member.userId),
              },
            },
          });
        }
      }
      if (!conversation && request.customerUserId) {
        conversation = await tx.conversation.create({
          data: {
            requestId,
            providerId: partnerProviderId,
            customerUserId: request.customerUserId,
          },
        });
      }

      await tx.request.update({
        where: { id: requestId },
        data: {
          providerId: partnerProviderId,
          assignedMemberId: null,
          lockedAt: request.lockedAt ?? new Date(),
          // Unsigned generated terms belong to the previous provider and must be regenerated.
          dealTerms: Prisma.DbNull,
          offerVersion: null,
          termsVersion: null,
        },
      });
      await tx.requestProviderOffer.deleteMany({
        where: { requestId, providerId },
      });
      await tx.requestProviderOffer.upsert({
        where: {
          requestId_providerId: { requestId, providerId: partnerProviderId },
        },
        create: {
          requestId,
          providerId: partnerProviderId,
          status: 'SELECTED',
        },
        update: {
          status: 'SELECTED',
          selectedAt: new Date(),
          declinedAt: null,
        },
      });
      // Ownership fields used by document, workflow and finance access checks move together.
      const scope = { requestId, providerId };
      await tx.requestContractFile.updateMany({
        where: scope,
        data: { providerId: partnerProviderId },
      });
      await tx.requestDocumentRequest.updateMany({
        where: scope,
        data: { providerId: partnerProviderId },
      });
      await tx.requestWorkStage.updateMany({
        where: scope,
        data: { providerId: partnerProviderId },
      });
      await tx.requestReminder.updateMany({
        where: scope,
        data: { providerId: partnerProviderId },
      });
      await tx.requestPriceProposal.updateMany({
        where: scope,
        data: { providerId: partnerProviderId },
      });
      // A passport grant is consent to one named provider; it is never inherited.
      await tx.passportAccessGrant.deleteMany({ where: { requestId } });
      await tx.passportAccessRequest.deleteMany({ where: { requestId } });
      await tx.requestEvent.create({
        data: {
          requestId,
          type: 'DELEGATE_PARTNER',
          actorUserId: userId,
          actorProviderId: providerId,
          payload: {
            previousProviderId: providerId,
            providerId: partnerProviderId,
            partnershipId: partnership.id,
            previousAssignedMemberId: request.assignedMemberId,
          },
        },
      });
      let messageId: string | null = null;
      if (conversation) {
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderUserId: userId,
            clientMessageId: randomUUID(),
            kind: 'SYSTEM',
            body: `Заявка передана партнёру «${target.name}». Предыдущий исполнитель больше не имеет доступа к заявке.`,
          },
        });
        messageId = message.id;
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: message.createdAt, status: 'OPEN' },
        });
      }
      return {
        messageId,
        conversationId: conversation?.id,
        oldIds,
        recipients: [
          ...new Set([
            ...members.map((member) => member.userId),
            ...(request.customerUserId ? [request.customerUserId] : []),
          ]),
        ],
      };
    });
    // Realtime errors must not report a committed transfer as a failed write.
    try {
      for (const id of result.oldIds) this.gateway.evictConversation(id);
      for (const recipient of result.recipients) {
        this.gateway.emitRequestChanged(recipient, requestId);
        for (const id of new Set([
          ...result.oldIds,
          ...(result.conversationId ? [result.conversationId] : []),
        ]))
          this.gateway.emitConversationChanged(recipient, id);
      }
      if (result.messageId)
        await this.chat.notifyMessageCreated(result.messageId);
    } catch (error) {
      this.logger.warn(`Could not notify request delegation: ${String(error)}`);
    }
    return { requestId, providerId: partnerProviderId };
  }
}
