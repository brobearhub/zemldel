import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Conversation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanService } from '../billing/plan.service';
import {
  currentInterest,
  lockCustomerInterest,
} from '../favorites/favorite-policy';

export const chatMessageInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      image: true,
    },
  },
  conversation: { select: { kind: true, customerUserId: true } },
  replyTo: {
    select: {
      id: true,
      senderUserId: true,
      body: true,
      sender: { select: { name: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.MessageInclude;

type MessageInput = {
  body: string;
  clientMessageId: string;
  replyToMessageId?: string | null;
};
export class DirectChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlanService,
  ) {}

  async authorize(
    tx: Prisma.TransactionClient,
    userId: string,
    conversation: Pick<Conversation, 'customerUserId' | 'providerId'>,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (!user || user.systemRole === 'PLATFORM_ADMIN')
      throw new ForbiddenException('Нет доступа к диалогу');
    if (conversation.customerUserId === userId) return 'customer' as const;
    const member = await tx.providerMember.findUnique({
      where: {
        providerId_userId: { providerId: conversation.providerId, userId },
      },
    });
    if (member?.status !== 'ACTIVE' || member.role === 'EMPLOYEE')
      throw new ForbiddenException('Нет доступа к диалогу');
    return 'provider' as const;
  }

  assertWritable(
    state: Conversation['directState'],
    side: 'customer' | 'provider',
  ) {
    if (state === 'BLOCKED' || state === 'DECLINED')
      throw new ForbiddenException({
        code: `DIRECT_${state}`,
        message:
          state === 'BLOCKED'
            ? 'Клиент заблокировал прямые обращения'
            : 'Клиент отклонил обращение',
      });
    if (state === 'WAITING' && side === 'provider')
      throw new ForbiddenException({
        code: 'DIRECT_WAITING',
        message:
          'Ожидаем ответ клиента. До ответа можно отправить только одно сообщение.',
      });
  }

  private body(input: MessageInput) {
    const body = input.body.trim();
    if (!body || body.length > 5000)
      throw new BadRequestException(
        'Сообщение должно содержать от 1 до 5000 символов',
      );
    return body;
  }

  async start(
    userId: string,
    providerId: string,
    customerUserId: string,
    input: MessageInput,
  ) {
    const body = this.body(input);
    return this.prisma.$transaction(async (tx) => {
      await lockCustomerInterest(tx, customerUserId, providerId);
      const side = await this.authorize(tx, userId, {
        providerId,
        customerUserId,
      });
      if (side !== 'provider')
        throw new ForbiddenException('Нельзя написать самому себе');
      const existing = await tx.conversation.findFirst({
        where: { providerId, customerUserId, kind: 'DIRECT' },
      });
      if (existing) return { conversationId: existing.id, message: null };
      const { plan } = await this.plans.access(providerId, tx);
      if (plan !== 'BUSINESS')
        throw new ForbiddenException({
          code: 'PLAN_REQUIRED',
          message: 'Начать диалог можно на тарифе Бизнес',
          billingUrl: '/pro/settings/tariff',
        });
      const customer = await tx.user.findUnique({
        where: { id: customerUserId },
        select: { accountKind: true, systemRole: true },
      });
      if (
        !customer ||
        customer.accountKind !== 'CUSTOMER' ||
        customer.systemRole === 'PLATFORM_ADMIN'
      )
        throw new ForbiddenException('Клиент недоступен');
      const interest = await currentInterest(tx, customerUserId, providerId);
      if (!interest.profile && interest.services.length === 0)
        throw new ForbiddenException(
          'Клиент больше не сохраняет ваш профиль или доступные услуги',
        );
      const conversation = await tx.conversation.create({
        data: {
          kind: 'DIRECT',
          directState: 'WAITING',
          providerId,
          customerUserId,
          interestContext: interest,
          lastMessageAt: new Date(),
        },
      });
      // Direct chats are delivered on the site; external messenger outbox remains request-only.
      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: userId,
          body,
          clientMessageId: input.clientMessageId,
        },
        include: chatMessageInclude,
      });
      return { conversationId: conversation.id, message };
    });
  }

  async send(userId: string, conversationId: string, input: MessageInput) {
    const body = this.body(input);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation || conversation.kind !== 'DIRECT')
        throw new NotFoundException('Диалог не найден');
      const side = await this.authorize(tx, userId, conversation);
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
      this.assertWritable(conversation.directState, side);
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
        data: {
          lastMessageAt: message.createdAt,
          ...(side === 'customer' && conversation.directState === 'WAITING'
            ? { directState: 'ACTIVE' }
            : {}),
        },
      });
      return { message, alreadyExisted: false };
    });
  }

  async changeState(
    userId: string,
    conversationId: string,
    action: 'accept' | 'decline' | 'block' | 'resume',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation || conversation.kind !== 'DIRECT')
        throw new NotFoundException('Диалог не найден');
      const side = await this.authorize(tx, userId, conversation);
      if (side !== 'customer')
        throw new ForbiddenException('Действие доступно только клиенту');
      if (
        action === 'accept' &&
        !['WAITING', 'ACTIVE'].includes(conversation.directState ?? '')
      )
        throw new BadRequestException(
          'Сначала возобновите отклонённую или заблокированную переписку',
        );
      if (
        action === 'decline' &&
        !['WAITING', 'DECLINED'].includes(conversation.directState ?? '')
      )
        throw new BadRequestException(
          'Отклонить можно первое обращение до ответа',
        );
      const customerHasReplied =
        action === 'resume' &&
        Boolean(
          await tx.message.findFirst({
            where: {
              conversationId,
              senderUserId: conversation.customerUserId,
              kind: 'USER',
            },
            select: { id: true },
          }),
        );
      const directState =
        action === 'block'
          ? 'BLOCKED'
          : action === 'decline'
            ? 'DECLINED'
            : action === 'accept' || customerHasReplied
              ? 'ACTIVE'
              : 'WAITING';
      await tx.conversation.update({
        where: { id: conversationId },
        data: { directState },
      });
      return { directState };
    });
  }
}
