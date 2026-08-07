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
import { isLockedToOtherProvider } from '../requests/dto/request.dto';
import { ChatGateway } from './chat.gateway';
import type { ChatPresenceUpdatedPayload, ChatViewerSide } from './chat-presence';

const SNIPPET_LEN = 160;
type ChatAccessAction = 'read' | 'write';
export type ChatConversationAccessDto = {
  canRead: true;
  canWrite: boolean;
  reason?: string;
};

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

export type ChatInboxItemDto = {
  serviceRequestId: string;
  title: string;
  lastMessageAt: string | null;
  lastSnippet: string | null;
  unreadCount?: number;
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

  private async getRequestForChat(requestId: string) {
    const req = await this.prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        serviceId: true,
        categoryId: true,
        requestCityId: true,
        providerId: true,
        lockedAt: true,
        customerUserId: true,
        customerUser: { select: { customerCityId: true } },
      },
    });
    if (!req) {
      throw new NotFoundException('Service request not found');
    }
    return req;
  }

  private async assertCanAccessRequestConversation(
    userId: string,
    subject: { requestId: string; conversationProviderId: string },
    action: ChatAccessAction,
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

    const lockedToOtherProvider = isLockedToOtherProvider(
      req,
      subject.conversationProviderId,
    );

    // Archive rule (applies even when serviceId is set after conversion):
    // - customer: forbidden (only chosen provider thread remains)
    // - provider (member of the conversation provider): read allowed, write forbidden
    if (lockedToOtherProvider) {
      const isCustomer = req.customerUserId === userId;
      const isProviderMember = activeMemberProviderIds.includes(
        subject.conversationProviderId,
      );
      if (isCustomer) {
        throw new ForbiddenException('Request is locked');
      }
      if (!isProviderMember) {
        throw new ForbiddenException('Forbidden');
      }
      if (action === 'write') {
        throw new ForbiddenException('Request is locked');
      }
      return;
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
    const isCustomer = req.customerUserId === userId;
    const isProviderMember = activeMemberProviderIds.includes(
      subject.conversationProviderId,
    );

    if (isCustomer) return;
    if (isProviderMember) {
      // Before the request is locked to another provider, providers must still be eligible
      // (region/category matching) to access the conversation.
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

  async assertConversationAccess(
    userId: string,
    conversationId: string,
    action: ChatAccessAction,
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        requestId: true,
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
        requestId: conv.requestId,
        conversationProviderId: conv.providerId,
      },
      action,
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

  private isPrismaP2002(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }

  async listInbox(
    actorUserId: string,
    role: 'customer' | 'provider',
  ): Promise<ChatInboxItemDto[]> {
    const user = await this.loadUserChatActor(actorUserId);
    const memberIds = user.providerMemberships.map((m) => m.providerId);

    if (user.systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Platform admin cannot access customer-provider chats',
      );
    }

    const titleFromRequest = (req: {
      service: { title: string } | null;
      category: { name: string } | null;
    }) => req.service?.title ?? req.category?.name ?? 'Заявка';

    const take = 500;

    if (role === 'provider') {
      const providerId = this.pickActorProviderId(user);
      if (!providerId) {
        throw new ForbiddenException('Active provider is required');
      }
      if (!memberIds.includes(providerId)) {
        throw new ForbiddenException('Forbidden');
      }

      const rows = await this.prisma.conversation.findMany({
        where: {
          providerId,
          messages: { some: {} },
          request: { status: { not: 'CLOSED' } },
        },
        select: {
          requestId: true,
          providerId: true,
          lastMessageAt: true,
          createdAt: true,
          request: {
            select: {
              id: true,
              status: true,
              lockedAt: true,
              providerId: true,
              service: { select: { title: true } },
              category: { select: { name: true } },
            },
          },
          messages: {
            select: { body: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        take,
      });

      const seen = new Set<string>();
      const result: ChatInboxItemDto[] = [];
      for (const c of rows) {
        if (seen.has(c.requestId)) continue;
        seen.add(c.requestId);

        const lastBody = c.messages[0]?.body ?? null;
        const snippet =
          lastBody && lastBody.length > SNIPPET_LEN
            ? `${lastBody.slice(0, SNIPPET_LEN)}…`
            : lastBody;
        const lastAt = c.lastMessageAt ?? c.messages[0]?.createdAt ?? null;

        result.push({
          serviceRequestId: c.requestId,
          title: titleFromRequest(c.request),
          lastMessageAt: lastAt ? lastAt.toISOString() : null,
          lastSnippet: snippet,
        });
      }

      return result;
    }

    // customer
    const rows = await this.prisma.conversation.findMany({
      where: {
        customerUserId: actorUserId,
        messages: { some: {} },
        request: { status: { not: 'CLOSED' } },
      },
      select: {
        requestId: true,
        providerId: true,
        lastMessageAt: true,
        createdAt: true,
        request: {
          select: {
            id: true,
            status: true,
            lockedAt: true,
            providerId: true,
            service: { select: { title: true } },
            category: { select: { name: true } },
          },
        },
        messages: {
          select: { body: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    const seen = new Set<string>();
    const result: ChatInboxItemDto[] = [];
    for (const c of rows) {
      // customer cannot see threads if request is locked to another provider
      if (isLockedToOtherProvider(c.request, c.providerId)) continue;
      if (seen.has(c.requestId)) continue;
      seen.add(c.requestId);

      const lastBody = c.messages[0]?.body ?? null;
      const snippet =
        lastBody && lastBody.length > SNIPPET_LEN
          ? `${lastBody.slice(0, SNIPPET_LEN)}…`
          : lastBody;
      const lastAt = c.lastMessageAt ?? c.messages[0]?.createdAt ?? null;

      result.push({
        serviceRequestId: c.requestId,
        title: titleFromRequest(c.request),
        lastMessageAt: lastAt ? lastAt.toISOString() : null,
        lastSnippet: snippet,
      });
    }

    return result;
  }

  async ensureServiceRequestConversation(
    actorUserId: string,
    requestId: string,
  ) {
    const req = await this.getRequestForChat(requestId);
    this.assertRequestChatEligible({ customerUserId: req.customerUserId });

    if (req.status === 'CLOSED') {
      throw new ForbiddenException('Request is closed');
    }

    const user = await this.loadUserChatActor(actorUserId);
    const memberIds = user.providerMemberships.map((m) => m.providerId);

    if (user.systemRole === 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Platform admin cannot access customer-provider chats',
      );
    }

    // Provider archive flow: allow opening an existing thread even after the request is converted
    // (serviceId may be assigned during conversion for FREEFORM/CATEGORY requests).
    const actorProviderId = this.pickActorProviderId(user);
    if (
      req.customerUserId !== actorUserId &&
      actorProviderId &&
      isLockedToOtherProvider(req, actorProviderId)
    ) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          requestId: req.id,
          providerId: { in: memberIds },
          messages: { some: {} },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });
      if (existing) {
        return {
          conversationId: existing.id,
          messages: [] as ChatMessageDto[],
        };
      }
    }

    // SERVICE request: single deterministic provider thread.
    if (req.serviceId) {
      if (!req.providerId) {
        throw new NotFoundException('Request provider not found');
      }

      if (
        req.customerUserId !== actorUserId &&
        !memberIds.includes(req.providerId)
      ) {
        throw new ForbiddenException('Forbidden');
      }

      const where = {
        requestId_providerId: {
          requestId: req.id,
          providerId: req.providerId,
        },
      } as const;

      let conversation: { id: string } | null = null;
      try {
        conversation = await this.prisma.conversation.upsert({
          where,
          create: {
            id: randomUUID(),
            requestId: req.id,
            providerId: req.providerId,
            customerUserId: req.customerUserId!,
          },
          update: {},
          select: { id: true },
        });
      } catch (error) {
        if (!this.isPrismaP2002(error)) throw error;
        conversation = await this.prisma.conversation.findUnique({
          where,
          select: { id: true },
        });
        if (!conversation) throw error;
      }

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
            requestId_providerId: {
              requestId: req.id,
              providerId: req.providerId,
            },
          },
          create: {
            id: randomUUID(),
            requestId: req.id,
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
        where: {
          requestId: req.id,
          customerUserId: req.customerUserId,
        },
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

    const providerId = this.pickActorProviderId(user);
    if (!providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    if (!memberIds.includes(providerId)) {
      throw new ForbiddenException('Forbidden');
    }

    const lockedToOtherProvider = isLockedToOtherProvider(req, providerId);

    if (lockedToOtherProvider) {
      // For archived provider threads, allow opening ONLY if a conversation already exists (with messages).
      // If activeProviderId isn't set or doesn't match, fall back to any provider membership that has a thread.
      const existing = await this.prisma.conversation.findFirst({
        where: {
          requestId: req.id,
          providerId: { in: memberIds },
          messages: { some: {} },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, providerId: true },
      });
      if (!existing) {
        throw new ForbiddenException('Request is locked');
      }

      // If we found an existing thread under a different provider membership, we still return it
      // (it reflects the provider context in which the user actually communicated).
      return {
        conversationId: existing.id,
        messages: [] as ChatMessageDto[],
      };
    }

    await this.assertProviderEligibleForRequest(providerId, {
      categoryId: req.categoryId ?? null,
      requestCityId: req.requestCityId ?? null,
      customerCityId: req.customerUser?.customerCityId ?? null,
    });

    const where = {
      requestId_providerId: {
        requestId: req.id,
        providerId,
      },
    } as const;

    let conversation: { id: string } | null = null;
    try {
      conversation = await this.prisma.conversation.upsert({
        where,
        create: {
          id: randomUUID(),
          requestId: req.id,
          providerId,
          customerUserId: req.customerUserId!,
        },
        update: {},
        select: { id: true },
      });
    } catch (error) {
      if (!this.isPrismaP2002(error)) throw error;
      conversation = await this.prisma.conversation.findUnique({
        where,
        select: { id: true },
      });
      if (!conversation) throw error;
    }

    return {
      conversationId: conversation.id,
      messages: [] as ChatMessageDto[],
    };
  }

  async listServiceRequestConversationsForCustomer(
    actorUserId: string,
    requestId: string,
  ): Promise<ServiceRequestConversationListItemDto[]> {
    const req = await this.prisma.request.findUnique({
      where: { id: requestId },
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
        requestId: req.id,
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
    await this.assertConversationAccess(actorUserId, conversationId, 'read');

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
    await this.assertConversationAccess(actorUserId, conversationId, 'read');

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

  async getConversationAccess(
    actorUserId: string,
    conversationId: string,
  ): Promise<ChatConversationAccessDto> {
    await this.assertConversationAccess(actorUserId, conversationId, 'read');

    try {
      await this.assertConversationAccess(actorUserId, conversationId, 'write');
      return { canRead: true as const, canWrite: true };
    } catch (error) {
      const reason =
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
          ? error.message
          : 'Forbidden';
      return { canRead: true as const, canWrite: false, reason };
    }
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

  private async getConversationPresencePayload(
    conversationId: string,
  ): Promise<{ payload: ChatPresenceUpdatedPayload; customerUserId: string; providerId: string } | null> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, customerUserId: true, providerId: true },
    });
    if (!conv) {
      return null;
    }

    const members = await this.prisma.providerMember.findMany({
      where: { providerId: conv.providerId, status: 'ACTIVE' },
      select: { userId: true },
    });

    const customerOnline = this.gateway.isUserOnline(conv.customerUserId);
    const providerOnline = members.some((m) => this.gateway.isUserOnline(m.userId));

    return {
      payload: {
        conversationId: conv.id,
        customerOnline,
        providerOnline,
      },
      customerUserId: conv.customerUserId,
      providerId: conv.providerId,
    };
  }

  async getConversationPresenceSnapshot(
    actorUserId: string,
    conversationId: string,
  ): Promise<{ viewerSide: ChatViewerSide; presence: ChatPresenceUpdatedPayload } | null> {
    await this.assertConversationAccess(actorUserId, conversationId, 'read');
    const res = await this.getConversationPresencePayload(conversationId);
    if (!res) return null;
    const viewerSide: ChatViewerSide =
      actorUserId === res.customerUserId ? 'customer' : 'provider';
    return { viewerSide, presence: res.payload };
  }

  async notifyPresenceChanged(userId: string): Promise<void> {
    const memberships = await this.prisma.providerMember.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { providerId: true },
    });
    const providerIds = memberships.map((m) => m.providerId);

    const [customerConvs, providerConvs] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { customerUserId: userId, status: 'OPEN' },
        select: { id: true, customerUserId: true, providerId: true },
      }),
      providerIds.length
        ? this.prisma.conversation.findMany({
            where: { providerId: { in: providerIds }, status: 'OPEN' },
            select: { id: true, customerUserId: true, providerId: true },
          })
        : Promise.resolve([] as Array<{ id: string; customerUserId: string; providerId: string }>),
    ]);

    const convById = new Map<string, { id: string; customerUserId: string; providerId: string }>();
    for (const c of customerConvs) convById.set(c.id, c);
    for (const c of providerConvs) convById.set(c.id, c);
    const conversations = [...convById.values()];
    if (conversations.length === 0) return;

    const uniqProviderIds = [...new Set(conversations.map((c) => c.providerId))];
    const allMembers = await this.prisma.providerMember.findMany({
      where: { providerId: { in: uniqProviderIds }, status: 'ACTIVE' },
      select: { providerId: true, userId: true },
    });
    const memberIdsByProviderId = new Map<string, string[]>();
    for (const m of allMembers) {
      const arr = memberIdsByProviderId.get(m.providerId) ?? [];
      arr.push(m.userId);
      memberIdsByProviderId.set(m.providerId, arr);
    }

    for (const conv of conversations) {
      const memberIds = memberIdsByProviderId.get(conv.providerId) ?? [];
      const payload: ChatPresenceUpdatedPayload = {
        conversationId: conv.id,
        customerOnline: this.gateway.isUserOnline(conv.customerUserId),
        providerOnline: memberIds.some((id) => this.gateway.isUserOnline(id)),
      };
      this.gateway.emitPresenceUpdated(conv.id, payload);
    }
  }

  private async broadcastMessageCreated(input: {
    conversationId: string;
    dto: ChatMessageDto;
    senderUserId: string;
    body: string;
    createdAt: Date;
  }): Promise<void> {
    this.gateway.emitMessageCreated(input.conversationId, input.dto);

    const participants = await this.getParticipantUserIds(input.conversationId);
    const convRow = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      select: { requestId: true },
    });

    if (!convRow?.requestId) {
      return;
    }

    const bodySnippet =
      input.body.length > SNIPPET_LEN
        ? `${input.body.slice(0, SNIPPET_LEN)}…`
        : input.body;
    const fullHint = {
      conversationId: input.conversationId,
      subjectType: 'request' as const,
      subjectId: convRow.requestId,
      requestId: convRow.requestId,
      lastMessageAt: input.createdAt.toISOString(),
      senderUserId: input.senderUserId,
      bodySnippet,
    };
    for (const uid of participants) {
      if (uid !== input.senderUserId) {
        this.gateway.emitUnreadHint(uid, fullHint);
      }
    }
  }

  /**
   * Why: messages created outside createMessage (e.g. decline-offer side-effect)
   * still need the same realtime fan-out, otherwise clients only see them after reload.
   */
  async notifyMessageCreated(messageId: string): Promise<void> {
    const row = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: this.messageInclude,
    });
    if (!row) {
      return;
    }

    await this.broadcastMessageCreated({
      conversationId: row.conversationId,
      dto: this.mapMessageRow(row),
      senderUserId: row.senderUserId,
      body: row.body,
      createdAt: row.createdAt,
    });
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
    await this.assertConversationAccess(actorUserId, conversationId, 'write');

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

      await this.broadcastMessageCreated({
        conversationId,
        dto,
        senderUserId: actorUserId,
        body,
        createdAt: created.createdAt,
      });

      const convRow = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { requestId: true },
      });

      if (convRow?.requestId) {
        await this.prisma.request.updateMany({
          where: { id: convRow.requestId, status: 'NEW' },
          data: { status: 'DISCUSSING' },
        });
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
