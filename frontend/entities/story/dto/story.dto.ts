export type StoryAuthorType = "USER" | "PROVIDER";
export type StoryScope = "user" | "provider";
export type StoryDurationDays = 1 | 2 | 3 | 7;

export type StoryDto = {
  id: string;
  authorType: StoryAuthorType;
  authorUserId?: string;
  providerId?: string | null;
  authorName: string;
  authorImageUrl: string | null;
  authorHref: string | null;
  cityId: string | null;
  text: string;
  imageUrl: string | null;
  durationDays: StoryDurationDays;
  publishedAt: string;
  expiresAt: string;
  expired: boolean;
  inFeed?: boolean;
  feedReason?: "visible" | "expired" | "withdrawn";
  viewed?: boolean;
  saved?: boolean;
  following?: boolean;
  sourceStoryId?: string | null;
};

export type StoryListDto = {
  items: StoryDto[];
};

export type StoryInsightsDto = {
  viewCount: number;
  guestViewCount: number;
  uniqueViewerCount: number;
  hourly: Array<{ hour: string; viewCount: number }>;
  viewers: Array<{ userId: string; name: string; viewCount: number; lastViewedAt: string; cityName: string | null }>;
  guestViews: Array<{ viewedAt: string }>;
  cities: Array<{ name: string; viewCount: number; uniqueViewerCount: number }>;
  profileOpenCount: number;
  guestProfileOpenCount: number;
  profileOpens: Array<{ userId: string; name: string; cityName: string | null; openedAt: string }>;
  guestProfileOpens: Array<{ openedAt: string }>;
  replies: Array<{ id: string; authorUserId: string; text: string; name: string; cityName: string | null; createdAt: string }>;
  reposts: Array<{ storyId: string; name: string; text: string; publishedAt: string }>;
  saveCount: number;
  saves: Array<{ userId: string; name: string; cityName: string | null; savedAt: string }>;
};

export type StoryReplyMessageDto = {
  id: string;
  text: string;
  createdAt: string;
  mine: boolean;
};

export type StoryReplyMessagesDto = {
  items: StoryReplyMessageDto[];
};

export type StoryConversationDto = {
  id: string;
  name: string;
  imageUrl: string | null;
  cityName: string | null;
  storyTitles: string[];
  preview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type StoryConversationListDto = {
  selfImageUrl: string | null;
  items: StoryConversationDto[];
};

export type StoryConversationMessageDto = {
  id: string;
  text: string;
  createdAt: string;
  mine: boolean;
  imageUrl: string | null;
  storyId: string;
  storyText: string;
};

export type StoryConversationMessagesDto = {
  items: StoryConversationMessageDto[];
};

export type StoryAudienceDto = {
  followers: Array<{ userId: string; name: string; at: string }>;
  unfollows: Array<{ userId: string; name: string; at: string }>;
  replyCount: number;
};
