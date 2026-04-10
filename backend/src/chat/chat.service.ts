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

export type ServiceRequestConversationListItemDto = {
  conversationId: string;
  providerId: string;
  providerName: string;
  lastMessageAt: string | null;
  lastSnippet: string | null;
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
          orderBy: { providerId: 'asc' },
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
      throw new ForbiddenException(
        'Chat is available only for requests linked to a customer account',
      );
    }
  }

  private async getProviderRegionCode(
    providerId: string,
  ): Promise<string | null> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { city: { select: { regionCode: true } } },
    });
    return provider?.city?.regionCode ?? null;
  }

  private async getRequestRegionCode(input: {
    requestCityId: string | null;
    customerCityId: string | null;
  }): Promise<string | null> {
    const effectiveCityId = input.requestCityId ?? input.customerCityId ?? null;
    if (!effectiveCityId) return null;
    const city = await this.prisma.city.findUnique({
      where: { id: effectiveCityId },
      select: { regionCode: true },
    });
    return city?.regionCode ?? null;
  }

  private async assertProviderEligibleForRequest(
    providerId: string,
    req: {
      categoryId: string | null;
      requestCityId: string | null;
      customerCityId: string | null;
    },
  ) {
    const [providerRegion, requestRegion] = await Promise.all([
      this.getProviderRegionCode(providerId),
      this.getRequestRegionCode({
        requestCityId: req.requestCityId,
        customerCityId: req.customerCityId,
      }),
    ]);
    if (!providerRegion || !requestRegion)
      throw new ForbiddenException('Forbidden');
    if (providerRegion !== requestRegion)
      throw new ForbiddenException('Forbidden');

    if (req.categoryId) {
      const eligible = await this.prisma.service.findFirst({
        where: { providerId, status: 'PUBLISHED', categoryId: req.categoryId },
        select: { id: true },
      });
      if (!eligible) throw new ForbiddenException('Forbidden');
    }
  }

  private async getRequestForChat(serviceRequestId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        id: true,
        status: true,
        serviceId: true,
        categoryId: true,
        requestCityId: true,
        providerId: true,
        customerUserId: true,
        customerUser: { select: { customerCityId: true } },
      },
    });
    if (!req) {
      throw new NotFoundException('Service request not found');
    }
    return req;
  }

  private isLockedStatus(status: string) {
    return (
      status === 'ACTIVE' ||
      status === 'COMPLETED' ||
      status === 'CANCELLED'
    );
  }

  private async assertCanAccessRequestConversation(
    userId: string,
    subject: { requestId: string; conversationProviderId: string },
    systemRole: string,
    activeMemberProviderIds: string[],
  ) {
    if (systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Platform admin cannot access customer-provider chats',
      );
    }

    const req = await this.getRequestForChat(subject.requestId);
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });

    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    const isServiceRequest = Boolean(req.serviceId);
    if (isServiceRequest) {
      if (!req.providerId) {
        throw new ForbiddenException('Request has no provider');
      }
      // Access: customer or provider members of the request's provider.
      if (req.customerUserId === userId) {
        return;
      }
      if (activeMemberProviderIds.includes(req.providerId)) {
        if (subject.conversationProviderId !== req.providerId) {
          throw new ForbiddenException('Forbidden');
        }
        return;
      }
      throw new ForbiddenException('Forbidden');
    }

    // FREEFORM / CATEGORY: access is based on the conversation's providerId
    const locked =
      this.isLockedStatus(String(req.status)) &&
      Boolean(req.providerId) &&
      req.providerId !== subject.conversationProviderId;
    if (locked) {
      throw new ForbiddenException('Request is locked');
    }

    if (req.customerUserId === userId) {
      return;
    }

    if (activeMemberProviderIds.includes(subject.conversationProviderId)) {
      await this.assertProviderEligibleForRequest(
        subject.conversationProviderId,
        {
          categoryId: req.categoryId ?? null,
          requestCityId: req.requestCityId ?? null,
          customerCityId: req.customerUser?.customerCityId ?? null,
        },
      );
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
      {
        requestId: conv.serviceRequestId,
        conversationProviderId: conv.providerId,
      },
      user.systemRole,
      memberIds,
    );
  }

  private pickActorProviderId(user: {
    activeProviderId: string | null;
    providerMemberships: Array<{ providerId: string }>;
  }) {
    const memberIds = user.providerMemberships.map((m) => m.providerId);
    if (user.activeProviderId && memberIds.includes(user.activeProviderId)) {
      return user.activeProviderId;
    }
    return memberIds[0] ?? null;
  }

  async ensureServiceRequestConversation(
    actorUserId: string,
    serviceRequestId: string,
  ) {
    const req = await this.getRequestForChat(serviceRequestId);
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });

    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    const user = await this.loadUserChatActor(actorUserId);
    const memberIds = user.providerMemberships.map((m) => m.providerId);

    // SERVICE request: single deterministic provider thread.
    if (req.serviceId) {
      if (!req.providerId) {
        throw new NotFoundException('Request provider not found');
      }

      if (user.systemRole === 'PLATFORM_ADMIN') {
        throw new ForbiddenException(
          'Platform admin cannot access customer-provider chats',
        );
      }

      if (
        req.customerUserId !== actorUserId &&
        !memberIds.includes(req.providerId)
      ) {
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

      return {
        conversationId: conversation.id,
        messages: [] as ChatMessageDto[],
      };
    }

    // FREEFORM / CATEGORY
    if (req.customerUserId === actorUserId) {
      // Customer flow:
      // - if request is already locked to a provider -> open/create the single provider thread
      // - otherwise -> open the latest existing thread (a provider must initiate first)
      if (req.providerId) {
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
            customerUserId: req.customerUserId,
          },
          update: {},
          select: { id: true },
        });

        return {
          conversationId: conversation.id,
          messages: [] as ChatMessageDto[],
        };
      }

      const latest = await this.prisma.conversation.findFirst({
        where: { serviceRequestId: req.id, customerUserId: req.customerUserId! },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });
      if (!latest) {
        throw new ForbiddenException(
          'Пока нет диалогов. Подождите, пока компания ответит.',
        );
      }

      return {
        conversationId: latest.id,
        messages: [] as ChatMessageDto[],
      };
    }

    if (user.systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Platform admin cannot access customer-provider chats',
      );
    }

    const providerId = this.pickActorProviderId(user);
    if (!providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    if (!memberIds.includes(providerId)) {
      throw new ForbiddenException('Forbidden');
    }

    await this.assertProviderEligibleForRequest(providerId, {
      categoryId: req.categoryId ?? null,
      requestCityId: req.requestCityId ?? null,
      customerCityId: req.customerUser?.customerCityId ?? null,
    });

    const locked =
      this.isLockedStatus(String(req.status)) &&
      Boolean(req.providerId) &&
      req.providerId !== providerId;
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

    return {
      conversationId: conversation.id,
      messages: [] as ChatMessageDto[],
    };
  }

  async listServiceRequestConversationsForCustomer(
    actorUserId: string,
    serviceRequestId: string,
  ): Promise<ServiceRequestConversationListItemDto[]> {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { id: true, customerUserId: true, status: true },
    });
    if (!req) {
      throw new NotFoundException('Service request not found');
    }
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });
    if (req.customerUserId !== actorUserId) {
      throw new ForbiddenException('Forbidden');
    }
    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    const rows = await this.prisma.conversation.findMany({
      where: {
        serviceRequestId: req.id,
        customerUserId: actorUserId,
        messages: { some: {} },
      },
      select: {
        id: true,
        providerId: true,
        lastMessageAt: true,
        createdAt: true,
        provider: { select: { name: true } },
        messages: {
          select: { body: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return rows.map((c) => {
      const lastBody = c.messages[0]?.body ?? null;
      const snippet =
        lastBody && lastBody.length > SNIPPET_LEN
          ? `${lastBody.slice(0, SNIPPET_LEN)}…`
          : lastBody;
      const lastAt = c.lastMessageAt ?? c.messages[0]?.createdAt ?? null;
      return {
        conversationId: c.id,
        providerId: c.providerId,
        providerName: c.provider.name,
        lastMessageAt: lastAt ? lastAt.toISOString() : null,
        lastSnippet: snippet,
      };
    });
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
      throw new BadRequestException(
        'Use either before or after cursor, not both',
      );
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

  private async getParticipantUserIds(
    conversationId: string,
  ): Promise<string[]> {
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

    const ids = new Set<string>([
      conv.customerUserId,
      ...members.map((m) => m.userId),
    ]);
    return [...ids];
  }

  async createMessage(
    actorUserId: string,
    conversationId: string,
    input: {
      body: string;
      clientMessageId: string;
      replyToMessageId?: string | null;
    },
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
        throw new BadRequestException(
          'replyToMessageId must reference a message in this conversation',
        );
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
        await this.prisma.serviceRequest.updateMany({
          where: { id: convRow.serviceRequestId, status: 'NEW' },
          data: { status: 'DISCUSSING' },
        });

        const bodySnippet =
          body.length > SNIPPET_LEN ? `${body.slice(0, SNIPPET_LEN)}…` : body;
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
