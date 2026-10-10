const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InboxScope = 'user' | 'provider';

export type InboxParty = {
  kind: 'user' | 'provider';
  id: string;
};

export type InboxReplyMessageRow = {
  id: string;
  text: string;
  createdAt: Date;
  senderUserId: string;
  senderImageUrl: string | null;
};

export type InboxReplyRow = {
  id: string;
  text: string;
  createdAt: Date;
  authorType: 'USER' | 'PROVIDER';
  authorUserId: string;
  authorName: string;
  authorImageUrl: string | null;
  authorCityName: string | null;
  authorProviderId: string | null;
  authorProviderName: string | null;
  authorProviderImageUrl: string | null;
  authorProviderCityName: string | null;
  story: {
    id: string;
    text: string;
    authorType: 'USER' | 'PROVIDER';
    authorUserId: string;
    authorName: string;
    authorImageUrl: string | null;
    authorCityName: string | null;
    providerId: string | null;
    providerName: string | null;
    providerImageUrl: string | null;
    providerCityName: string | null;
  };
  messages: InboxReplyMessageRow[];
};

export type InboxThreadMessage = {
  id: string;
  text: string;
  createdAt: string;
  mine: boolean;
  imageUrl: string | null;
  storyId: string;
  storyText: string;
};

export type InboxBuiltConversation = {
  id: string;
  name: string;
  imageUrl: string | null;
  cityName: string | null;
  storyTitles: string[];
  preview: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: InboxThreadMessage[];
  latestReplyId: string;
};

type InboxEvent = {
  id: string;
  text: string;
  createdAt: Date;
  mine: boolean;
  imageUrl: string | null;
  storyId: string;
  storyText: string;
  replyId: string;
};

type Counterpart = InboxParty & {
  name: string;
  imageUrl: string | null;
  cityName: string | null;
};

export function storyInboxKey(scope: InboxScope, providerId: string | null): string {
  return scope === 'provider' && providerId ? `provider:${providerId}` : 'user';
}

export function parseConversationId(value: string): InboxParty | null {
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if ((kind !== 'user' && kind !== 'provider') || !UUID_PATTERN.test(id)) return null;
  return { kind, id };
}

export function formatInboxPreview(text: string, mine: boolean): string {
  return mine ? `Вы: ${text}` : text;
}

/**
 * Why: диалог — это свёртка ответов по собеседнику, а не строка в БД.
 * Чистая функция держит правила «чей это чат» и «что непрочитано» без Prisma.
 */
