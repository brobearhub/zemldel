import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ChatGateway } from './chat.gateway';

const SNIPPET_LEN = 160;

export type ChatMessageDto = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string | null;
  body: string;
  clientMessageId: string;
  createdAt: string;
  repliedTo?: {
    id: string;
    senderUserId: string;
    senderName: string | null;
    bodySnippet: string;
  };
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly internalAuth: InternalAuthService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: ChatGateway,
  ) {}

  getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  private async loadUserChatActor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        systemRole: true,
        activeProviderId: true,
        providerMemberships: {
          where: { status: 'ACTIVE' },
          select: { providerId: true },
        },
      },
    });
    if (!user) {
      throw new ForbiddenException('Forbidden');
    }
    return user;
  }

  private assertRequestChatEligible(req: { customerUserId: string | null }) {
    if (!req.customerUserId) {
      throw new ForbiddenException('Chat is available only for requests linked to a customer account');
    }
  }


  private async assertProviderEligibleForTemplate(providerId: string, templateId: string) {
    const eligible = await this.prisma.service.findFirst({
      where: { providerId, status: 'PUBLISHED', templateId },
      select: { id: true },
    });
    if (!eligible) {
      throw new ForbiddenException('Forbidden');
    }
  }

  private async getRequestForChat(serviceRequestId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        id: true,
        kind: true,
        status: true,
        templateId: true,
        serviceId: true,
        providerId: true,
        customerUserId: true,
      },
    });
    if (!req) {
      throw new NotFoundException('Service request not found');
    }
    return req;
  }

  private isLockedStatus(status: string) {
    return status === 'LOCKED' || status === 'ACTIVE' || status === 'COMPLETED' || status === 'CANCELLED';
  }

  private async assertCanAccessRequestConversation(
    userId: string,
    subject: { requestId: string; conversationProviderId: string },
    systemRole: string,
    activeMemberProviderIds: string[],
  ) {
    if (systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Platform admin cannot access customer-provider chats');
    }

    const req = await this.getRequestForChat(subject.requestId);
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });

    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    if (req.kind === 'SERVICE') {
      if (!req.providerId) {
        throw new ForbiddenException('Request has no provider');
      }
      // Access: customer or provider members of the request's provider.
      if (req.customerUserId === userId) {
        return;
      }
      if (activeMemberProviderIds.includes(req.providerId)) {
        return;
      }
      throw new ForbiddenException('Forbidden');
    }

    // TEMPLATE / UNLINKED: access is based on the conversation's providerId
    const locked = this.isLockedStatus(String(req.status)) && Boolean(req.providerId) && req.providerId !== subject.conversationProviderId;
    if (locked) {
      throw new ForbiddenException('Request is locked');
    }

    if (req.customerUserId === userId) {
      return;
    }

    if (activeMemberProviderIds.includes(subject.conversationProviderId)) {
      if (req.kind === 'TEMPLATE') {
        if (!req.templateId) {
          throw new ForbiddenException('Request has no template');
        }
        await this.assertProviderEligibleForTemplate(subject.conversationProviderId, req.templateId);
      }
      return;
    }

    throw new ForbiddenException('Forbidden');
  }

  async assertConversationAccess(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        serviceRequestId: true,
        providerId: true,
        customerUserId: true,
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const user = await this.loadUserChatActor(userId);
    const memberIds = user.providerMemberships.map((m) => m.providerId);

    await this.assertCanAccessRequestConversation(
      userId,
      { requestId: conv.serviceRequestId, conversationProviderId: conv.providerId },
      user.systemRole,
      memberIds,
    );
  }

  private pickActorProviderId(user: { activeProviderId: string | null; providerMemberships: Array<{ providerId: string }> }) {
    const memberIds = user.providerMemberships.map((m) => m.providerId);
    if (user.activeProviderId && memberIds.includes(user.activeProviderId)) {
      return user.activeProviderId;
    }
    return memberIds[0] ?? null;
  }

  async ensureServiceRequestConversation(actorUserId: string, serviceRequestId: string) {
    const req = await this.getRequestForChat(serviceRequestId);
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });

    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    const user = await this.loadUserChatActor(actorUserId);
    const memberIds = user.providerMemberships.map((m) => m.providerId);

    // SERVICE request: single deterministic provider thread.
    if (req.kind === 'SERVICE') {
      if (!req.providerId) {
        throw new NotFoundException('Request provider not found');
      }

      if (user.systemRole === 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Platform admin cannot access customer-provider chats');
      }

      if (req.customerUserId !== actorUserId && !memberIds.includes(req.providerId)) {
        throw new ForbiddenException('Forbidden');
      }

      const conversation = await this.prisma.conversation.upsert({
        where: {
          serviceRequestId_providerId: {
            serviceRequestId: req.id,
            providerId: req.providerId,
          },
        },
        create: {
          id: randomUUID(),
          serviceRequestId: req.id,
          providerId: req.providerId,
          customerUserId: req.customerUserId!,
        },
        update: {},
        select: { id: true },
      });

      return { conversationId: conversation.id, messages: [] as ChatMessageDto[] };
    }

    // TEMPLATE / UNLINKED
    if (req.customerUserId === actorUserId) {
      // Customer can chat only after provider "takes" the request.
      if (!req.providerId) {
        throw new ForbiddenException('Chat is available after a provider takes the request');
      }

      const conversation = await this.prisma.conversation.upsert({
        where: {
          serviceRequestId_providerId: {
            serviceRequestId: req.id,
            providerId: req.providerId,
          },
        },
        create: {
          id: randomUUID(),
          serviceRequestId: req.id,
          providerId: req.providerId,
          customerUserId: req.customerUserId!,
        },
        update: {},
        select: { id: true },
      });

      return { conversationId: conversation.id, messages: [] as ChatMessageDto[] };
    }

    if (user.systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Platform admin cannot access customer-provider chats');
    }

    const providerId = this.pickActorProviderId(user);
    if (!providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    if (!memberIds.includes(providerId)) {
      throw new ForbiddenException('Forbidden');
    }

    if (req.kind === 'TEMPLATE') {
      if (!req.templateId) {
        throw new ForbiddenException('Forbidden');
      }
      await this.assertProviderEligibleForTemplate(providerId, req.templateId);
    }

    const locked =
      this.isLockedStatus(String(req.status)) && Boolean(req.providerId) && req.providerId !== providerId;
    if (locked) {
      throw new ForbiddenException('Request is locked');
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        serviceRequestId_providerId: {
          serviceRequestId: req.id,
          providerId,
        },
      },
      create: {
        id: randomUUID(),
        serviceRequestId: req.id,
        providerId,
        customerUserId: req.customerUserId!,
      },
      update: {},
      select: { id: true },
    });

    if (req.status === 'NEW') {
      await this.prisma.serviceRequest.update({
        where: { id: req.id },
        data: { status: 'DISCUSSING' },
      });
    }

    return { conversationId: conversation.id, messages: [] as ChatMessageDto[] };
  }

  private mapMessageRow(
    row: Prisma.MessageGetPayload<{
      include: {
        sender: { select: { id: true; name: true } };
        replyTo: {
          select: {
            id: true;
            senderUserId: true;
            body: true;
            sender: { select: { name: true } };
          };
        };
      };
    }>,
  ): ChatMessageDto {
    const dto: ChatMessageDto = {
      id: row.id,
      conversationId: row.conversationId,
      senderUserId: row.senderUserId,
      senderName: row.sender.name ?? null,
      body: row.body,
      clientMessageId: row.clientMessageId,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.replyTo) {
      dto.repliedTo = {
        id: row.replyTo.id,
        senderUserId: row.replyTo.senderUserId,
        senderName: row.replyTo.sender?.name ?? null,
        bodySnippet:
          row.replyTo.body.length > SNIPPET_LEN
            ? `${row.replyTo.body.slice(0, SNIPPET_LEN)}…`
            : row.replyTo.body,
      };
    }

    return dto;
  }

  private messageInclude = {
    sender: { select: { id: true, name: true } },
    replyTo: {
      select: {
        id: true,
        senderUserId: true,
        body: true,
        sender: { select: { name: true } },
      },
    },
  } satisfies Prisma.MessageInclude;

  async listMessages(
    actorUserId: string,
    conversationId: string,
    query: { before?: string; after?: string; limit?: number },
  ): Promise<ChatMessageDto[]> {
    await this.assertConversationAccess(actorUserId, conversationId);

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const where: Prisma.MessageWhereInput = { conversationId };

    if (query.before && query.after) {
      throw new BadRequestException('Use either before or after cursor, not both');
    }

    if (query.before) {
      const anchor = await this.prisma.message.findFirst({
        where: { id: query.before, conversationId },
        select: { createdAt: true },
      });
      if (!anchor) {
        throw new BadRequestException('Invalid before cursor');
      }
      where.createdAt = { lt: anchor.createdAt };
    } else if (query.after) {
      const anchor = await this.prisma.message.findFirst({
        where: { id: query.after, conversationId },
        select: { createdAt: true },
      });
      if (!anchor) {
        throw new BadRequestException('Invalid after cursor');
      }
      where.createdAt = { gt: anchor.createdAt };
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: this.messageInclude,
    });

    return rows.reverse().map((r) => this.mapMessageRow(r));
  }

  async markRead(actorUserId: string, conversationId: string) {
    await this.assertConversationAccess(actorUserId, conversationId);

    const now = new Date();
    await this.prisma.conversationReadState.upsert({
      where: {
        conversationId_userId: { conversationId, userId: actorUserId },
      },
      create: {
        conversationId,
        userId: actorUserId,
        lastReadAt: now,
      },
      update: { lastReadAt: now },
    });

    return { ok: true as const, lastReadAt: now.toISOString() };
  }

  private async getParticipantUserIds(conversationId: string): Promise<string[]> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        customerUserId: true,
        providerId: true,
      },
    });
    if (!conv) {
      return [];
    }

    const members = await this.prisma.providerMember.findMany({
      where: { providerId: conv.providerId, status: 'ACTIVE' },
      select: { userId: true },
    });

    const ids = new Set<string>([conv.customerUserId, ...members.map((m) => m.userId)]);
    return [...ids];
  }

  async createMessage(
    actorUserId: string,
    conversationId: string,
    input: { body: string; clientMessageId: string; replyToMessageId?: string | null },
  ): Promise<{ message: ChatMessageDto; alreadyExisted: boolean }> {
    await this.assertConversationAccess(actorUserId, conversationId);

    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Message body is required');
    }

    if (input.replyToMessageId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: input.replyToMessageId, conversationId },
        select: { id: true },
      });
      if (!parent) {
        throw new BadRequestException('replyToMessageId must reference a message in this conversation');
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            id: randomUUID(),
            conversationId,
            senderUserId: actorUserId,
            clientMessageId: input.clientMessageId,
            body,
            replyToMessageId: input.replyToMessageId ?? undefined,
          },
          include: this.messageInclude,
        });

        await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: msg.createdAt },
        });

        return msg;
      });

      const dto = this.mapMessageRow(created);

      this.gateway.emitMessageCreated(conversationId, dto);

      const participants = await this.getParticipantUserIds(conversationId);
      const convRow = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { serviceRequestId: true },
      });

      if (convRow?.serviceRequestId) {
        const bodySnippet = body.length > SNIPPET_LEN ? `${body.slice(0, SNIPPET_LEN)}…` : body;
        const fullHint = {
          conversationId,
          subjectType: 'request' as const,
          subjectId: convRow.serviceRequestId,
          serviceRequestId: convRow.serviceRequestId,
          lastMessageAt: created.createdAt.toISOString(),
          senderUserId: actorUserId,
          bodySnippet,
        };
        for (const uid of participants) {
          if (uid !== actorUserId) {
            this.gateway.emitUnreadHint(uid, fullHint);
          }
        }
      }

      return { message: dto, alreadyExisted: false };
    } catch (error) {
      const isUniqueViolation =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002';
      if (isUniqueViolation) {
        const existing = await this.prisma.message.findFirst({
          where: {
            conversationId,
            senderUserId: actorUserId,
            clientMessageId: input.clientMessageId,
          },
          include: this.messageInclude,
        });
        if (!existing) {
          throw error;
        }
        return { message: this.mapMessageRow(existing), alreadyExisted: true };
      }
      throw error;
    }
  }

}
