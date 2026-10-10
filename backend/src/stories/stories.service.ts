import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import {
  buildHourlyViewChart,
  computeStoryExpiresAt,
  isStoryExpired,
  isStoryInFeed,
  mergeCityFirstStories,
  normalizeStoryText,
  orderStoryFeed,
  parseStoryDurationDays,
  resolveInsightsTimeZone,
  storyFeedReason,
  type StoryFeedReason,
  STORY_FEED_LIMIT,
  STORY_IMAGE_MAX_BYTES,
} from './story-rules';
import { buildInbox, parseConversationId, storyInboxKey, type InboxReplyRow, type InboxScope } from './story-inbox';

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storyInclude = {
  authorUser: { select: { name: true, image: true, profilePublic: true } },
  provider: { select: { name: true, slug: true, image: true } },
} satisfies Prisma.StoryInclude;

type StoryRow = Prisma.StoryGetPayload<{ include: typeof storyInclude }>;

export type StoryDto = {
  id: string;
  authorType: 'USER' | 'PROVIDER';
    authorUserId: string;
    providerId: string | null;
    authorName: string;
    authorImageUrl: string | null;
  authorHref: string | null;
  cityId: string | null;
  text: string;
  imageUrl: string | null;
  durationDays: number;
  publishedAt: string;
  expiresAt: string;
  expired: boolean;
  inFeed: boolean;
  feedReason: StoryFeedReason;
  viewed: boolean;
  saved: boolean;
  following: boolean;
  sourceStoryId: string | null;
};

export type StoryListDto = {
  items: StoryDto[];
};

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function sniffImageExt(buf: Buffer, mimeType: string) {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  if (mimeType === 'image/png') {
    if (
      buf.length >= 8 &&
      buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return '.png';
    }
    return null;
  }
  if (mimeType === 'image/jpeg') {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return '.jpg';
    }
    return null;
  }
  if (mimeType === 'image/webp') {
    if (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return '.webp';
    }
    return null;
  }
  return null;
}