export function buildInbox(input: {
  scope: InboxScope;
  actorUserId: string;
  providerId: string | null;
  replies: readonly InboxReplyRow[];
  readAtByCounterpart: ReadonlyMap<string, Date>;
}): InboxBuiltConversation[] {
  const grouped = new Map<string, { counterpart: Counterpart; events: InboxEvent[]; replyActivity: Map<string, number> }>();

  for (const reply of input.replies) {
    const counterpart = counterpartOf(reply, input);
    if (!counterpart) continue;
    const key = `${counterpart.kind}:${counterpart.id}`;
    const bucket = grouped.get(key) ?? {
      counterpart,
      events: [],
      replyActivity: new Map<string, number>(),
    };
    if (!bucket.counterpart.imageUrl && counterpart.imageUrl) {
      bucket.counterpart = { ...bucket.counterpart, imageUrl: counterpart.imageUrl };
    }
    const events = eventsOf(reply, input);
    bucket.events.push(...events);
    const activity = events.reduce((max, event) => Math.max(max, event.createdAt.getTime()), 0);
    const previous = bucket.replyActivity.get(reply.id) ?? 0;
    if (activity >= previous) bucket.replyActivity.set(reply.id, activity);
    grouped.set(key, bucket);
  }

  const conversations: InboxBuiltConversation[] = [];
  for (const [key, bucket] of grouped) {
    const events = [...bucket.events].sort(compareEvents);
    if (events.length === 0) continue;
    const last = events[events.length - 1];
    if (!last) continue;
    const readAt = input.readAtByCounterpart.get(key)?.getTime() ?? null;
    const storyTitles: string[] = [];
    const seenStories = new Set<string>();
    for (const event of events) {
      if (seenStories.has(event.storyId)) continue;
      seenStories.add(event.storyId);
      storyTitles.push(event.storyText);
    }
    let latestReplyId = events[0]?.replyId ?? '';
    let latestActivity = -1;
    for (const [replyId, activity] of bucket.replyActivity) {
      if (activity >= latestActivity) {
        latestActivity = activity;
        latestReplyId = replyId;
      }
    }
    conversations.push({
      id: key,
      name: bucket.counterpart.name,
      imageUrl: bucket.counterpart.imageUrl,
      cityName: bucket.counterpart.cityName,
      storyTitles,
      preview: formatInboxPreview(last.text, last.mine),
      lastMessageAt: last.createdAt.toISOString(),
      unreadCount: events.filter((event) => !event.mine && (readAt == null || event.createdAt.getTime() > readAt)).length,
      messages: events.map((event) => ({
        id: event.id,
        text: event.text,
        createdAt: event.createdAt.toISOString(),
        mine: event.mine,
        imageUrl: event.imageUrl,
        storyId: event.storyId,
        storyText: event.storyText,
      })),
      latestReplyId,
    });
  }

  return conversations.sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

function replierParty(reply: InboxReplyRow): Counterpart {
  if (reply.authorType === 'PROVIDER' && reply.authorProviderId && reply.authorProviderName) {
    return {
      kind: 'provider',
      id: reply.authorProviderId,
      name: reply.authorProviderName,
      imageUrl: reply.authorProviderImageUrl,
      cityName: reply.authorProviderCityName,
    };
  }
  return {
    kind: 'user',
    id: reply.authorUserId,
    name: reply.authorName,
    imageUrl: reply.authorImageUrl,
    cityName: reply.authorCityName,
  };
}

function storyAuthorParty(reply: InboxReplyRow): Counterpart | null {
  if (reply.story.authorType === 'PROVIDER' && reply.story.providerId && reply.story.providerName) {
    return {
      kind: 'provider',
      id: reply.story.providerId,
      name: reply.story.providerName,
      imageUrl: reply.story.providerImageUrl,
      cityName: reply.story.providerCityName,
    };
  }
  if (reply.story.authorType === 'USER') {
    return {
      kind: 'user',
      id: reply.story.authorUserId,
      name: reply.story.authorName,
      imageUrl: reply.story.authorImageUrl,
      cityName: reply.story.authorCityName,
    };
  }
  return null;
}

function replyIsMine(
  reply: InboxReplyRow,
  input: { scope: InboxScope; actorUserId: string; providerId: string | null },
) {
  if (input.scope === 'provider') {
    return reply.authorType === 'PROVIDER' && reply.authorProviderId === input.providerId;
  }
  return reply.authorType === 'USER' && reply.authorUserId === input.actorUserId;
}

function counterpartOf(
  reply: InboxReplyRow,
  input: { scope: InboxScope; actorUserId: string; providerId: string | null },
): Counterpart | null {
  const mine = replyIsMine(reply, input);
  if (input.scope === 'provider') {
    const onOurStory = reply.story.authorType === 'PROVIDER' && reply.story.providerId === input.providerId;
    if (onOurStory && !mine) return replierParty(reply);
    if (mine && !onOurStory) return storyAuthorParty(reply);
    return null;
  }

  const ownUserStory = reply.story.authorType === 'USER' && reply.story.authorUserId === input.actorUserId;
  if (ownUserStory) {
    if (mine) return null;
    return replierParty(reply);
  }
  if (!mine) return null;
  return storyAuthorParty(reply);
}

function eventsOf(
  reply: InboxReplyRow,
  input: { scope: InboxScope; actorUserId: string; providerId: string | null },
): InboxEvent[] {
  const replyMine = replyIsMine(reply, input);
  const providerImage = reply.story.providerImageUrl ?? reply.authorProviderImageUrl;
  const events: InboxEvent[] = [
    {
      id: reply.id,
      text: reply.text,
      createdAt: reply.createdAt,
      mine: replyMine,
      imageUrl: reply.authorType === 'PROVIDER' ? reply.authorProviderImageUrl : reply.authorImageUrl,
      storyId: reply.story.id,
      storyText: reply.story.text,
      replyId: reply.id,
    },
  ];
  for (const message of reply.messages) {
    const mine =
      input.scope === 'provider'
        ? replyMine
          ? message.senderUserId !== reply.story.authorUserId
          : message.senderUserId !== reply.authorUserId
        : message.senderUserId === input.actorUserId;
    events.push({
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      mine,
      imageUrl: input.scope === 'provider' && mine ? providerImage : message.senderImageUrl,
      storyId: reply.story.id,
      storyText: reply.story.text,
      replyId: reply.id,
    });
  }
  return events;
}

function compareEvents(left: InboxEvent, right: InboxEvent): number {
  const byTime = left.createdAt.getTime() - right.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return left.id.localeCompare(right.id);
}