function tryExtractKeyFromPublicUrl(input: { url: string; baseUrl: string }) {
  try {
    const u = new URL(input.url);
    const b = new URL(input.baseUrl);
    if (u.origin !== b.origin) return null;
    const key = u.pathname.replace(/^\//, '');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

type StoryViewerFlags = {
  viewed?: boolean;
  saved?: boolean;
  following?: boolean;
};

function toDto(row: StoryRow, now = new Date(), flags: StoryViewerFlags = {}): StoryDto {
  const isProvider = row.authorType === 'PROVIDER' && row.provider;
  const profilePublic = row.authorUser.profilePublic === true;
  return {
    id: row.id,
    authorType: row.authorType,
    authorUserId: row.authorUserId,
    providerId: row.providerId,
    authorName: isProvider
      ? row.provider?.name?.trim() || 'Провайдер'
      : row.authorUser.name?.trim() || 'Пользователь',
    authorImageUrl: isProvider ? (row.provider?.image ?? null) : (row.authorUser.image ?? null),
    authorHref: isProvider && row.provider?.slug
      ? `/providers/${row.provider.slug}`
      : !isProvider && profilePublic
        ? `/users/${row.authorUserId}`
        : null,
    cityId: row.cityId,
    text: row.text,
    imageUrl: row.imageUrl,
    durationDays: row.durationDays,
    publishedAt: row.publishedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    expired: isStoryExpired(row.expiresAt, now),
    inFeed: isStoryInFeed({ expiresAt: row.expiresAt, withdrawnAt: row.withdrawnAt ?? null }, now),
    feedReason: storyFeedReason({ expiresAt: row.expiresAt, withdrawnAt: row.withdrawnAt ?? null }, now),
    viewed: flags.viewed ?? false,
    saved: flags.saved ?? false,
    following: flags.following ?? false,
    sourceStoryId: row.sourceStoryId ?? null,
  };
}

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async listPublic(
    cityId?: string | null,
    viewerUserId?: string | null,
    providerId?: string | null,
    scope: InboxScope = 'user',
  ): Promise<StoryListDto> {
    const now = new Date();
    const scopedProviderId = providerId?.trim() || null;
    if (scopedProviderId) {
      return this.listProviderPublic({
        providerId: scopedProviderId,
        viewerUserId: viewerUserId ?? null,
        now,
      });
    }

    const baseWhere = { withdrawnAt: null, expiresAt: { gt: now } };
    if (viewerUserId) {
      return this.listPublicForViewer({ cityId: cityId ?? null, viewerUserId, scope, now, baseWhere });
    }

    if (!cityId) {
      const rows = await this.prisma.story.findMany({
        where: baseWhere,
        orderBy: { publishedAt: 'desc' },
        take: STORY_FEED_LIMIT,
        include: storyInclude,
      });
      return { items: rows.map((row) => toDto(row, now)) };
    }

    const [cityStories, otherStories] = await Promise.all([
      this.prisma.story.findMany({
        where: { ...baseWhere, cityId },
        orderBy: { publishedAt: 'desc' },
        take: STORY_FEED_LIMIT,
        include: storyInclude,
      }),
      this.prisma.story.findMany({
        where: { ...baseWhere, OR: [{ cityId: null }, { cityId: { not: cityId } }] },
        orderBy: { publishedAt: 'desc' },
        take: STORY_FEED_LIMIT,
        include: storyInclude,
      }),
    ]);

    return {
      items: mergeCityFirstStories(cityStories, otherStories, STORY_FEED_LIMIT).map((row) =>
        toDto(row, now),
      ),
    };
  }

  async listMine(input: { actorUserId: string; scope: 'user' | 'provider' }): Promise<StoryListDto> {
    const now = new Date();
    if (input.scope === 'provider') {
      const membership = await this.requireActiveMembership(input.actorUserId);
      const rows = await this.prisma.story.findMany({
        where: { authorType: 'PROVIDER', providerId: membership.providerId },
        orderBy: { publishedAt: 'desc' },
        include: storyInclude,
      });
      return { items: rows.map((row) => toDto(row, now)) };
    }

    const rows = await this.prisma.story.findMany({
      where: { authorType: 'USER', authorUserId: input.actorUserId },
      orderBy: { publishedAt: 'desc' },
      include: storyInclude,
    });
    return { items: rows.map((row) => toDto(row, now)) };
  }

  async create(input: {
    actorUserId: string;
    scope: 'user' | 'provider';
    text: string;
    durationDays: unknown;
    file?: Express.Multer.File;
  }): Promise<StoryDto> {
    const text = normalizeStoryText(input.text);
    if (!text) {
      throw new BadRequestException('text is required');
    }

    const durationDays = parseStoryDurationDays(input.durationDays);
    if (!durationDays) {
      throw new BadRequestException('durationDays must be 1, 2, 3 or 7');
    }

    const publishedAt = new Date();
    const expiresAt = computeStoryExpiresAt(publishedAt, durationDays);
    const id = randomUUID();
    const imageUrl = input.file ? await this.uploadStoryImage(id, input.file) : null;

    try {
      if (input.scope === 'provider') {
        const membership = await this.requireActiveMembership(input.actorUserId);
        const row = await this.prisma.story.create({
          data: {
            id,
            authorType: 'PROVIDER',
            authorUserId: input.actorUserId,
            providerId: membership.providerId,
            cityId: membership.provider.cityId,
            text,
            imageUrl,
            durationDays,
            publishedAt,
            expiresAt,
          },
          include: storyInclude,
        });
        return toDto(row, publishedAt);
      }

      const user = await this.prisma.user.findUnique({
        where: { id: input.actorUserId },
        select: { id: true, customerCityId: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const row = await this.prisma.story.create({
        data: {
          id,
          authorType: 'USER',
          authorUserId: input.actorUserId,
          providerId: null,
          cityId: user.customerCityId,
          text,
          imageUrl,
          durationDays,
          publishedAt,
          expiresAt,
        },
        include: storyInclude,
      });
      await this.prisma.user.update({
        where: { id: input.actorUserId },
        data: { profilePublic: true },
      });
      return toDto(row, publishedAt);
    } catch (error) {
      if (imageUrl) {
        await this.deleteStoryObject(imageUrl);
      }
      throw error;
    }
  }

  async remove(input: { actorUserId: string; storyId: string }): Promise<{ ok: true }> {
    const story = await this.prisma.story.findUnique({
      where: { id: input.storyId },
      select: {
        id: true,
        authorType: true,
        authorUserId: true,
        providerId: true,
        withdrawnAt: true,
      },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.authorType === 'USER') {
      if (story.authorUserId !== input.actorUserId) {
        throw new ForbiddenException('Story access denied');
      }
    } else {
      if (!story.providerId) {
        throw new ForbiddenException('Story access denied');
      }
      await this.requireActiveMembership(input.actorUserId, story.providerId);
    }

    if (!story.withdrawnAt) {
      await this.prisma.story.update({
        where: { id: story.id },
        data: { withdrawnAt: new Date() },
      });
    }
    return { ok: true };
  }

  async listSaved(actorUserId: string, scope: InboxScope = 'user'): Promise<StoryListDto> {
    const now = new Date();
    const cabinet = await this.resolveCabinet(actorUserId, scope);
    const saves = await this.prisma.storySave.findMany({
      where: {
        removedAt: null,
        ...(cabinet.providerId
          ? { providerId: cabinet.providerId }
          : { userId: actorUserId, providerId: null }),
      },
      orderBy: { savedAt: 'desc' },
      include: { story: { include: storyInclude } },
    });
    return {
      items: saves.map((save) => toDto(save.story, now, { saved: true, viewed: true })),
    };
  }

  async recordView(input: { storyId: string; actorUserId: string | null; scope?: InboxScope }) {
    const story = await this.requireStory(input.storyId);
    if (input.actorUserId && (await this.isStoryAuthor(input.actorUserId, story))) {
      return { ok: true as const, counted: false };
    }
    const cabinet = input.actorUserId ? await this.resolveCabinet(input.actorUserId, input.scope ?? 'user') : null;
    const cityId = cabinet?.provider
      ? cabinet.provider.cityId
      : input.actorUserId
        ? await this.viewerCityId(input.actorUserId)
        : null;
    await this.prisma.storyViewEvent.create({
      data: {
        id: randomUUID(),
        storyId: story.id,
        userId: cabinet?.providerId ? null : input.actorUserId,
        providerId: cabinet?.providerId ?? null,
        cityId,
      },
    });
    return { ok: true as const, counted: true };
  }

  async saveStory(input: { storyId: string; actorUserId: string; scope?: InboxScope }) {
    const story = await this.requireStory(input.storyId);
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    if (this.isOwnInScope(input.actorUserId, story, cabinet.providerId)) {
      throw new BadRequestException('Cannot save own story');
    }
    const where = cabinet.providerId
      ? { storyId: story.id, providerId: cabinet.providerId }
      : { storyId: story.id, userId: input.actorUserId, providerId: null };
    const existing = await this.prisma.storySave.findFirst({ where });
    if (existing) {
      await this.prisma.storySave.update({
        where: { id: existing.id },
        data: { removedAt: null, savedAt: new Date() },
      });
    } else {
      await this.prisma.storySave.create({
        data: {
          id: randomUUID(),
          storyId: story.id,
          userId: input.actorUserId,
          providerId: cabinet.providerId,
        },
      });
    }
    return { ok: true as const };
  }

  async unsaveStory(input: { storyId: string; actorUserId: string; scope?: InboxScope }) {
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    await this.prisma.storySave.updateMany({
      where: {
        storyId: input.storyId,
        removedAt: null,
        ...(cabinet.providerId
          ? { providerId: cabinet.providerId }
          : { userId: input.actorUserId, providerId: null }),
      },
      data: { removedAt: new Date() },
    });
    return { ok: true as const };
  }

  async followAuthor(input: {
    actorUserId: string;
    scope?: InboxScope;
    targetUserId?: string | null;
    targetProviderId?: string | null;
  }) {
    const target = this.followTarget(input);
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    if (!cabinet.providerId && target.targetUserId === input.actorUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    if (cabinet.providerId && target.targetProviderId === cabinet.providerId) {
      throw new BadRequestException('Cannot follow own provider');
    }
    if (!cabinet.providerId && target.targetProviderId) {
      const membership = await this.prisma.providerMember.findFirst({
        where: {
          userId: input.actorUserId,
          providerId: target.targetProviderId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (membership) {
        throw new BadRequestException('Cannot follow own provider');
      }
    }
    const follower = { followerUserId: input.actorUserId, followerProviderId: cabinet.providerId };
    const existing = await this.prisma.storyAuthorFollow.findFirst({
      where: cabinet.providerId
        ? { followerProviderId: cabinet.providerId, ...target }
        : { followerUserId: input.actorUserId, followerProviderId: null, ...target },
    });
    if (existing) {
      await this.prisma.storyAuthorFollow.update({
        where: { id: existing.id },
        data: { removedAt: null },
      });
    } else {
      await this.prisma.storyAuthorFollow.create({
        data: {
          id: randomUUID(),
          ...follower,
          ...target,
        },
      });
    }
    return { ok: true as const };
  }

  async unfollowAuthor(input: {
    actorUserId: string;
    scope?: InboxScope;
    targetUserId?: string | null;
    targetProviderId?: string | null;
  }) {
    const target = this.followTarget(input);
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    const existing = await this.prisma.storyAuthorFollow.findFirst({
      where: {
        ...(cabinet.providerId
          ? { followerProviderId: cabinet.providerId }
          : { followerUserId: input.actorUserId, followerProviderId: null }),
        ...target,
        removedAt: null,
      },
    });
    if (!existing) return { ok: true as const };
    const now = new Date();
    await this.prisma.storyAuthorFollow.update({
      where: { id: existing.id },
      data: { removedAt: now },
    });
    await this.prisma.storyAuthorUnfollow.create({
      data: {
        id: randomUUID(),
        followerUserId: input.actorUserId,
        followerProviderId: cabinet.providerId,
        unfollowedAt: now,
        ...target,
      },
    });
    return { ok: true as const };
  }

  async reply(input: { storyId: string; actorUserId: string; text: string; scope?: InboxScope }) {
    const story = await this.requireStory(input.storyId);
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    if (this.isOwnInScope(input.actorUserId, story, cabinet.providerId)) {
      throw new BadRequestException('Cannot reply to own story');
    }
    const text = normalizeStoryText(input.text);
    if (!text) throw new BadRequestException('text is required');
    const row = await this.prisma.storyReply.create({
      data: {
        id: randomUUID(),
        storyId: story.id,
        authorType: cabinet.providerId ? 'PROVIDER' : 'USER',
        authorUserId: input.actorUserId,
        providerId: cabinet.providerId,
        text,
      },
    });
    return { id: row.id, text: row.text, createdAt: row.createdAt.toISOString() };
  }

  async listComments(input: { storyId: string; actorUserId: string | null; scope?: InboxScope }) {
    const story = await this.requireStory(input.storyId);
    const cabinet = input.actorUserId
      ? await this.resolveCabinet(input.actorUserId, input.scope ?? 'user')
      : null;
    const rows = await this.prisma.storyComment.findMany({
      where: { storyId: story.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        author: { select: { name: true } },
        provider: { select: { name: true } },
        likes: { select: { userId: true } },
      },
    });
    const items = rows.reverse().map((row) => this.toCommentDto(row, input.actorUserId, cabinet?.providerId ?? null));
    return { items, truncated: rows.length === 100 };
  }

  async comment(input: { storyId: string; actorUserId: string; text: string; scope?: InboxScope }) {
    const story = await this.requireStory(input.storyId);
    const cabinet = await this.resolveCabinet(input.actorUserId, input.scope ?? 'user');
    const text = normalizeStoryText(input.text);
    if (!text) throw new BadRequestException('text is required');
    const row = await this.prisma.storyComment.create({
      data: {
        id: randomUUID(),
        storyId: story.id,
        authorType: cabinet.providerId ? 'PROVIDER' : 'USER',
        authorUserId: input.actorUserId,
        providerId: cabinet.providerId,
        text,
      },
      include: {
        author: { select: { name: true } },
        provider: { select: { name: true } },
        likes: { select: { userId: true } },
      },
    });
    return this.toCommentDto(row, input.actorUserId, cabinet.providerId);
  }

  async updateComment(input: { storyId: string; commentId: string; actorUserId: string; text: string }) {
    const comment = await this.requireComment(input.storyId, input.commentId);
    if (!(await this.canEditComment(input.actorUserId, comment))) {
      throw new ForbiddenException('Story access denied');
    }
    const text = normalizeStoryText(input.text);
    if (!text) throw new BadRequestException('text is required');
    const row = await this.prisma.storyComment.update({
      where: { id: comment.id },
      data: { text },
      include: {
        author: { select: { name: true } },
        provider: { select: { name: true } },
        likes: { select: { userId: true } },
      },
    });
    const cabinetProviderId = comment.authorType === 'PROVIDER' ? comment.providerId : null;
    return this.toCommentDto(row, input.actorUserId, cabinetProviderId);
  }

  async deleteComment(input: { storyId: string; commentId: string; actorUserId: string }) {
    const comment = await this.requireComment(input.storyId, input.commentId);
    const story = await this.requireStory(input.storyId);
    const canEdit = await this.canEditComment(input.actorUserId, comment);
    const author = await this.isStoryAuthor(input.actorUserId, story);
    if (!canEdit && !author) throw new ForbiddenException('Story access denied');
    await this.prisma.storyComment.delete({ where: { id: comment.id } });
    return { ok: true as const };
  }

  async likeComment(input: { storyId: string; commentId: string; actorUserId: string }) {
    const comment = await this.requireComment(input.storyId, input.commentId);
    if (comment.authorUserId === input.actorUserId) {
      throw new ForbiddenException('Story access denied');
    }
    await this.prisma.storyCommentLike.upsert({
      where: { commentId_userId: { commentId: comment.id, userId: input.actorUserId } },
      create: { id: randomUUID(), commentId: comment.id, userId: input.actorUserId },
      update: {},
    });
    return { ok: true as const };
  }

  async unlikeComment(input: { storyId: string; commentId: string; actorUserId: string }) {
    const comment = await this.requireComment(input.storyId, input.commentId);
    await this.prisma.storyCommentLike.deleteMany({
      where: { commentId: comment.id, userId: input.actorUserId },
    });
    return { ok: true as const };
  }

  async listReplyMessages(input: { storyId: string; replyId: string; actorUserId: string }) {
    const { reply } = await this.requireReplyParticipant(input);
    const rows = await this.prisma.storyReplyMessage.findMany({
      where: { storyReplyId: reply.id },
      orderBy: { createdAt: 'asc' },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        text: row.text,
        createdAt: row.createdAt.toISOString(),
        mine: row.senderUserId === input.actorUserId,
      })),
    };
  }

  async sendReplyMessage(input: { storyId: string; replyId: string; actorUserId: string; text: string }) {
    const { reply } = await this.requireReplyParticipant(input);
    const text = normalizeStoryText(input.text);
    if (!text) throw new BadRequestException('text is required');
    const row = await this.prisma.storyReplyMessage.create({
      data: {
        id: randomUUID(),
        storyReplyId: reply.id,
        senderUserId: input.actorUserId,
        text,
      },
    });
    return {
      id: row.id,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      mine: true,
    };
  }

  async listConversations(input: { actorUserId: string; scope: InboxScope }) {
    const { conversations, selfImageUrl } = await this.loadInbox(input);
    return {
      selfImageUrl,
      items: conversations.map((conversation) => ({
        id: conversation.id,
        name: conversation.name,
        imageUrl: conversation.imageUrl,
        cityName: conversation.cityName,
        storyTitles: conversation.storyTitles,
        preview: conversation.preview,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
      })),
    };
  }

  async listConversationMessages(input: { actorUserId: string; scope: InboxScope; conversationId: string }) {
    const loaded = await this.loadInbox(input);
    const conversation = this.requireInboxConversation(loaded.conversations, input.conversationId);
    const now = new Date();
    await this.prisma.storyConversationRead.upsert({
      where: {
        userId_inboxKey_counterpartKey: {
          userId: input.actorUserId,
          inboxKey: loaded.inboxKey,
          counterpartKey: conversation.id,
        },
      },
      create: {
        id: randomUUID(),
        userId: input.actorUserId,
        inboxKey: loaded.inboxKey,
        counterpartKey: conversation.id,
        lastReadAt: now,
      },
      update: { lastReadAt: now },
    });
    return { items: conversation.messages };
  }

  async sendConversationMessage(input: {
    actorUserId: string;
    scope: InboxScope;
    conversationId: string;
    text: string;
  }) {
    const text = normalizeStoryText(input.text);
    if (!text) throw new BadRequestException('text is required');
    const loaded = await this.loadInbox(input);
    const conversation = this.requireInboxConversation(loaded.conversations, input.conversationId);
    const row = await this.prisma.storyReplyMessage.create({
      data: {
        id: randomUUID(),
        storyReplyId: conversation.latestReplyId,
        senderUserId: input.actorUserId,
        text,
      },
    });
    return {
      id: row.id,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      mine: true,
      imageUrl: loaded.selfImageUrl,
      storyId: conversation.messages.find((message) => message.id === conversation.latestReplyId)?.storyId
        ?? conversation.messages.at(-1)?.storyId
        ?? '',
      storyText:
        conversation.messages.find((message) => message.id === conversation.latestReplyId)?.storyText
        ?? conversation.messages.at(-1)?.storyText
        ?? '',
    };
  }

  async repost(_input: { storyId: string; actorUserId: string; durationDays: unknown }): Promise<never> {
    throw new NotFoundException('Repost is unavailable');
  }

  async recordProfileOpen(input: { storyId: string; actorUserId: string | null; scope?: InboxScope }) {
    const story = await this.prisma.story.findUnique({
      where: { id: input.storyId },
      include: storyInclude,
    });
    if (!story) throw new NotFoundException('Story not found');
    const isProvider = story.authorType === 'PROVIDER';
    if (!isProvider && story.authorUser.profilePublic !== true) {
      return { ok: true as const, counted: false };
    }
    const cabinet = input.actorUserId ? await this.resolveCabinet(input.actorUserId, input.scope ?? 'user') : null;
    await this.prisma.storyProfileOpen.create({
      data: {
        id: randomUUID(),
        storyId: story.id,
        userId: cabinet?.providerId ? null : input.actorUserId,
        providerId: cabinet?.providerId ?? null,
      },
    });
    return { ok: true as const, counted: true };
  }

  async listAudience(input: { actorUserId: string; scope: 'user' | 'provider' }) {
    const providerId =
      input.scope === 'provider' ? (await this.requireActiveMembership(input.actorUserId)).providerId : null;
    const target = providerId ? { targetProviderId: providerId } : { targetUserId: input.actorUserId };
    const storyWhere = providerId
      ? { authorType: 'PROVIDER' as const, providerId }
      : { authorType: 'USER' as const, authorUserId: input.actorUserId };
    const [follows, unfollows, replyCount] = await Promise.all([
      this.prisma.storyAuthorFollow.findMany({
        where: { ...target, removedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          follower: { select: { id: true, name: true } },
          followerProvider: { select: { id: true, name: true } },
        },
      }),
      this.prisma.storyAuthorUnfollow.findMany({
        where: target,
        orderBy: { unfollowedAt: 'desc' },
        include: {
          follower: { select: { id: true, name: true } },
          followerProvider: { select: { id: true, name: true } },
        },
      }),
      this.prisma.storyReply.count({ where: { story: storyWhere } }),
    ]);
    return {
      followers: follows.map((row) => ({
        userId: row.followerProvider?.id ?? row.follower.id,
        name: row.followerProvider?.name?.trim() || row.follower.name?.trim() || 'Пользователь',
        at: row.createdAt.toISOString(),
      })),
      unfollows: unfollows.map((row) => ({
        userId: row.followerProvider?.id ?? row.follower.id,
        name: row.followerProvider?.name?.trim() || row.follower.name?.trim() || 'Пользователь',
        at: row.unfollowedAt.toISOString(),
      })),
      replyCount,
    };
  }

  async insights(input: { storyId: string; actorUserId: string; timeZone?: string | null }) {
    const story = await this.requireStory(input.storyId);
    if (!(await this.isStoryAuthor(input.actorUserId, story))) {
      throw new ForbiddenException('Story access denied');
    }
    const [views, opens, replies, reposts, saves, comments] = await Promise.all([
      this.prisma.storyViewEvent.findMany({
        where: { storyId: story.id },
        orderBy: { viewedAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
        },
      }),
      this.prisma.storyProfileOpen.findMany({
        where: { storyId: story.id },
        orderBy: { openedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, customerCity: { select: { name: true } } } },
          provider: { select: { id: true, name: true, city: { select: { name: true } } } },
        },
      }),
      this.prisma.storyReply.findMany({
        where: { storyId: story.id },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, customerCity: { select: { name: true } } } },
          provider: { select: { name: true, city: { select: { name: true } } } },
        },
      }),
      this.prisma.story.findMany({
        where: { sourceStoryId: story.id },
        orderBy: { publishedAt: 'desc' },
        include: { authorUser: { select: { id: true, name: true } } },
      }),
      this.prisma.storySave.findMany({
        where: { storyId: story.id, removedAt: null },
        orderBy: { savedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, customerCity: { select: { name: true } } } },
          provider: { select: { id: true, name: true, city: { select: { name: true } } } },
        },
      }),
      this.prisma.storyComment.findMany({
        where: { storyId: story.id },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { name: true } },
          provider: { select: { name: true } },
          _count: { select: { likes: true } },
        },
      }),
    ]);

    const loggedInViews = views.filter((view) => view.userId || view.providerId);
    const guestViews = views.filter((view) => !view.userId && !view.providerId);
    const viewers = new Map<
      string,
      { name: string; viewCount: number; lastViewedAt: Date; cityName: string | null }
    >();
    for (const view of loggedInViews) {
      const key = view.providerId ? `provider:${view.providerId}` : view.userId;
      if (!key) continue;
      const name = view.provider?.name?.trim() || view.user?.name?.trim() || 'Пользователь';
      const current = viewers.get(key) ?? {
        name,
        viewCount: 0,
        lastViewedAt: view.viewedAt,
        cityName: view.city?.name ?? null,
      };
      current.viewCount += 1;
      if (view.viewedAt >= current.lastViewedAt) {
        current.lastViewedAt = view.viewedAt;
        current.cityName = view.city?.name ?? null;
      }
      viewers.set(key, current);
    }

    const cities = new Map<string, { name: string; viewCount: number; people: Set<string> }>();
    for (const view of loggedInViews) {
      const key = view.cityId ?? 'unknown';
      const bucket = cities.get(key) ?? {
        name: view.city?.name ?? 'Город не указан',
        viewCount: 0,
        people: new Set<string>(),
      };
      bucket.viewCount += 1;
      const personKey = view.providerId ?? view.userId;
      if (personKey) bucket.people.add(personKey);
      cities.set(key, bucket);
    }

    const leftAt = story.withdrawnAt ?? (isStoryExpired(story.expiresAt) ? story.expiresAt : new Date());
    const chartEnd = leftAt.getTime() < Date.now() ? leftAt : new Date();

    return {
      viewCount: views.length,
      guestViewCount: guestViews.length,
      uniqueViewerCount: viewers.size,
      hourly: buildHourlyViewChart({
        from: story.publishedAt,
        to: chartEnd,
        viewedAt: views.map((view) => view.viewedAt),
        timeZone: resolveInsightsTimeZone(input.timeZone),
      }),
      viewers: [...viewers.entries()].map(([userId, viewer]) => ({
        userId,
        name: viewer.name,
        viewCount: viewer.viewCount,
        lastViewedAt: viewer.lastViewedAt.toISOString(),
        cityName: viewer.cityName,
      })),
      guestViews: guestViews.map((view) => ({ viewedAt: view.viewedAt.toISOString() })).reverse(),
      cities: [...cities.values()].map((city) => ({
        name: city.name,
        viewCount: city.viewCount,
        uniqueViewerCount: city.people.size,
      })),
      profileOpenCount: opens.length,
      guestProfileOpenCount: opens.filter((open) => !open.userId && !open.providerId).length,
      profileOpens: opens
        .filter((open) => open.user || open.provider)
        .map((open) => ({
          userId: open.provider?.id ?? open.user?.id ?? '',
          name: open.provider?.name?.trim() || open.user?.name?.trim() || 'Пользователь',
          cityName: open.provider?.city?.name ?? open.user?.customerCity?.name ?? null,
          openedAt: open.openedAt.toISOString(),
        })),
      guestProfileOpens: opens
        .filter((open) => !open.userId && !open.providerId)
        .map((open) => ({ openedAt: open.openedAt.toISOString() })),
      replies: replies.map((reply) => ({
        id: reply.id,
        authorUserId: reply.author.id,
        text: reply.text,
        name: reply.provider?.name?.trim() || reply.author.name?.trim() || 'Пользователь',
        cityName: reply.provider?.city?.name ?? reply.author.customerCity?.name ?? null,
        createdAt: reply.createdAt.toISOString(),
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        name: comment.provider?.name?.trim() || comment.author.name?.trim() || 'Пользователь',
        likeCount: comment._count.likes,
        createdAt: comment.createdAt.toISOString(),
      })),
      reposts: reposts.map((repost) => ({
        storyId: repost.id,
        name: repost.authorUser.name?.trim() || 'Пользователь',
        text: repost.text,
        publishedAt: repost.publishedAt.toISOString(),
      })),
      saveCount: saves.length,
      saves: saves.map((save) => ({
        userId: save.provider?.id ?? save.user.id,
        name: save.provider?.name?.trim() || save.user.name?.trim() || 'Пользователь',
        cityName: save.provider?.city?.name ?? save.user.customerCity?.name ?? null,
        savedAt: save.savedAt.toISOString(),
      })),
    };
  }

  private async listProviderPublic(input: {
    providerId: string;
    viewerUserId: string | null;
    now: Date;
  }): Promise<StoryListDto> {
    if (!this.isUuid(input.providerId)) return { items: [] };

    const rows = await this.prisma.story.findMany({
      where: {
        withdrawnAt: null,
        expiresAt: { gt: input.now },
        authorType: 'PROVIDER',
        providerId: input.providerId,
      },
      orderBy: { publishedAt: 'desc' },
      take: STORY_FEED_LIMIT,
      include: storyInclude,
    });
    if (!input.viewerUserId) {
      return { items: rows.map((row) => toDto(row, input.now)) };
    }

    const viewer = await this.loadViewerContext(input.viewerUserId);
    return {
      items: rows.map((row) =>
        toDto(row, input.now, {
          viewed: this.rowIsViewed(row, viewer),
          following: this.rowIsFollowed(row, viewer),
          saved: viewer.savedIds.has(row.id),
        }),
      ),
    };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private async listPublicForViewer(input: {
    cityId: string | null;
    viewerUserId: string;
    scope: InboxScope;
    now: Date;
    baseWhere: Prisma.StoryWhereInput;
  }): Promise<StoryListDto> {
    const viewer = await this.loadViewerContext(input.viewerUserId, input.scope);
    const followedWhere = this.followedWhere(viewer);
    const followedRows = followedWhere
      ? await this.prisma.story.findMany({
          where: { AND: [input.baseWhere, followedWhere] },
          orderBy: { publishedAt: 'desc' },
          take: STORY_FEED_LIMIT,
          include: storyInclude,
        })
      : [];
    const restWhere = followedWhere ? { AND: [input.baseWhere, { NOT: followedWhere }] } : input.baseWhere;
    const [cityStories, otherStories] = input.cityId
      ? await Promise.all([
          this.prisma.story.findMany({
            where: { AND: [restWhere, { cityId: input.cityId }] },
            orderBy: { publishedAt: 'desc' },
            take: STORY_FEED_LIMIT,
            include: storyInclude,
          }),
          this.prisma.story.findMany({
            where: { AND: [restWhere, { OR: [{ cityId: null }, { cityId: { not: input.cityId } }] }] },
            orderBy: { publishedAt: 'desc' },
            take: STORY_FEED_LIMIT,
            include: storyInclude,
          }),
        ])
      : [
          [],
          await this.prisma.story.findMany({
            where: restWhere,
            orderBy: { publishedAt: 'desc' },
            take: STORY_FEED_LIMIT,
            include: storyInclude,
          }),
        ];

    const rows = [...followedRows, ...cityStories, ...otherStories];
    const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
    const ordered = orderStoryFeed(
      unique.map((row) => ({
        id: row.id,
        publishedAt: row.publishedAt.getTime(),
        cityId: row.cityId,
        followed: this.rowIsFollowed(row, viewer),
        viewed: this.rowIsViewed(row, viewer),
      })),
      input.cityId,
    );
    const byId = new Map(unique.map((row) => [row.id, row]));
    return {
      items: ordered.flatMap((item) => {
        const row = byId.get(item.id);
        if (!row) return [];
        return [
          toDto(row, input.now, {
            viewed: item.viewed,
            following: item.followed,
            saved: viewer.savedIds.has(row.id),
          }),
        ];
      }),
    };
  }

  private async loadViewerContext(userId: string, scope: InboxScope = 'user') {
    const cabinet = await this.resolveCabinet(userId, scope);
    const followWhere = cabinet.providerId
      ? { followerProviderId: cabinet.providerId, removedAt: null }
      : { followerUserId: userId, followerProviderId: null, removedAt: null };
    const viewWhere = cabinet.providerId ? { providerId: cabinet.providerId } : { userId, providerId: null };
    const saveWhere = cabinet.providerId
      ? { providerId: cabinet.providerId, removedAt: null }
      : { userId, providerId: null, removedAt: null };
    const [follows, views, saves, memberships] = await Promise.all([
      this.prisma.storyAuthorFollow.findMany({
        where: followWhere,
        select: { targetUserId: true, targetProviderId: true },
      }),
      this.prisma.storyViewEvent.findMany({
        where: viewWhere,
        select: { storyId: true },
        distinct: ['storyId'],
      }),
      this.prisma.storySave.findMany({
        where: saveWhere,
        select: { storyId: true },
      }),
      this.prisma.providerMember.findMany({
        where: { userId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } },
        select: { providerId: true },
      }),
    ]);
    return {
      userId,
      followedUserIds: new Set(follows.map((row) => row.targetUserId).filter((id): id is string => Boolean(id))),
      followedProviderIds: new Set(
        follows.map((row) => row.targetProviderId).filter((id): id is string => Boolean(id)),
      ),
      viewedIds: new Set(views.map((row) => row.storyId)),
      savedIds: new Set(saves.map((row) => row.storyId)),
      managedProviderIds: new Set(memberships.map((row) => row.providerId)),
    };
  }

  private followedWhere(viewer: Awaited<ReturnType<StoriesService['loadViewerContext']>>): Prisma.StoryWhereInput | null {
    const or: Prisma.StoryWhereInput[] = [];
    if (viewer.followedUserIds.size > 0) {
      or.push({ authorType: 'USER', authorUserId: { in: [...viewer.followedUserIds] } });
    }
    if (viewer.followedProviderIds.size > 0) {
      or.push({ authorType: 'PROVIDER', providerId: { in: [...viewer.followedProviderIds] } });
    }
    return or.length > 0 ? { OR: or } : null;
  }

  private rowIsFollowed(row: StoryRow, viewer: Awaited<ReturnType<StoriesService['loadViewerContext']>>) {
    return row.authorType === 'PROVIDER'
      ? Boolean(row.providerId && viewer.followedProviderIds.has(row.providerId))
      : viewer.followedUserIds.has(row.authorUserId);
  }

  private rowIsViewed(row: StoryRow, viewer: Awaited<ReturnType<StoriesService['loadViewerContext']>>) {
    if (viewer.viewedIds.has(row.id)) return true;
    if (row.authorType === 'USER') return row.authorUserId === viewer.userId;
    return Boolean(row.providerId && viewer.managedProviderIds.has(row.providerId));
  }

  private followTarget(input: { targetUserId?: string | null; targetProviderId?: string | null }) {
    const targetUserId = input.targetUserId?.trim() || null;
    const targetProviderId = input.targetProviderId?.trim() || null;
    if (Boolean(targetUserId) === Boolean(targetProviderId)) {
      throw new BadRequestException('Follow target must be a user or a provider');
    }
    return targetUserId ? { targetUserId, targetProviderId: null } : { targetUserId: null, targetProviderId };
  }

  private requireInboxConversation(
    conversations: Awaited<ReturnType<StoriesService['loadInbox']>>['conversations'],
    conversationId: string,
  ) {
    if (!parseConversationId(conversationId)) throw new NotFoundException('Conversation not found');
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private async loadInbox(input: { actorUserId: string; scope: InboxScope }) {
    const membership =
      input.scope === 'provider' ? await this.requireActiveMembership(input.actorUserId) : null;
    const providerId = membership?.providerId ?? null;
    const inboxKey = storyInboxKey(input.scope, providerId);
    const where: Prisma.StoryReplyWhereInput =
      input.scope === 'provider'
        ? {
            OR: [
              { story: { authorType: 'PROVIDER', providerId: providerId ?? undefined } },
              { authorType: 'PROVIDER', providerId: providerId ?? undefined },
            ],
          }
        : {
            OR: [
              { story: { authorType: 'USER', authorUserId: input.actorUserId } },
              { authorType: 'USER', authorUserId: input.actorUserId },
            ],
          };
    const [rows, reads, actor] = await Promise.all([
      this.prisma.storyReply.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { name: true, image: true, customerCity: { select: { name: true } } } },
          provider: { select: { id: true, name: true, image: true, city: { select: { name: true } } } },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              text: true,
              createdAt: true,
              senderUserId: true,
              sender: { select: { image: true } },
            },
          },
          story: {
            select: {
              id: true,
              text: true,
              authorType: true,
              authorUserId: true,
              providerId: true,
              authorUser: { select: { name: true, image: true, customerCity: { select: { name: true } } } },
              provider: { select: { name: true, image: true, city: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.storyConversationRead.findMany({
        where: { userId: input.actorUserId, inboxKey },
        select: { counterpartKey: true, lastReadAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: input.actorUserId },
        select: { image: true },
      }),
    ]);
    const replies: InboxReplyRow[] = rows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.createdAt,
      authorType: row.authorType,
      authorUserId: row.authorUserId,
      authorName: row.author.name?.trim() || 'Пользователь',
      authorImageUrl: row.author.image ?? null,
      authorCityName: row.author.customerCity?.name ?? null,
      authorProviderId: row.providerId,
      authorProviderName: row.provider?.name?.trim() || null,
      authorProviderImageUrl: row.provider?.image ?? null,
      authorProviderCityName: row.provider?.city?.name ?? null,
      story: {
        id: row.story.id,
        text: row.story.text,
        authorType: row.story.authorType,
        authorUserId: row.story.authorUserId,
        authorName: row.story.authorUser.name?.trim() || 'Пользователь',
        authorImageUrl: row.story.authorUser.image ?? null,
        authorCityName: row.story.authorUser.customerCity?.name ?? null,
        providerId: row.story.providerId,
        providerName: row.story.provider?.name?.trim() || null,
        providerImageUrl: row.story.provider?.image ?? null,
        providerCityName: row.story.provider?.city?.name ?? null,
      },
      messages: row.messages.map((message) => ({
        id: message.id,
        text: message.text,
        createdAt: message.createdAt,
        senderUserId: message.senderUserId,
        senderImageUrl: message.sender.image ?? null,
      })),
    }));
    return {
      inboxKey,
      selfImageUrl: membership?.provider.image ?? actor?.image ?? null,
      conversations: buildInbox({
        scope: input.scope,
        actorUserId: input.actorUserId,
        providerId,
        replies,
        readAtByCounterpart: new Map(reads.map((row) => [row.counterpartKey, row.lastReadAt])),
      }),
    };
  }

  private async requireReplyParticipant(input: { storyId: string; replyId: string; actorUserId: string }) {
    const story = await this.requireStory(input.storyId);
    const reply = await this.prisma.storyReply.findFirst({
      where: { id: input.replyId, storyId: story.id },
    });
    if (!reply) throw new NotFoundException('Reply not found');
    const author = await this.isStoryAuthor(input.actorUserId, story);
    const replyOwner =
      reply.authorType === 'PROVIDER' && reply.providerId
        ? await this.isProviderManager(input.actorUserId, reply.providerId)
        : reply.authorUserId === input.actorUserId;
    if (!author && !replyOwner) {
      throw new ForbiddenException('Story access denied');
    }
    return { story, reply };
  }

  private async requireStory(storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

  private async resolveCabinet(userId: string, scope: InboxScope) {
    if (scope !== 'provider') {
      return { providerId: null as string | null, provider: null };
    }
    const membership = await this.requireActiveMembership(userId);
    return { providerId: membership.providerId, provider: membership.provider };
  }

  private isOwnInScope(
    userId: string,
    story: { authorType: 'USER' | 'PROVIDER'; authorUserId: string; providerId: string | null },
    cabinetProviderId: string | null,
  ) {
    if (cabinetProviderId) {
      return story.authorType === 'PROVIDER' && story.providerId === cabinetProviderId;
    }
    return story.authorType === 'USER' && story.authorUserId === userId;
  }

  private async isProviderManager(userId: string, providerId: string) {
    const membership = await this.prisma.providerMember.findFirst({
      where: {
        userId,
        providerId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  private toCommentDto(
    row: {
      id: string;
      text: string;
      createdAt: Date;
      updatedAt: Date;
      authorType: 'USER' | 'PROVIDER';
      authorUserId: string;
      providerId: string | null;
      author: { name: string | null };
      provider: { name: string | null } | null;
      likes: { userId: string }[];
    },
    actorUserId: string | null,
    cabinetProviderId: string | null,
  ) {
    const mine = cabinetProviderId
      ? row.authorType === 'PROVIDER' && row.providerId === cabinetProviderId
      : Boolean(actorUserId) && row.authorType === 'USER' && row.authorUserId === actorUserId;
    const authorName =
      row.authorType === 'PROVIDER'
        ? row.provider?.name?.trim() || 'Пользователь'
        : row.author.name?.trim() || 'Пользователь';
    return {
      id: row.id,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      authorName,
      authorType: row.authorType,
      mine,
      likeCount: row.likes.length,
      liked: actorUserId ? row.likes.some((like) => like.userId === actorUserId) : false,
    };
  }

  private async requireComment(storyId: string, commentId: string) {
    const comment = await this.prisma.storyComment.findFirst({
      where: { id: commentId, storyId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private async canEditComment(
    userId: string,
    comment: { authorType: 'USER' | 'PROVIDER'; authorUserId: string; providerId: string | null },
  ) {
    if (comment.authorType === 'PROVIDER' && comment.providerId) {
      return this.isProviderManager(userId, comment.providerId);
    }
    return comment.authorUserId === userId;
  }

  private async isStoryAuthor(
    userId: string,
    story: { authorType: 'USER' | 'PROVIDER'; authorUserId: string; providerId: string | null },
  ) {
    if (story.authorType === 'USER') return story.authorUserId === userId;
    if (!story.providerId) return false;
    const membership = await this.prisma.providerMember.findFirst({
      where: {
        userId,
        providerId: story.providerId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  private async viewerCityId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customerCityId: true },
    });
    return user?.customerCityId ?? null;
  }

  private async resolveRootStoryId(storyId: string) {
    let currentId = storyId;
    const seen = new Set<string>();
    while (!seen.has(currentId)) {
      seen.add(currentId);
      const row = await this.prisma.story.findUnique({
        where: { id: currentId },
        select: { sourceStoryId: true },
      });
      if (!row?.sourceStoryId) return currentId;
      currentId = row.sourceStoryId;
    }
    return storyId;
  }

  private async requireActiveMembership(userId: string, providerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeProviderId: true },
    });

    const scopedProviderId = providerId ?? user?.activeProviderId ?? undefined;
    const membership = await this.prisma.providerMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
        ...(scopedProviderId ? { providerId: scopedProviderId } : {}),
      },
      select: {
        providerId: true,
        role: true,
        provider: {
          select: { id: true, name: true, slug: true, image: true, cityId: true },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Provider access denied');
    }
    return membership;
  }

  private async uploadStoryImage(storyId: string, file: Express.Multer.File) {
    const buf = file.buffer as Buffer | undefined;
    if (!buf || buf.length === 0) {
      throw new BadRequestException('file is required');
    }
    if (buf.length > STORY_IMAGE_MAX_BYTES) {
      throw new BadRequestException('file is too large');
    }

    const ext = sniffImageExt(buf, file.mimetype);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const bucket = this.s3.requirePublicBucket();
    const cdnBase = this.s3.requirePublicCdnBaseUrl();
    const hash = sha256Buffer(buf);
    const key = `${this.s3.publicPrefix}stories/${storyId}/${hash}${ext}`;
    const url = `${cdnBase.replace(/\/+$/, '')}/${key}`;

    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return url;
  }

  private async deleteStoryObject(imageUrl: string) {
    if (!this.s3.publicCdnBaseUrl || !this.s3.publicBucket) return;
    const key = tryExtractKeyFromPublicUrl({
      url: imageUrl,
      baseUrl: this.s3.publicCdnBaseUrl,
    });
    if (!key || !key.startsWith(`${this.s3.publicPrefix}stories/`)) return;
    try {
      await this.s3.client.send(
        new DeleteObjectCommand({
          Bucket: this.s3.publicBucket,
          Key: key,
        }),
      );
    } catch {
      // best-effort cleanup
    }
  }
}
