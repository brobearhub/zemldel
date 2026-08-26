/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum OfferTermsSide {
  BUYER = "BUYER",
  SELLER = "SELLER",
}

/** Price type */
export enum PriceType {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
}

/** Terminal actor type (write-once) */
export enum OfferActorType {
  BUYER = "BUYER",
  BUYER_AGENT = "BUYER_AGENT",
  SELLER = "SELLER",
  SELLER_AGENT = "SELLER_AGENT",
  SYSTEM = "SYSTEM",
}

/** Terminal state (write-once, when offer becomes terminal) */
export enum OfferStatus {
  NEW = "NEW",
  CANCELLED = "CANCELLED",
  READY_TO_SEND = "READY_TO_SEND",
  SENT = "SENT",
  OPEN = "OPEN",
  COUNTEROFFERED = "COUNTEROFFERED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  TIMEOUT = "TIMEOUT",
  TERMINATED = "TERMINATED",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

export interface AdminDashboardSidebarDto {
  /** Sidebar items */
  items: string[];
}

export interface ApiResponseDto {
  /** @example 1 */
  page: number;
  /** @example 10 */
  limit: number;
  /** @example 100 */
  total: number;
  /** @example 10 */
  pageCount: number;
  /** @example "Generic response data" */
  data: object;
  /** @example "Error message" */
  error: object;
  /** @example true */
  success: boolean;
  /** @example 200 */
  status: number;
}

export interface PreferredLocationPatchDto {
  /**
   * ZIP code (US-style). When sent, updates preferredZip; omit to leave the stored ZIP unchanged.
   * @example "33101"
   */
  zip?: string;
  /**
   * City and state label. When sent, updates preferredCityState; omit to leave the stored value unchanged.
   * @example "Miami, FL"
   */
  cityState?: string;
}

export interface UserDto {
  /** User id (Cognito sub) */
  id: string;
  /** User name */
  name: string;
  /** User avatar */
  avatar: object | null;
  /** User email */
  email: string;
  /** Preferred contact email for negotiation follow-up (may differ from login email). */
  contactEmail?: object | null;
  /** Preferred contact phone for negotiation follow-up. */
  contactPhone?: object | null;
  /**
   * User created at
   * @format date-time
   */
  createdAt: string;
  /**
   * User updated at
   * @format date-time
   */
  updatedAt: string;
  /** User dealer */
  dealerAdmin: boolean;
  /** User dealer */
  dealerManager: boolean;
  /** User dealer */
  dealerReader: boolean;
  /** User platform */
  platformAdmin: boolean;
  /** User agent */
  agent: boolean;
  /** Preferred search ZIP (read via GET profile; write via PATCH /user/profile/preferred-location) */
  preferredZip?: object | null;
  /** Preferred City/State label (read via GET profile; write via PATCH /user/profile/preferred-location) */
  preferredCityState?: object | null;
  /** Unread-chat email digest timing in minutes (read via GET profile; write via PATCH /user/notification-settings). Null = system default. */
  unreadEmailTimingMinutes?: UserDtoUnreadEmailTimingMinutesEnum | null;
}

export interface NotificationSettingsDto {
  /**
   * Unread-chat email digest timing in minutes. Null means use the system default (global unreadNotificationsTiming).
   * @example 60
   */
  unreadEmailTimingMinutes?: NotificationSettingsDtoUnreadEmailTimingMinutesEnum | null;
}

export interface NotificationSettingsPatchDto {
  /**
   * Unread-chat email digest timing in minutes, or null for system default. Allowed: 15, 60, 480, 1440.
   * @example 60
   */
  unreadEmailTimingMinutes?: NotificationSettingsPatchDtoUnreadEmailTimingMinutesEnum | null;
}

export interface UserCreateInputDto {
  /** User id (Cognito sub) */
  id: string;
  /** User email */
  email: string;
  /** User name */
  name: string;
  /** User avatar */
  avatar: object | null;
}

export interface ChatCommandDto {
  /**
   * Command name (UPPER_SNAKE_CASE).
   * @example "OPEN_ALL_SAVED_SEARCHES"
   */
  name: string;
  /**
   * Command arguments (free-form object).
   * @example {"savedSearchIds":["00000000-0000-0000-0000-000000000000"]}
   */
  arguments?: Record<string, any>;
}

export interface ChatRequestDto {
  /** Chat request ID */
  id: string;
  /** Chat ID */
  chatId: string;
  /** Author ID */
  authorId: string;
  /** Message content */
  content: string;
  /** Description */
  description?: object | null;
  /** Optional structured commands associated with this chat request (journaled by UI/system). */
  commands?: ChatCommandDto[] | null;
  /**
   * Created at
   * @format date-time
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   */
  updatedAt: string;
  /** Persisted read timestamp for the chat owner (null = unread for inbound agent→human bubbles). Own messages stay null. */
  readAt?: object | null;
  /** Derived: true when author is viewer, or when readAt is set. Own/user requests are always read. */
  isRead?: boolean;
}

export interface ChatResponseDto {
  /** Response ID */
  id: string;
  /** Chat request ID */
  chatRequestId: string;
  /** Response content */
  content: string;
  /** Author ID */
  authorId: string;
  /**
   * Created at
   * @format date-time
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   */
  updatedAt: string;
  /** Persisted read timestamp for the chat owner (null = unread). Own messages stay null. */
  readAt?: object | null;
  /** Derived: true when author is viewer, or when readAt is set. */
  isRead?: boolean;
}

export interface BannerButtonDto {
  /** Label */
  label: string;
  /** URL */
  url: string;
}

export interface BannerDataDto {
  /** Title */
  title: string;
  /** Key point */
  keyPoint: string;
  /** Message */
  message: string;
  /** Details */
  details: string;
  /** Buttons */
  buttons: BannerButtonDto[];
}

export interface AnswerMetaDto {
  /** Banner data */
  bannerData: BannerDataDto;
}

export interface AnswerDto {
  /** ID of answer */
  id: string;
  /** ID of query */
  queryId: string;
  /** ID of user */
  userId: string;
  /** Text of answer */
  content: string;
  /** Date of creation */
  createdAt: string;
  /** Meta */
  meta: AnswerMetaDto;
}

export interface QueryResponseDto {
  /** ID запроса */
  id: string;
  /** ID чата */
  chatId: string;
  /** Запрос */
  request: string;
  /** Ответы на запрос */
  responses: AnswerDto[];
  /** Дата создания */
  createdAt: string;
  /** Дата последнего обновления */
  updatedAt: string;
  /** ID пользователя */
  userId: string;
}

export interface ModelDto {
  /**
   * Model
   * @example "Model"
   */
  model: string;
  /**
   * Trim
   * @example "Trim"
   */
  trims: string[];
}

export interface MakeModelTrimDto {
  /**
   * Make
   * @example "Make"
   */
  make: string;
  /**
   * Model
   * @example "Model"
   */
  models: ModelDto[];
}

export interface SavedSearchStatsEntity {
  /**
   * Listings matched for this saved search
   * @example 12
   */
  listings: number;
  /**
   * Negotiations linked to this saved search
   * @example 3
   */
  negotiations: number;
  /**
   * Accepted offers linked to this saved search
   * @example 1
   */
  acceptedOffers: number;
  /**
   * Closed offers linked to this saved search
   * @example 1
   */
  closedOffers: number;
  /**
   * Latest negotiation ID linked to this saved search
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  latestNegotiationId?: string;
}

export interface SavedSearchChatDataDto {
  /**
   * Saved search ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Saved search type
   * @example "BUY"
   */
  type: SavedSearchChatDataDtoTypeEnum;
  /**
   * Saved search visibility. true=visible in saved searches list; false=transient /results context.
   * @default true
   */
  saved?: boolean;
  /**
   * Saved search title
   * @example "Saved search title"
   */
  title?: string;
  /**
   * Saved search description
   * @example "Saved search description"
   */
  description?: string;
  /**
   * Make model trim
   * @example [null]
   */
  makeModelTrim: MakeModelTrimDto[];
  /**
   * Year
   * @example 2021
   */
  year?: number;
  /**
   * Mileage
   * @example 10000
   */
  mileage?: number;
  /**
   * Condition
   * @example "ANY"
   */
  condition?: string;
  /**
   * Interior color
   * @example ["Black","Beige"]
   */
  interiorColor?: string[];
  /**
   * Exterior color
   * @example ["White","Blue"]
   */
  exteriorColor?: string[];
  /**
   * Body type
   * @example ["SUV","SEDAN"]
   */
  bodyType?: SavedSearchChatDataDtoBodyTypeEnum[];
  /**
   * Fuel type
   * @example ["GASOLINE","HYBRID"]
   */
  fuelType?: SavedSearchChatDataDtoFuelTypeEnum[];
  /**
   * Purpose
   * @example ["PERSONAL"]
   */
  purpose?: SavedSearchChatDataDtoPurposeEnum[];
  /**
   * Drive train
   * @example ["AWD","RWD"]
   */
  drivetrain?: SavedSearchChatDataDtoDrivetrainEnum[];
  /**
   * Transmission
   * @example ["AUTOMATIC"]
   */
  transmission?: SavedSearchChatDataDtoTransmissionEnum[];
  /**
   * Price total min
   * @example 10000
   */
  priceTotalMin?: number;
  /**
   * Price total max
   * @example 10000
   */
  priceTotalMax?: number;
  /**
   * Price monthly min
   * @example 10000
   */
  priceMonthlyMin?: number;
  /**
   * Price monthly max
   * @example 10000
   */
  priceMonthlyMax?: number;
  /**
   * Downpayment amount
   * @example 10000
   */
  downpaymentAmount?: number;
  /**
   * City + State
   * @example "New York, NY"
   */
  cityState?: string;
  /**
   * Zip
   * @example "10001"
   */
  zip?: string;
  /**
   * Latitude
   * @example 40.7128
   */
  latitude?: number;
  /**
   * Longitude
   * @example -74.006
   */
  longitude?: number;
  /**
   * Radius
   * @example 100
   */
  radius?: number;
  /**
   * Radius unit
   * @example "MI"
   */
  radiusUnit?: string;
  /** Aggregated statistics for the saved search card */
  stats?: SavedSearchStatsEntity;
}

export interface AgentChatMessageDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
}

export interface AgentGeneralSavedSearchesChatMessageDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Optional filters payload (follow-up/final only). */
  filters?: object;
  /** Optional UI command (pass-through from tenant-search). */
  commands?: ChatCommandDto;
}

export interface AgentGeneralNegotiationsChatMessageDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Optional filters payload (follow-up/final only). */
  filters?: object;
  /** Optional UI command (pass-through from tenant-search). */
  commands?: ChatCommandDto;
}

export interface AgentGeneralOffersChatMessageDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Optional filters payload (follow-up/final only). */
  filters?: object;
  /** Optional UI command (pass-through from tenant-search). */
  commands?: ChatCommandDto;
}

export interface AgentGeneralStrategiesChatMessageDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Optional filters payload (follow-up/final only). */
  filters?: object;
  /** Optional UI command (pass-through from tenant-search). */
  commands?: ChatCommandDto;
}

export interface NegotiationChatMessageResponseDto {
  /** Chat ID */
  chatId: string;
  /** Chat response */
  chatResponse: ChatResponseDto;
}

export interface StrategyChatDataDto {
  /**
   * Strategy ID
   * @format uuid
   */
  id: string;
  /** Strategy kind (BUY/SELL) */
  kind?: string;
  /** Strategy name */
  strategyName?: string;
  /** Full strategy payload for ChatRuntime grounding */
  data?: object;
}

export interface StrategyChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Strategy data */
  data: StrategyChatDataDto;
}

export interface StrategyChatMessageResponseDto {
  /** Chat ID */
  chatId: string;
  /** Chat response */
  chatResponse: ChatResponseDto;
  /** Structured commands from ChatRuntime */
  commands?: string[];
}

export interface ChatDto {
  /** Chat ID */
  id: string;
  /** User ID */
  userId: string;
  /** Scope of chat */
  scope: string;
  /** Kind of chat */
  kind: ChatDtoKindEnum;
  /** Saved search ID */
  savedSearchId?: object | null;
  /** Negotiation ID */
  negotiationId?: object | null;
  /** Offer ID */
  offerId?: object | null;
  /** Strategy ID */
  strategyId?: object | null;
  /**
   * Created at
   * @format date-time
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   */
  updatedAt: string;
}

export interface CreateChatRequestDto {
  /** Scope of chat */
  scope: CreateChatRequestDtoScopeEnum;
  /** Kind of chat (optional; DEFAULT unless specified) */
  kind?: CreateChatRequestDtoKindEnum;
  /**
   * Saved search ID
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  savedSearchId?: string;
  /**
   * Negotiation ID
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  negotiationId?: string;
  /**
   * Offer ID
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  offerId?: string;
  /**
   * Strategy ID
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  strategyId?: string;
}

export interface ChatRequestWithResponsesDto {
  /** Chat request ID */
  id: string;
  /** Chat ID */
  chatId: string;
  /** Author ID */
  authorId: string;
  /** Message content */
  content: string;
  /** Description */
  description?: object | null;
  /** Optional structured commands associated with this chat request (journaled by UI/system). */
  commands?: ChatCommandDto[] | null;
  /**
   * Created at
   * @format date-time
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   */
  updatedAt: string;
  /** Persisted read timestamp for the chat owner (null = unread for inbound agent→human bubbles). Own messages stay null. */
  readAt?: object | null;
  /** Derived: true when author is viewer, or when readAt is set. Own/user requests are always read. */
  isRead?: boolean;
  /** Responses to this request */
  chatResponses: ChatResponseDto[];
}

export interface ChatHistoryResponseDto {
  /** Chat ID */
  chatId: string;
  /** List of chat requests, each with nested list of chat responses */
  chatRequests: ChatRequestWithResponsesDto[];
  /** True when unread other-authored responses exist older than the oldest response on this page. */
  hasOlderUnread?: boolean;
}

export interface ChatUpdatesDto {
  /** Chat ID */
  chatId: string;
  /** New responses since the provided cursor */
  responses: ChatResponseDto[];
  /** Next cursor (max createdAt), ISO string */
  nextCursor?: object | null;
}

export interface InboxChatSummaryDto {
  /** Chat ID */
  chatId: string;
  scope: InboxChatSummaryDtoScopeEnum;
  kind: InboxChatSummaryDtoKindEnum;
  savedSearchId?: object | null;
  negotiationId?: object | null;
  offerId?: object | null;
  /** Timestamp of latest message in this chat */
  lastMessageAt?: object | null;
  /** Preview text of latest message */
  lastMessagePreview?: object | null;
  /** Author ID of latest message */
  lastMessageAuthorId?: object | null;
  /** Unread count for this chat */
  unreadCount: number;
}

export interface InboxSummaryDto {
  chats: InboxChatSummaryDto[];
  /** Total unread across all returned chats */
  totalUnread: number;
  /** Cursor for next poll (max lastMessageAt), ISO string */
  nextCursor?: object | null;
}

export interface UserMessageInboxItemDto {
  messageId: string;
  chatId: string;
  chatScope: string;
  chatName: string;
  preview: string;
  /** ISO-8601 timestamp */
  createdAt: string;
  isRead: boolean;
  /** Marketplace deep-link path */
  href: string;
}

export interface UserMessageInboxPageDto {
  page: number;
  pageSize: number;
  totalCount: number;
  unreadCount: number;
  items: UserMessageInboxItemDto[];
}

export interface MarkUserMessagesReadDto {
  /** Inbox message IDs to mark as read for the current user */
  messageIds: string[];
}

export interface MarkUserMessagesReadResultDto {
  updatedCount: number;
  unreadCount: number;
  totalCount: number;
}

export interface SavedSearchChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Saved search data */
  data: SavedSearchChatDataDto;
  /** Vehicle IDs */
  vehicleIds: string[];
}

export interface GeneralSavedSearchesChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Saved search IDs (optional selection) */
  savedSearchIds?: string[];
}

export interface GeneralNegotiationsChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Negotiation IDs (optional selection) */
  negotiationIds?: string[];
}

export interface GeneralOffersChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Offer IDs (optional selected offers) */
  offerIds?: string[];
}

export interface GeneralStrategiesChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
}

export interface AgentChatMessageToSavedSearchChatDto {
  /** Chat ID */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Saved search partial update payload (tenant-search may send a subset of fields without id/type). */
  data?: object;
  /** Optional search filters payload (pass-through) */
  filters?: object;
  /** Optional UI command payload (pass-through). */
  commands?: ChatCommandDto;
}

export interface AgentChatMessageToNegotiationChatDto {
  /** Chat ID (optional; tenant-chat follow-ups include it for correlation). Resolved from chatRequestId when omitted. */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Message text */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Optional structured payload from tenant-search (e.g. updatedOffer/createdOffer/updatedNegotiation patches). */
  data?: object;
  /** Ephemeral follow-up hint (tenant-search may send). Tenant-api may choose to suppress persistence/notifications later. */
  isEphemeral?: boolean;
  /** Optional UI/command payload from tenant-chat negotiation follow-ups (may include NONE). */
  commands?: ChatCommandDto;
}

export interface AgentRequestToNegotiationChatDto {
  /** Chat ID */
  chatId?: string;
  /** Agent ID */
  agentId: string;
  /** Negotiation ID */
  negotiationId: string;
  /** Request text */
  request: string;
  /** Optional structured payload from tenant-search (e.g. offerId propagation, plus any extra keys). */
  data?: object;
  /** Structured command from tenant-search (LLM output), e.g. { name: ACCEPT_OFFER, arguments: { offerIds: [...] } }. */
  commands?: ChatCommandDto;
}

export interface ApplyNegotiationOfferUpdateDto {
  /** update | create | none */
  action: string;
  /** Offer UUID */
  offerId?: string;
  /** Patch fields for updateOfferFromChatPatch (must include id or use offerId). */
  patch?: object;
}

export interface ApplyNegotiationUpdatesDto {
  chatId: string;
  negotiationId: string;
  agentId?: string;
  senderRole?: string;
  offer?: ApplyNegotiationOfferUpdateDto;
  /** Negotiation patch for updateNegotiationFromChatPatch */
  negotiation?: object;
  /** Optional synthesized command (ignored by v1 apply-updates; patches only). */
  synthesizedCommand?: object;
}

export interface NegotiationChatDataDto {
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB. Null until backfill/create assigns it.
   * @example "8A-AB"
   */
  shortId?: object | null;
  /**
   * Owning dealer id when the negotiation is dealer-scoped (staff access via DealerMember).
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  dealerId?: object | null;
  /**
   * Negotiation title
   * @example "Negotiation title"
   */
  title?: string;
  /**
   * Negotiation description
   * @example "Negotiation description"
   */
  description?: string;
  /**
   * Optional saved-search origin. Null when the deal started without a parent search.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  savedSearchId?: object | null;
  /**
   * Negotiation base expiry (createdAt + baseDurationSeconds)
   * @example "2026-06-10T00:00:00.000Z"
   */
  baseExpiresAtUtc?: object | null;
  /**
   * Post-expiry rolling extension window (N), seconds
   * @example 259200
   */
  extensionWindowSeconds?: object | null;
  /**
   * Last mutation timestamp (offer/negotiation mutations only)
   * @example "2026-06-03T00:00:00.000Z"
   */
  lastMutationAtUtc?: object | null;
  /**
   * Strategy template key used for timing snapshot
   * @example "buy-balanced"
   */
  strategyTemplateKey?: object | null;
  /**
   * Strategy template version used for timing snapshot
   * @example "1.0.2"
   */
  strategyTemplateVersion?: object | null;
  /** Negotiation status */
  status: NegotiationChatDataDtoStatusEnum;
  /** Negotiation last update / close timestamp (ISO-8601) */
  updatedAt?: string;
  /**
   * Buyer user ID
   * @example "983143b0-9021-703e-32e9-0c9fc67d0a97"
   */
  buyerId: string;
  /**
   * Seller user ID
   * @example "7821a3f0-0041-70e7-42e2-f90587be88bc"
   */
  sellerId: string;
  /**
   * Vehicle ID
   * @example "cc67ecc0-7a08-4c82-bd67-d44489554be1"
   */
  vehicleId: string;
  /**
   * Hint only. ChatRuntime ignores this and resolves buyer/seller from live vehicle ownership.
   * @example "seller"
   */
  senderRole?: string;
  /**
   * Live vehicle owner user id when known. ChatRuntime prefers Mezzanine vehicle.userId over this value.
   * @example "7821a3f0-0041-70e7-42e2-f90587be88bc"
   */
  vehicleOwnerUserId?: string;
  /**
   * Postgres chat kind for this thread (NEGOTIATION_SELLER_AGENT / NEGOTIATION_BUYER_AGENT). ChatRuntime uses this when Mezzanine Chat.Kind is missing.
   * @example "NEGOTIATION_SELLER_AGENT"
   */
  chatKind?: string;
  /** Optional handshake payload (v1) used for deterministic multi-negotiation submit/receipt correlation and idempotency. */
  handshake?: object;
}

export interface NegotiationChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Negotiation data */
  data: NegotiationChatDataDto;
  /** Optional direct/definitive command from the human caller (e.g. SEND_OFFER_TO_SELLER). */
  commands?: ChatCommandDto;
}

export interface NegotiationIssueDto {
  /** Name of the negotiation issue */
  name: string;
  /** Weight of the issue (0.0 to 1.0) */
  weight: number;
  /** Target description for this issue */
  target: string;
  /** Reservation description for this issue */
  reservation: string;
  /** Concession steps description */
  concessionSteps: string;
  /** Conversation tone for this issue */
  conversationTone: string;
}

export interface NegotiationEntryDto {
  /** Initial conditions description */
  initialConditions: string;
  /** Initial offer description */
  initialOffer: string;
}

export interface NegotiationConductDto {
  /** Maximum number of negotiation rounds */
  maxRounds: number;
  /** Whether concession is expected from other party */
  reciprocalConcession: boolean;
  /** Minimum concession description */
  minConcession: string;
  /** Overall conversation tone */
  conversationTone: string;
}

export interface NegotiationCloseDto {
  /** Offer acceptance criteria description */
  acceptThreshold: string;
  /** Whether to ask for user confirmation before accepting deal */
  isConfirmDealClosingWithUser: boolean;
}

export interface NegotiationDropDto {
  /** Offer rejection criteria description */
  walkAwayThreshold: string;
  /** Maximum number of consecutive rejections */
  maxConsecutiveRejects: number;
  /** Maximum response waiting time in minutes */
  maxResponseWaitingTimeMinutes: number;
  /** Whether to ask for user confirmation before dropping deal */
  isConfirmNegotiationDropWithUser: boolean;
}

export interface AfterwardReviewDto {
  /** Whether to enable negotiation summary */
  enableSummary: boolean;
  /** Whether to log negotiation flow */
  logTranscript: boolean;
}

export interface DynamicStrategyDto {
  /** Whether strategy is adoptable */
  isStrategyAdoptable: boolean;
  /** Strategy adoption weight (0.0 to 1.0) */
  strategyAdoptionWeight: number;
  /** Whether to ask for user confirmation for strategy changes */
  isConfirmStrategyChangeWithUser: boolean;
}

export interface ComplianceDto {
  /** List of strategy properties that should never change */
  doNotChangeStrategyProperties: string[];
  /** List of strategy properties that should not be disclosed */
  doNotDiscloseToOtherParty: string[];
  /** List of strategy properties that can be disclosed */
  canBeDisclosedToOtherParty: string[];
}

export type NegotiationStrategyGuardrailsDto = object;

export type NegotiationStrategyThresholdDto = object;

export interface NegotiationStrategyAgeGuardrailDto {
  /** Guardrail kind scoped by offer age */
  kind: NegotiationStrategyAgeGuardrailDtoKindEnum;
  /** Offer payment type for which the threshold applies. Optional for section-local guardrails (payment type is implied by the section). */
  paymentType?: NegotiationStrategyAgeGuardrailDtoPaymentTypeEnum;
  /** Threshold to apply within the age window */
  threshold: NegotiationStrategyThresholdDto;
  /** Minimum offer age in cycles (inclusive). Default 0. */
  minAgeCycles?: object;
  /** Maximum offer age in cycles (inclusive). Null/omitted means no upper bound. */
  maxAgeCycles?: object | null;
}

export interface NegotiationStrategyDto {
  /** Name of the negotiation strategy */
  strategyName: string;
  /** Description of the negotiation strategy */
  strategyDescription: string;
  /** Array of strategy goals */
  strategyGoals: string[];
  /** Array of negotiation issues */
  negotiationIssues: NegotiationIssueDto[];
  /** Rules for negotiation start */
  negotiationEntry: NegotiationEntryDto;
  /** Rules during negotiation */
  negotiationConduct: NegotiationConductDto;
  /** Rules for negotiation close */
  negotiationClose: NegotiationCloseDto;
  /** Rules for negotiation drop */
  negotiationDrop: NegotiationDropDto;
  /** Options for after negotiation */
  afterwardReview: AfterwardReviewDto;
  /** Settings for dynamic strategy adjustments */
  dynamicStrategy: DynamicStrategyDto;
  /** Additional verifications for strategy access */
  compliance: ComplianceDto;
  /** Guardrail: auto reject below threshold (per payment type) */
  minCutOffValue?: NegotiationStrategyGuardrailsDto;
  /** Guardrail: auto accept at/above threshold (per payment type) */
  minAutoAccept?: NegotiationStrategyGuardrailsDto;
  /** Guardrail (buyer): auto reject above ceiling (per payment type) */
  maxCutOffValue?: NegotiationStrategyGuardrailsDto;
  /** Guardrail (buyer): auto accept at/below ceiling (per payment type) */
  maxAutoAccept?: NegotiationStrategyGuardrailsDto;
  /** Age-window-scoped guardrails (applied based on inbound delivered-offer step; minAgeCycles 0 = first inbound) */
  ageGuardrails?: NegotiationStrategyAgeGuardrailDto[];
  /** Optional soft cap on persisted messages for the whole negotiation. May only lower the platform setting Negotiation:MaxPersistedMessagesPerNegotiation. */
  maxPersistedMessagesPerNegotiation?: number;
}

export interface OfferAddonDto {
  /**
   * Addon ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Addon title
   * @example "Extended warranty"
   */
  title: string;
  /**
   * Addon description
   * @example "Adds 24 months of coverage"
   */
  description: string;
  /**
   * Price delta for this addon (can be negative)
   * @example 499.99
   */
  priceAmount: number;
  /**
   * How addon price should be applied
   * @example "UPFRONT"
   */
  priceType: OfferAddonDtoPriceTypeEnum;
}

export interface OfferChatDataDto {
  /**
   * Offer ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB-44. Null until backfill/create assigns it.
   * @example "8A-AB-44"
   */
  shortId?: object | null;
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  negotiationId: string;
  /**
   * Sender user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  senderUserId: string;
  /**
   * Recipient user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  recipientUserId: string;
  /**
   * Title
   * @example "Offer Title"
   */
  title: string;
  /**
   * Description
   * @example "Offer Description"
   */
  description: string;
  /**
   * Best-effort standard terms version reference (date-based) for this offer
   * @example "2026-06-21"
   */
  termsVersionDate?: object | null;
  /** Terminal state (write-once, when offer becomes terminal) */
  terminalState?: OfferStatus | null;
  /** Exact terms snapshot text captured only when the offer becomes ACCEPTED (write-once) */
  terminalTerms?: object | null;
  /**
   * Version date (date-based) for the captured terminalTerms snapshot (write-once)
   * @example "2026-06-21"
   */
  terminalTermsVersionDate?: object | null;
  /**
   * Terminal timestamp (UTC, write-once)
   * @example "2026-06-21T00:00:00.000Z"
   */
  terminalAtUtc?: object | null;
  /** Terminal actor type (write-once) */
  terminalBy?: OfferActorType | null;
  /**
   * Terminal actor id (write-once; null for System)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  terminalById?: object | null;
  /** Best-effort sender role hint: true when the sender is a dealer user (derived from user flags) */
  senderIsDealer?: boolean;
  /**
   * Negotiation strategy
   * @example "Negotiation strategy"
   */
  negotiationStrategy: NegotiationStrategyDto;
  /**
   * Price amount
   * @example 10000
   */
  priceAmount: number;
  /**
   * Price type
   * @example "TOTAL"
   */
  priceType: PriceType;
  /**
   * Offer expiry (absolute timestamp, if set)
   * @example "2026-06-03T00:00:00.000Z"
   */
  expiresAtUtc: object | null;
  /**
   * Offer add-ons (stored as JSON)
   * @example []
   */
  addons: OfferAddonDto[];
}

export interface OfferChatMessageDto {
  /** ID чата (UUID или произвольный идентификатор, например results-ai) */
  chatId?: string;
  /** Chat request ID */
  chatRequestId?: string;
  /** Текст сообщения */
  message: string;
  /** Offer data */
  data: OfferChatDataDto;
}

export interface MarkChatMessagesReadDto {
  /** ChatResponse IDs to mark as read for the current user */
  messageIds: string[];
}

export interface ChatUserProfilePatchDto {
  /** Authenticated user id (host-bound) */
  userId: string;
  name?: object | null;
  contactEmail?: object | null;
  contactPhone?: object | null;
  preferredZip?: object | null;
  preferredCityState?: object | null;
}

export interface CreateNegotiationDto {
  /** Optional origin saved search. Omit when starting from vehicle/dealer details. */
  savedSearchId?: string;
  /** The id of the vehicle */
  vehicleId: string;
  /** Selected buyer negotiation strategy id */
  buyerStrategyId?: string;
  /**
   * True when create is started from the multi-vehicle negotiation wizard. Drives auto-send handshake, price clamp, and base-expiry override. Do not infer this from initialOfferTitle (titles are human-readable).
   * @example true
   */
  isMultiNegotiationStart?: boolean;
  /**
   * Optional override for the negotiation base expiry timestamp (UTC). Used by multi-negotiation Step 4 Expiration Date selector.
   * @format date-time
   * @example "2026-06-30T23:59:59.999Z"
   */
  negotiationBaseExpiresAtUtc?: string;
  /**
   * When provided together with initialOfferPriceType, the first offer uses these values (e.g. multi-vehicle dialog) instead of vehicle list price
   * @example 28500
   */
  initialOfferPriceAmount?: number;
  /** Price type for the initial offer when initialOfferPriceAmount is set */
  initialOfferPriceType?: CreateNegotiationDtoInitialOfferPriceTypeEnum;
  /** Optional title for the initial offer */
  initialOfferTitle?: string;
  /** Optional description / context for the initial offer */
  initialOfferDescription?: string;
  /** Add-ons for the initial offer */
  initialOfferAddons?: OfferAddonDto[];
}

export interface NegotiationEntity {
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB. Null until backfill/create assigns it.
   * @example "8A-AB"
   */
  shortId?: object | null;
  /**
   * Buyer user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  buyerId: string;
  /**
   * Seller user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  sellerId: string;
  /**
   * Owning dealer id when the negotiation is dealer-scoped (staff access via DealerMember).
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  dealerId?: object | null;
  /**
   * Negotiation title
   * @example "Negotiation title"
   */
  title?: string;
  /**
   * Negotiation description
   * @example "Negotiation description"
   */
  description?: string;
  /**
   * Negotiation status
   * @example "NEGOTIATION_NEW"
   */
  status: NegotiationEntityStatusEnum;
  /**
   * Vehicle ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  vehicleId: string;
  /**
   * Optional saved-search origin. Null when the deal started without a parent search.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  savedSearchId?: object | null;
  /**
   * Creation date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  createdAt: string;
  /**
   * Negotiation base expiry (createdAt + baseDurationSeconds)
   * @example "2026-06-10T00:00:00.000Z"
   */
  baseExpiresAtUtc?: object | null;
  /**
   * Post-expiry rolling extension window (N), seconds
   * @example 259200
   */
  extensionWindowSeconds?: object | null;
  /**
   * Last mutation timestamp (offer/negotiation mutations only)
   * @example "2026-06-03T00:00:00.000Z"
   */
  lastMutationAtUtc?: object | null;
  /**
   * Strategy template key used for timing snapshot
   * @example "buy-balanced"
   */
  strategyTemplateKey?: object | null;
  /**
   * Strategy template version used for timing snapshot
   * @example "1.0.2"
   */
  strategyTemplateVersion?: object | null;
  /**
   * Update date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  updatedAt: string;
}

export interface VehicleEntity {
  /** Vehicle ID (DB-generated UUID stored as TEXT) */
  id: string;
  /** Current vehicle owner user id (live; may differ from negotiation.sellerId) */
  userId?: string;
  /** Dealer-scoped inventory key for feed-backed vehicles */
  sourceInventoryKey?: string;
  /**
   * Vehicle status (stored as TEXT in DB)
   * @default "ACTIVE"
   */
  status?: VehicleEntityStatusEnum;
  /** Stock number */
  stockNumber?: string;
  /** VIN */
  vin?: string;
  /** Year */
  year: number;
  /** Make */
  make: string;
  /** Model */
  model: string;
  /** Mileage */
  mileage: number;
  /** Days on market from feed (dealer-reported); optional */
  daysOnMarket?: object;
  /** Trim */
  trim?: string;
  /** Body type (stored as TEXT in DB) */
  bodyType?: string;
  /** Fuel type (stored as TEXT in DB) */
  fuelType?: string;
  /** Drivetrain (stored as TEXT in DB) */
  drivetrain?: string;
  /** Purpose (stored as TEXT in DB) */
  purpose?: string;
  /** Conditions (stored as TEXT in DB) */
  condition?: string;
  /** Description */
  description?: string;
  /** URL */
  url?: string;
  /** Price */
  price?: number;
  /** Cost */
  cost?: number;
  /** Min finance monthly payment */
  minFinanceMonthlyPayment?: number;
  /** Min lease monthly payment */
  minLeaseMonthlyPayment?: number;
  /** Assigned finance plan id */
  financePlanId?: object;
  /** Assigned finance plan name */
  financePlanName?: object;
  /** Predicted SELL strategy name if a negotiation were created now */
  predictedSellerStrategyName?: object;
  /** Finance mode: off | generic | plan */
  financeMode?: string;
  /** Last imported generic finance monthly */
  financeGenericMonthly?: object;
  /** Images (URLs or identifiers) */
  images?: string[];
  /** Interior color */
  interiorColor?: string;
  /** Exterior color */
  exteriorColor?: string;
  /** Address */
  address?: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** ZIP */
  zip?: string;
  /** Country */
  country?: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
  /** Created at */
  createdAt?: string;
  /** Updated at */
  updatedAt?: string;
}

export interface SavedSearchEntity {
  /**
   * Saved search ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * User ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  userId: string;
  /**
   * Saved search status
   * @example "ACTIVE"
   */
  status: SavedSearchEntityStatusEnum;
  /**
   * Saved search type
   * @example "BUY"
   */
  type: SavedSearchEntityTypeEnum;
  /**
   * Saved search visibility. true=visible in saved searches list; false=transient /results context.
   * @default true
   */
  saved?: boolean;
  /**
   * Saved search title
   * @example "Saved search title"
   */
  title?: string;
  /**
   * Saved search description
   * @example "Saved search description"
   */
  description?: string;
  /**
   * Make model trim
   * @example [null]
   */
  makeModelTrim: MakeModelTrimDto[];
  /**
   * Year
   * @example 2021
   */
  year?: number;
  /**
   * Mileage
   * @example 10000
   */
  mileage?: number;
  /**
   * Condition
   * @example "ANY"
   */
  condition?: string;
  /**
   * Interior color
   * @example ["Black","Beige"]
   */
  interiorColor?: string[];
  /**
   * Exterior color
   * @example ["White","Blue"]
   */
  exteriorColor?: string[];
  /**
   * Body type
   * @example ["SUV","SEDAN"]
   */
  bodyType?: SavedSearchEntityBodyTypeEnum[];
  /**
   * Fuel type
   * @example ["GASOLINE","HYBRID"]
   */
  fuelType?: SavedSearchEntityFuelTypeEnum[];
  /**
   * Purpose
   * @example ["PERSONAL"]
   */
  purpose?: SavedSearchEntityPurposeEnum[];
  /**
   * Drive train
   * @example ["AWD","RWD"]
   */
  drivetrain?: SavedSearchEntityDrivetrainEnum[];
  /**
   * Transmission
   * @example ["AUTOMATIC"]
   */
  transmission?: SavedSearchEntityTransmissionEnum[];
  /**
   * Price total min
   * @example 10000
   */
  priceTotalMin?: number;
  /**
   * Price total max
   * @example 10000
   */
  priceTotalMax?: number;
  /**
   * Price monthly min
   * @example 10000
   */
  priceMonthlyMin?: number;
  /**
   * Price monthly max
   * @example 10000
   */
  priceMonthlyMax?: number;
  /**
   * Downpayment amount
   * @example 10000
   */
  downpaymentAmount?: number;
  /**
   * City + State
   * @example "New York, NY"
   */
  cityState?: string;
  /**
   * Zip
   * @example "10001"
   */
  zip?: string;
  /**
   * Latitude
   * @example 40.7128
   */
  latitude?: number;
  /**
   * Longitude
   * @example -74.006
   */
  longitude?: number;
  /**
   * Radius
   * @example 100
   */
  radius?: number;
  /**
   * Radius unit
   * @example "MI"
   */
  radiusUnit?: string;
  /**
   * Negotiation strategy
   * @example {"strategy":"strategy"}
   */
  negotiationStrategy?: NegotiationStrategyDto;
  /**
   * Creation date
   * @example "2021-01-01T00:00:00.000Z"
   */
  createdAt: string;
  /**
   * Update date
   * @example "2021-01-01T00:00:00.000Z"
   */
  updatedAt: string;
  /** Aggregated statistics for the saved search card */
  stats?: SavedSearchStatsEntity;
}

export interface NegotiationListOfferEntity {
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB-44. Null until backfill/create assigns it.
   * @example "8A-AB-44"
   */
  shortId?: object | null;
  priceAmount: number;
  priceType: PriceType;
  status: OfferStatus;
  senderUserId: string;
  recipientUserId: string;
  title?: object | null;
  description?: object | null;
  /** Best-effort sender role hint: true when the sender is a dealer user (derived from user flags) */
  senderIsDealer?: boolean;
  /** Exact terms snapshot text captured only when the offer becomes ACCEPTED (write-once) */
  terminalTerms?: object | null;
  /**
   * Version date (date-based) for the captured terminalTerms snapshot (write-once)
   * @example "2026-06-21"
   */
  terminalTermsVersionDate?: object | null;
  /**
   * Offer add-ons (stored as JSON)
   * @example []
   */
  addons: OfferAddonDto[];
  /**
   * Offer expiry (absolute timestamp, if set)
   * @example "2026-06-03T00:00:00.000Z"
   */
  expiresAtUtc?: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface NegotiationWithVehicleEntity {
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB. Null until backfill/create assigns it.
   * @example "8A-AB"
   */
  shortId?: object | null;
  /**
   * Buyer user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  buyerId: string;
  /**
   * Seller user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  sellerId: string;
  /**
   * Owning dealer id when the negotiation is dealer-scoped (staff access via DealerMember).
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  dealerId?: object | null;
  /**
   * Negotiation title
   * @example "Negotiation title"
   */
  title?: string;
  /**
   * Negotiation description
   * @example "Negotiation description"
   */
  description?: string;
  /**
   * Negotiation status
   * @example "NEGOTIATION_NEW"
   */
  status: NegotiationWithVehicleEntityStatusEnum;
  /**
   * Vehicle ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  vehicleId: string;
  /**
   * Optional saved-search origin. Null when the deal started without a parent search.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  savedSearchId?: object | null;
  /**
   * Creation date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  createdAt: string;
  /**
   * Negotiation base expiry (createdAt + baseDurationSeconds)
   * @example "2026-06-10T00:00:00.000Z"
   */
  baseExpiresAtUtc?: object | null;
  /**
   * Post-expiry rolling extension window (N), seconds
   * @example 259200
   */
  extensionWindowSeconds?: object | null;
  /**
   * Last mutation timestamp (offer/negotiation mutations only)
   * @example "2026-06-03T00:00:00.000Z"
   */
  lastMutationAtUtc?: object | null;
  /**
   * Strategy template key used for timing snapshot
   * @example "buy-balanced"
   */
  strategyTemplateKey?: object | null;
  /**
   * Strategy template version used for timing snapshot
   * @example "1.0.2"
   */
  strategyTemplateVersion?: object | null;
  /**
   * Update date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  updatedAt: string;
  /**
   * Vehicle
   * @example "Vehicle"
   */
  vehicle: VehicleEntity;
  /** Saved search (for target price on list) */
  savedSearch?: SavedSearchEntity;
  /** Offers oldest-first (for initial / current on list) */
  offers?: NegotiationListOfferEntity[];
}

export interface NegotiationsPageResponseDto {
  /** @example 1 */
  page: number;
  /** @example 10 */
  limit: number;
  /** @example 100 */
  total: number;
  /** @example 10 */
  pageCount: number;
  /** @example "Generic response data" */
  data: NegotiationWithVehicleEntity[];
  /** @example "Error message" */
  error: object;
  /** @example true */
  success: boolean;
  /** @example 200 */
  status: number;
}

export interface OffersVehicleWithOffersEntity {
  /** Vehicle ID */
  vehicleId: string;
  vehicle: VehicleEntity;
  /**
   * Negotiations count for this vehicle
   * @example 2
   */
  totalNegotiations: number;
  /**
   * Offers count across negotiations
   * @example 5
   */
  totalOffers: number;
  /**
   * Latest activity timestamp (ISO)
   * @example "2026-06-16T10:12:00.000Z"
   */
  updatedAtIso: string;
}

export interface OffersVehiclesResponseDto {
  /** @example 1 */
  page: number;
  /** @example 10 */
  limit: number;
  /** @example 100 */
  total: number;
  /** @example 10 */
  pageCount: number;
  /** @example "Generic response data" */
  data: OffersVehicleWithOffersEntity[];
  /** @example "Error message" */
  error: object;
  /** @example true */
  success: boolean;
  /** @example 200 */
  status: number;
  /**
   * Available vehicle makes for the current filter context
   * @example ["Toyota","Ford"]
   */
  makeOptions: string[];
}

export interface NegotiationStrategyFallback {
  /**
   * Fallback payment type when unknown
   * @example "finance"
   */
  whenUnknownPaymentType?: NegotiationStrategyFallbackWhenUnknownPaymentTypeEnum;
}

export interface NegotiationStrategyThreshold {
  /** Fixed discount amount (same units as baseline) */
  fixed?: number;
  /** Percent discount from baseline (0-100) */
  percent?: number;
  /** Operation combining fixed+percent when both are present (OR=more restrictive, AND=less restrictive) */
  op?: NegotiationStrategyThresholdOpEnum;
}

export interface NegotiationStrategyGuardrailsByPaymentType {
  cash?: NegotiationStrategyThreshold;
  finance?: NegotiationStrategyThreshold;
  lease?: NegotiationStrategyThreshold;
}

export interface NegotiationStrategyAgeGuardrailEntry {
  /** Guardrail kind scoped by offer age */
  kind: NegotiationStrategyAgeGuardrailEntryKindEnum;
  /** Offer payment type for which the threshold applies. Optional for section-local guardrails (payment type is implied by the section). */
  paymentType?: NegotiationStrategyAgeGuardrailEntryPaymentTypeEnum;
  /** Threshold to apply within the age window */
  threshold: NegotiationStrategyThreshold;
  /**
   * Minimum offer age in cycles (inclusive). Default 0.
   * @example 0
   */
  minAgeCycles?: object;
  /**
   * Maximum offer age in cycles (inclusive). Null/omitted means no upper bound.
   * @example 3
   */
  maxAgeCycles?: object | null;
}

export interface NegotiationStrategySectionEntity {
  /**
   * Overall goals & targets (section-scoped)
   * @maxLength 800
   */
  overallGoalsAndTargets?: string;
  /**
   * Demands
   * @maxLength 250
   */
  demands?: string;
  /**
   * Concessions
   * @maxLength 800
   */
  concessions?: string;
  /**
   * Reject criteria
   * @maxLength 800
   */
  reject?: string;
  /**
   * Accept criteria
   * @maxLength 800
   */
  accept?: string;
  /**
   * Drop criteria
   * @maxLength 800
   */
  drop?: string;
  /** Guardrail: auto reject (seller) / floor threshold for this payment type */
  minCutOffValue?: NegotiationStrategyThreshold;
  /** Guardrail: auto accept (seller) threshold for this payment type */
  minAutoAccept?: NegotiationStrategyThreshold;
  /** Guardrail: auto reject (buyer) ceiling threshold for this payment type */
  maxCutOffValue?: NegotiationStrategyThreshold;
  /** Guardrail: auto accept (buyer) ceiling threshold for this payment type */
  maxAutoAccept?: NegotiationStrategyThreshold;
  /** Age-window-scoped guardrails for this payment type */
  ageGuardrails?: NegotiationStrategyAgeGuardrailEntry[];
}

export interface NegotiationStrategyDataEntity {
  /**
   * Strategy name
   * @maxLength 120
   * @example "Standard AI Negotiation - 1"
   */
  strategyName: string;
  /**
   * Short strategy description
   * @maxLength 160
   * @example "Closing-focused strategy with minimal back-and-forth and clear next steps."
   */
  description?: string;
  /**
   * Demands
   * @maxLength 250
   * @example "Request a $2,000 price reduction based on local market averages. Demand removal of dealer add-ons."
   */
  demands?: string;
  /**
   * Concessions
   * @maxLength 800
   * @example "Willing to accept a higher documentation fee if the vehicle price is reduced by an equivalent amount."
   */
  concessions?: string;
  /**
   * Reject criteria
   * @maxLength 800
   * @example "Reject any offer that includes non-removable dealer add-ons exceeding $1,000 in total value."
   */
  reject?: string;
  /**
   * Accept criteria
   * @maxLength 800
   * @example "Accept if the total out-the-door price is within $500 of the target price."
   */
  accept?: string;
  /**
   * Drop criteria
   * @maxLength 800
   * @example "Drop negotiation if the dealer fails to respond within 48 hours or increases the price after the initial counter."
   */
  drop?: string;
  /**
   * Communication rules
   * @maxLength 800
   * @example "Use a friendly and professional tone. Keep messages concise and to the point."
   */
  communicationRules?: string;
  /**
   * Strategy schema version
   * @example "2.0"
   */
  version?: string;
  /** Section selection fallback settings */
  fallback?: NegotiationStrategyFallback;
  /**
   * Default offer expiration duration (seconds)
   * @example 172800
   */
  offerExpirationSeconds?: number;
  /**
   * Negotiation base duration since creation (seconds)
   * @example 2592000
   */
  negotiationBaseDurationSeconds?: number;
  /**
   * Negotiation post-expiry extension window (seconds) applied on mutation activity after base expiry
   * @example 86400
   */
  negotiationPostExpiryExtensionSeconds?: number;
  /** Guardrail: auto reject without LLM decisioning when offer value is below the configured threshold (per payment type). */
  minCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail: auto accept without LLM decisioning when offer value meets/exceeds the configured threshold (per payment type). */
  minAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto reject without LLM decisioning when offer value exceeds the configured ceiling (per payment type). */
  maxCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto accept without LLM decisioning when offer value is at/below the configured ceiling (per payment type). */
  maxAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Age-window-scoped guardrails (per payment type) applied based on inbound delivered-offer step; minAgeCycles 0 = first inbound. */
  ageGuardrails?: NegotiationStrategyAgeGuardrailEntry[];
  /** Optional soft cap on persisted messages for the whole negotiation. May only lower the platform setting Negotiation:MaxPersistedMessagesPerNegotiation. */
  maxPersistedMessagesPerNegotiation?: number;
  /** Cash section (TOTAL) */
  cash?: NegotiationStrategySectionEntity;
  /** Finance section (MONTHLY) */
  finance?: NegotiationStrategySectionEntity;
  /** Lease section (MONTHLY) */
  lease?: NegotiationStrategySectionEntity;
}

export interface NegotiationStrategyEntity {
  /**
   * Strategy ID
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * User ID (null for template strategies)
   * @format uuid
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  userId?: string | null;
  /**
   * Strategy kind
   * @example "BUY"
   */
  kind: NegotiationStrategyEntityKindEnum;
  /**
   * Is default strategy for this user
   * @example false
   */
  default: boolean;
  /**
   * Is template (global) strategy
   * @example false
   */
  template: boolean;
  /** Negotiation strategy data (JSON) */
  data: NegotiationStrategyDataEntity;
  /**
   * Created at
   * @format date-time
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   */
  updatedAt: string;
}

export interface OfferEntity {
  /**
   * Offer ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB-44. Null until backfill/create assigns it.
   * @example "8A-AB-44"
   */
  shortId?: object | null;
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  negotiationId: string;
  /**
   * Sender user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  senderUserId: string;
  /**
   * Recipient user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  recipientUserId: string;
  /**
   * Title
   * @example "Offer Title"
   */
  title: string;
  /**
   * Description
   * @example "Offer Description"
   */
  description: string;
  /**
   * Status
   * @example "NEW"
   */
  status: OfferStatus;
  /**
   * Best-effort standard terms version reference (date-based) for this offer
   * @example "2026-06-21"
   */
  termsVersionDate?: object | null;
  /** Terminal state (write-once, when offer becomes terminal) */
  terminalState?: OfferStatus | null;
  /** Exact terms snapshot text captured only when the offer becomes ACCEPTED (write-once) */
  terminalTerms?: object | null;
  /**
   * Version date (date-based) for the captured terminalTerms snapshot (write-once)
   * @example "2026-06-21"
   */
  terminalTermsVersionDate?: object | null;
  /**
   * Terminal timestamp (UTC, write-once)
   * @example "2026-06-21T00:00:00.000Z"
   */
  terminalAtUtc?: object | null;
  /** Terminal actor type (write-once) */
  terminalBy?: OfferActorType | null;
  /**
   * Terminal actor id (write-once; null for System)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  terminalById?: object | null;
  /** Best-effort sender role hint: true when the sender is a dealer user (derived from user flags) */
  senderIsDealer?: boolean;
  /**
   * Negotiation strategy
   * @example "Negotiation strategy"
   */
  negotiationStrategy: NegotiationStrategyDto;
  /**
   * Price amount
   * @example 10000
   */
  priceAmount: number;
  /**
   * Price type
   * @example "TOTAL"
   */
  priceType: PriceType;
  /**
   * Offer expiry (absolute timestamp, if set)
   * @example "2026-06-03T00:00:00.000Z"
   */
  expiresAtUtc: object | null;
  /**
   * Offer add-ons (stored as JSON)
   * @example []
   */
  addons: OfferAddonDto[];
  /**
   * Created at
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  updatedAt: string;
}

export interface FullNegotiationEntity {
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Hierarchical short id (uppercase), e.g. 8A-AB. Null until backfill/create assigns it.
   * @example "8A-AB"
   */
  shortId?: object | null;
  /**
   * Buyer user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  buyerId: string;
  /**
   * Seller user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  sellerId: string;
  /**
   * Owning dealer id when the negotiation is dealer-scoped (staff access via DealerMember).
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  dealerId?: object | null;
  /**
   * Negotiation title
   * @example "Negotiation title"
   */
  title?: string;
  /**
   * Negotiation description
   * @example "Negotiation description"
   */
  description?: string;
  /**
   * Negotiation status
   * @example "NEGOTIATION_NEW"
   */
  status: FullNegotiationEntityStatusEnum;
  /**
   * Vehicle ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  vehicleId: string;
  /**
   * Optional saved-search origin. Null when the deal started without a parent search.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  savedSearchId?: object | null;
  /**
   * Creation date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  createdAt: string;
  /**
   * Negotiation base expiry (createdAt + baseDurationSeconds)
   * @example "2026-06-10T00:00:00.000Z"
   */
  baseExpiresAtUtc?: object | null;
  /**
   * Post-expiry rolling extension window (N), seconds
   * @example 259200
   */
  extensionWindowSeconds?: object | null;
  /**
   * Last mutation timestamp (offer/negotiation mutations only)
   * @example "2026-06-03T00:00:00.000Z"
   */
  lastMutationAtUtc?: object | null;
  /**
   * Strategy template key used for timing snapshot
   * @example "buy-balanced"
   */
  strategyTemplateKey?: object | null;
  /**
   * Strategy template version used for timing snapshot
   * @example "1.0.2"
   */
  strategyTemplateVersion?: object | null;
  /**
   * Update date
   * @format date-time
   * @example "2021-01-01T00:00:00.000Z"
   */
  updatedAt: string;
  /**
   * Vehicle
   * @example "Vehicle"
   */
  vehicle: VehicleEntity;
  /**
   * Saved search origin, when the deal started from a search
   * @example "Saved search"
   */
  savedSearch?: SavedSearchEntity | null;
  /** Negotiation strategy resolved for the current participant */
  negotiationStrategy?: NegotiationStrategyEntity;
  /**
   * Offers
   * @example "Offers"
   */
  offers: OfferEntity[];
  /** Live vehicle owner user id when known. Prefer this over sellerId for seller-principal checks. */
  vehicleOwnerUserId?: object | null;
}

export interface FullNegotiationResponseDto {
  /**
   * Full negotiation
   * @example "Full negotiation"
   */
  data: FullNegotiationEntity;
}

export interface UpdateNegotiationDto {
  /** Optional origin saved search. Omit when starting from vehicle/dealer details. */
  savedSearchId?: string;
  /** The id of the vehicle */
  vehicleId?: string;
  /** Selected buyer negotiation strategy id */
  buyerStrategyId?: string;
  /**
   * True when create is started from the multi-vehicle negotiation wizard. Drives auto-send handshake, price clamp, and base-expiry override. Do not infer this from initialOfferTitle (titles are human-readable).
   * @example true
   */
  isMultiNegotiationStart?: boolean;
  /**
   * Optional override for the negotiation base expiry timestamp (UTC). Used by multi-negotiation Step 4 Expiration Date selector.
   * @format date-time
   * @example "2026-06-30T23:59:59.999Z"
   */
  negotiationBaseExpiresAtUtc?: string;
  /**
   * When provided together with initialOfferPriceType, the first offer uses these values (e.g. multi-vehicle dialog) instead of vehicle list price
   * @example 28500
   */
  initialOfferPriceAmount?: number;
  /** Price type for the initial offer when initialOfferPriceAmount is set */
  initialOfferPriceType?: UpdateNegotiationDtoInitialOfferPriceTypeEnum;
  /** Optional title for the initial offer */
  initialOfferTitle?: string;
  /** Optional description / context for the initial offer */
  initialOfferDescription?: string;
  /** Add-ons for the initial offer */
  initialOfferAddons?: OfferAddonDto[];
  /**
   * Negotiation status
   * @example "NEGOTIATION_OPEN"
   */
  status?: UpdateNegotiationDtoStatusEnum;
  /** Buyer user id */
  buyerId?: string;
  /** Seller user id */
  sellerId?: string;
}

export interface RequestNegotiationStrategyChangeDto {
  /** New strategy id */
  strategyId: string;
}

export interface ConfirmNegotiationStrategyChangeDto {
  /** New strategy id */
  strategyId: string;
  /**
   * Chosen expiration option action key from the request response
   * @example "keep-current"
   */
  actionKey: string;
}

export interface ExistingNegotiationsForVehiclesDto {
  /** Vehicle ids to check for an existing negotiation for the current user */
  vehicleIds: string[];
}

export interface ExistingNegotiationsLookupDto {
  /** Saved search id used for negotiation lookup */
  savedSearchId: string;
  /**
   * Vehicle ids to check for an existing negotiation
   * @example ["vehicle-1","vehicle-2"]
   */
  vehicleIds: string[];
}

export interface CreateNegotiationStrategyRequestDto {
  /**
   * Strategy name
   * @maxLength 120
   * @example "Standard AI Negotiation - 1"
   */
  strategyName: string;
  /**
   * Short strategy description
   * @maxLength 160
   * @example "Closing-focused strategy with minimal back-and-forth and clear next steps."
   */
  description?: string;
  /**
   * Demands
   * @maxLength 250
   * @example "Request a $2,000 price reduction based on local market averages. Demand removal of dealer add-ons."
   */
  demands?: string;
  /**
   * Concessions
   * @maxLength 800
   * @example "Willing to accept a higher documentation fee if the vehicle price is reduced by an equivalent amount."
   */
  concessions?: string;
  /**
   * Reject criteria
   * @maxLength 800
   * @example "Reject any offer that includes non-removable dealer add-ons exceeding $1,000 in total value."
   */
  reject?: string;
  /**
   * Accept criteria
   * @maxLength 800
   * @example "Accept if the total out-the-door price is within $500 of the target price."
   */
  accept?: string;
  /**
   * Drop criteria
   * @maxLength 800
   * @example "Drop negotiation if the dealer fails to respond within 48 hours or increases the price after the initial counter."
   */
  drop?: string;
  /**
   * Communication rules
   * @maxLength 800
   * @example "Use a friendly and professional tone. Keep messages concise and to the point."
   */
  communicationRules?: string;
  /**
   * Strategy schema version
   * @example "2.0"
   */
  version?: string;
  /** Section selection fallback settings */
  fallback?: NegotiationStrategyFallback;
  /**
   * Default offer expiration duration (seconds)
   * @example 172800
   */
  offerExpirationSeconds?: number;
  /**
   * Negotiation base duration since creation (seconds)
   * @example 2592000
   */
  negotiationBaseDurationSeconds?: number;
  /**
   * Negotiation post-expiry extension window (seconds) applied on mutation activity after base expiry
   * @example 86400
   */
  negotiationPostExpiryExtensionSeconds?: number;
  /** Guardrail: auto reject without LLM decisioning when offer value is below the configured threshold (per payment type). */
  minCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail: auto accept without LLM decisioning when offer value meets/exceeds the configured threshold (per payment type). */
  minAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto reject without LLM decisioning when offer value exceeds the configured ceiling (per payment type). */
  maxCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto accept without LLM decisioning when offer value is at/below the configured ceiling (per payment type). */
  maxAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Age-window-scoped guardrails (per payment type) applied based on inbound delivered-offer step; minAgeCycles 0 = first inbound. */
  ageGuardrails?: NegotiationStrategyAgeGuardrailEntry[];
  /** Optional soft cap on persisted messages for the whole negotiation. May only lower the platform setting Negotiation:MaxPersistedMessagesPerNegotiation. */
  maxPersistedMessagesPerNegotiation?: number;
  /** Cash section (TOTAL) */
  cash?: NegotiationStrategySectionEntity;
  /** Finance section (MONTHLY) */
  finance?: NegotiationStrategySectionEntity;
  /** Lease section (MONTHLY) */
  lease?: NegotiationStrategySectionEntity;
  /** Strategy kind */
  kind: CreateNegotiationStrategyRequestDtoKindEnum;
  /**
   * Whether this strategy is default for (userId, kind)
   * @default false
   */
  default?: boolean;
  /**
   * Template flag (dashboard sends true on create)
   * @default true
   */
  template?: boolean;
}

export interface UpdateNegotiationStrategyRequestDto {
  /**
   * Strategy name
   * @maxLength 120
   * @example "Standard AI Negotiation - 1"
   */
  strategyName?: string;
  /**
   * Short strategy description
   * @maxLength 160
   * @example "Closing-focused strategy with minimal back-and-forth and clear next steps."
   */
  description?: string;
  /**
   * Demands
   * @maxLength 250
   * @example "Request a $2,000 price reduction based on local market averages. Demand removal of dealer add-ons."
   */
  demands?: string;
  /**
   * Concessions
   * @maxLength 800
   * @example "Willing to accept a higher documentation fee if the vehicle price is reduced by an equivalent amount."
   */
  concessions?: string;
  /**
   * Reject criteria
   * @maxLength 800
   * @example "Reject any offer that includes non-removable dealer add-ons exceeding $1,000 in total value."
   */
  reject?: string;
  /**
   * Accept criteria
   * @maxLength 800
   * @example "Accept if the total out-the-door price is within $500 of the target price."
   */
  accept?: string;
  /**
   * Drop criteria
   * @maxLength 800
   * @example "Drop negotiation if the dealer fails to respond within 48 hours or increases the price after the initial counter."
   */
  drop?: string;
  /**
   * Communication rules
   * @maxLength 800
   * @example "Use a friendly and professional tone. Keep messages concise and to the point."
   */
  communicationRules?: string;
  /**
   * Strategy schema version
   * @example "2.0"
   */
  version?: string;
  /** Section selection fallback settings */
  fallback?: NegotiationStrategyFallback;
  /**
   * Default offer expiration duration (seconds)
   * @example 172800
   */
  offerExpirationSeconds?: number;
  /**
   * Negotiation base duration since creation (seconds)
   * @example 2592000
   */
  negotiationBaseDurationSeconds?: number;
  /**
   * Negotiation post-expiry extension window (seconds) applied on mutation activity after base expiry
   * @example 86400
   */
  negotiationPostExpiryExtensionSeconds?: number;
  /** Guardrail: auto reject without LLM decisioning when offer value is below the configured threshold (per payment type). */
  minCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail: auto accept without LLM decisioning when offer value meets/exceeds the configured threshold (per payment type). */
  minAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto reject without LLM decisioning when offer value exceeds the configured ceiling (per payment type). */
  maxCutOffValue?: NegotiationStrategyGuardrailsByPaymentType;
  /** Guardrail (buyer): auto accept without LLM decisioning when offer value is at/below the configured ceiling (per payment type). */
  maxAutoAccept?: NegotiationStrategyGuardrailsByPaymentType;
  /** Age-window-scoped guardrails (per payment type) applied based on inbound delivered-offer step; minAgeCycles 0 = first inbound. */
  ageGuardrails?: NegotiationStrategyAgeGuardrailEntry[];
  /** Optional soft cap on persisted messages for the whole negotiation. May only lower the platform setting Negotiation:MaxPersistedMessagesPerNegotiation. */
  maxPersistedMessagesPerNegotiation?: number;
  /** Cash section (TOTAL) */
  cash?: NegotiationStrategySectionEntity;
  /** Finance section (MONTHLY) */
  finance?: NegotiationStrategySectionEntity;
  /** Lease section (MONTHLY) */
  lease?: NegotiationStrategySectionEntity;
  /**
   * Whether this strategy is default
   * @default false
   */
  default?: boolean;
  /**
   * Template flag
   * @default true
   */
  template?: boolean;
}

export interface LeadEntity {
  /** Lead ID (UUIDv7 generated in app) */
  id: string;
  vehicleId: string;
  /** Resolved FeedSource id (nullable when routing failed) */
  feedSourceId?: object | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  /** User-provided comments */
  comments: string;
  status: LeadEntityStatusEnum;
  /** Provider error details for troubleshooting. This is not shown to the end-user and must not break the lead endpoint response. */
  error?: object | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadInstructionsDto {
  /** Page title */
  title: string;
  /** Prerequisites checklist */
  prerequisites: string[];
  /** Step-by-step instructions */
  steps: string[];
  /** Troubleshooting items */
  troubleshooting: string[];
}

export interface LeadRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  /** Free-form comments from the lead request */
  comments: string;
  /** Vehicle ID for which lead is created */
  vehicleId: string;
}

export interface LeadSetupEntity {
  /** LeadSetup ID (UUIDv7 generated in app) */
  id: string;
  /** FeedSource id this setup belongs to */
  feedSourceId: string;
  /** When set, this setup applies only to the given dealer. When null, it is the feed-wide default. */
  dealerId?: object;
  /** Dealer business name (present on list responses) */
  dealerName?: object;
  type: LeadSetupEntityTypeEnum;
  /** Provider credentials JSON (stored as jsonb). For EMAIL: { toEmail?, fromEmail?, subject? }. For ELEADS: { toEmail?, fromEmail?, subject? }. Destination priority: 1) credentials.toEmail, 2) Dealer.ownerEmail, then ELEADS defaults. */
  credentials: Record<string, any>;
  /** Provider data template. For EMAIL, this is the message body template and may reference lead fields like {{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{zip}}, {{comments}}. */
  data: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadSetupDealerOptionDto {
  id: string;
  businessName: object | null;
  status: string;
}

export interface CreateLeadSetupDto {
  /** FeedSource id this setup belongs to */
  feedSourceId: string;
  /** Optional dealer id for per-dealer setup. Omit or null for feed-wide default. */
  dealerId?: object;
  /** @default "ELEADS" */
  type: CreateLeadSetupDtoTypeEnum;
  /**
   * Provider credentials JSON. For EMAIL: { toEmail?, fromEmail?, subject? }. For ELEADS: { toEmail?, fromEmail?, subject? }. Destination priority: 1) credentials.toEmail, 2) Dealer.ownerEmail. Sales contact email is not used for lead routing.
   * @example {"toEmail":"dealer@example.com","fromEmail":"no-reply@localhost","subject":"New lead"}
   */
  credentials: Record<string, any>;
  /**
   * Provider data template. For EMAIL, this is the message body template and may reference lead fields like {{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{zip}}, {{comments}} and vehicle fields like {{vehicleTitle}}, {{vehicleUrl}}.
   * @example "Title: {{vehicleTitle}} ({{vehicleUrl}})\n\nLead: {{firstName}} {{lastName}}\nEmail: {{email}}\nPhone: {{phone}}\nZIP: {{zip}}\nComments: {{comments}}\nLeadId: {{leadId}}"
   */
  data: string;
}

export interface OfferStandardTermsEntity {
  side: OfferTermsSide;
  isDealer: boolean;
  /**
   * Date-based version label (UTC).
   * @example "2026-06-21"
   */
  versionDate: string;
  /**
   * Timestamp of the last change for this version (UTC).
   * @format date-time
   * @example "2026-06-21T00:00:00.000Z"
   */
  changedAtUtc: string;
  /** @example "Buyer's Standard Offer Terms" */
  title: string;
  /** Markdown body for rendering in UI. */
  bodyMarkdown: string;
  isActive?: boolean;
}

export interface UpsertOfferStandardTermsDto {
  side: OfferTermsSide;
  /** @default false */
  isDealer: boolean;
  /**
   * Date-based version label (UTC).
   * @example "2026-06-21"
   */
  versionDate: string;
  /**
   * Timestamp for the change event (UTC ISO).
   * @example "2026-06-21T00:00:00.000Z"
   */
  changedAtUtc?: string;
  /** @example "Buyer's Standard Offer Terms" */
  title: string;
  /** Markdown body for rendering in UI. */
  bodyMarkdown: string;
  /**
   * When true, also activates this version for (side,isDealer).
   * @default false
   */
  makeActive?: boolean;
}

export interface PermissionsDto {
  /** Action */
  action: string;
  /** Subject */
  subject: string;
}

export interface DealerMembershipPermissionsDto {
  dealerId: string;
  dealerName?: object | null;
  role: string;
  /** Expanded permission slugs (owner all is expanded). */
  permissions: string[];
}

export interface PermissionsMeResponseDto {
  /** Legacy CASL flat snapshot (compat). */
  permissions: PermissionsDto[];
  memberships: DealerMembershipPermissionsDto[];
  platformAdmin: boolean;
}

export interface UpdateUserDto {
  /** User id (Cognito sub) */
  id?: string;
  /** User name */
  name?: string;
  /** User avatar */
  avatar?: object | null;
  /** User email */
  email?: string;
  /** Preferred contact email for negotiation follow-up (may differ from login email). */
  contactEmail?: object | null;
  /** Preferred contact phone for negotiation follow-up. */
  contactPhone?: object | null;
  /**
   * User created at
   * @format date-time
   */
  createdAt?: string;
  /**
   * User updated at
   * @format date-time
   */
  updatedAt?: string;
  /** User dealer */
  dealerAdmin?: boolean;
  /** User dealer */
  dealerManager?: boolean;
  /** User dealer */
  dealerReader?: boolean;
  /** User platform */
  platformAdmin?: boolean;
  /** User agent */
  agent?: boolean;
  /** Preferred search ZIP (read via GET profile; write via PATCH /user/profile/preferred-location) */
  preferredZip?: object | null;
  /** Preferred City/State label (read via GET profile; write via PATCH /user/profile/preferred-location) */
  preferredCityState?: object | null;
  /** Unread-chat email digest timing in minutes (read via GET profile; write via PATCH /user/notification-settings). Null = system default. */
  unreadEmailTimingMinutes?: UpdateUserDtoUnreadEmailTimingMinutesEnum | null;
}

export interface CreateOfferDto {
  /**
   * Negotiation ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  negotiationId: string;
  /**
   * Sender user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  senderUserId: string;
  /**
   * Recipient user ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  recipientUserId: string;
  /**
   * Title
   * @example "Offer Title"
   */
  title?: string;
  /**
   * Description
   * @example "Offer Description"
   */
  description?: string;
  /**
   * Price amount
   * @example 10000
   */
  priceAmount: number;
  /**
   * Price type
   * @example "TOTAL"
   */
  priceType: string;
  /**
   * Offer add-ons (stored as JSON)
   * @example []
   */
  addons?: OfferAddonDto[];
}

export interface UpdateOfferDto {
  /**
   * Title
   * @example "Offer Title"
   */
  title?: string;
  /**
   * Description
   * @example "Offer Description"
   */
  description?: string;
  /**
   * Status
   * @example "NEW"
   */
  status?: string;
  /**
   * Price amount
   * @example 10000
   */
  priceAmount?: number;
  /**
   * Price type
   * @example "TOTAL"
   */
  priceType?: string;
  /**
   * Offer add-ons (stored as JSON)
   * @example []
   */
  addons?: OfferAddonDto[];
}

export interface OfferAddonTemplateEntity {
  /**
   * Addon template ID
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  /**
   * Addon title
   * @example "Extended warranty"
   */
  title: string;
  /**
   * Addon description
   * @example "Adds 24 months of coverage"
   */
  description: string;
  /**
   * Optional placeholder (internal/technical)
   * @example "For internal UI hints"
   */
  placeholder: string;
  /**
   * Optional SavedSearchType this template applies to (null = any)
   * @example "BUY"
   */
  savedSearchType?: OfferAddonTemplateEntitySavedSearchTypeEnum;
  /**
   * Price delta (can be negative)
   * @example 499.99
   */
  priceAmount: number;
  /**
   * How addon price should be applied
   * @example "UPFRONT"
   */
  priceType: OfferAddonTemplateEntityPriceTypeEnum;
  /**
   * Created at
   * @format date-time
   * @example "2026-04-03T17:00:00.000Z"
   */
  createdAt: string;
  /**
   * Updated at
   * @format date-time
   * @example "2026-04-03T17:00:00.000Z"
   */
  updatedAt: string;
}

export interface CreateOfferAddonDto {
  /**
   * Addon title
   * @example "Extended warranty"
   */
  title: string;
  /**
   * Addon description
   * @example "Adds 24 months of coverage"
   */
  description?: string;
  /**
   * Optional placeholder (internal/technical)
   * @example "For internal UI hints"
   */
  placeholder?: string;
  /**
   * Optional SavedSearchType this template applies to (null = any)
   * @example "BUY"
   */
  savedSearchType?: CreateOfferAddonDtoSavedSearchTypeEnum;
  /**
   * Price delta for this addon (can be negative)
   * @example 499.99
   */
  priceAmount: number;
  /**
   * How addon price should be applied
   * @example "UPFRONT"
   */
  priceType: CreateOfferAddonDtoPriceTypeEnum;
}

export interface CreateVehicleDto {
  /** Current vehicle owner user id (live; may differ from negotiation.sellerId) */
  userId?: string;
  /**
   * Vehicle status (stored as TEXT in DB)
   * @default "ACTIVE"
   */
  status?: CreateVehicleDtoStatusEnum;
  /** Stock number */
  stockNumber?: string;
  /** VIN */
  vin?: string;
  /** Year */
  year: number;
  /** Make */
  make: string;
  /** Model */
  model: string;
  /** Mileage */
  mileage: number;
  /** Days on market from feed (dealer-reported); optional */
  daysOnMarket?: object;
  /** Trim */
  trim?: string;
  /** Body type (stored as TEXT in DB) */
  bodyType?: string;
  /** Fuel type (stored as TEXT in DB) */
  fuelType?: string;
  /** Drivetrain (stored as TEXT in DB) */
  drivetrain?: string;
  /** Purpose (stored as TEXT in DB) */
  purpose?: string;
  /** Conditions (stored as TEXT in DB) */
  condition?: string;
  /** Description */
  description?: string;
  /** URL */
  url?: string;
  /** Price */
  price?: number;
  /** Cost */
  cost?: number;
  /** Min finance monthly payment */
  minFinanceMonthlyPayment?: number;
  /** Min lease monthly payment */
  minLeaseMonthlyPayment?: number;
  /** Assigned finance plan id */
  financePlanId?: object;
  /** Assigned finance plan name */
  financePlanName?: object;
  /** Predicted SELL strategy name if a negotiation were created now */
  predictedSellerStrategyName?: object;
  /** Finance mode: off | generic | plan */
  financeMode?: string;
  /** Last imported generic finance monthly */
  financeGenericMonthly?: object;
  /** Images (URLs or identifiers) */
  images?: string[];
  /** Interior color */
  interiorColor?: string;
  /** Exterior color */
  exteriorColor?: string;
  /** Address */
  address?: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** ZIP */
  zip?: string;
  /** Country */
  country?: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
}

export interface FindAllVehiclesQueryDto {
  /** Page number */
  page?: number;
  /** Limit number */
  limit?: number;
  /** Sort field */
  sort?: string;
  /** Sort order */
  sortOrder?: string;
  /** Search query */
  search?: string;
  /** Filters */
  filters?: string[];
  /** Fields */
  fields?: string[];
}

export interface UpdateVehicleDto {
  /** Current vehicle owner user id (live; may differ from negotiation.sellerId) */
  userId?: string;
  /**
   * Vehicle status (stored as TEXT in DB)
   * @default "ACTIVE"
   */
  status?: UpdateVehicleDtoStatusEnum;
  /** Stock number */
  stockNumber?: string;
  /** VIN */
  vin?: string;
  /** Year */
  year: number;
  /** Make */
  make: string;
  /** Model */
  model: string;
  /** Mileage */
  mileage: number;
  /** Days on market from feed (dealer-reported); optional */
  daysOnMarket?: object;
  /** Trim */
  trim?: string;
  /** Body type (stored as TEXT in DB) */
  bodyType?: string;
  /** Fuel type (stored as TEXT in DB) */
  fuelType?: string;
  /** Drivetrain (stored as TEXT in DB) */
  drivetrain?: string;
  /** Purpose (stored as TEXT in DB) */
  purpose?: string;
  /** Conditions (stored as TEXT in DB) */
  condition?: string;
  /** Description */
  description?: string;
  /** URL */
  url?: string;
  /** Price */
  price?: number;
  /** Cost */
  cost?: number;
  /** Min finance monthly payment */
  minFinanceMonthlyPayment?: number;
  /** Min lease monthly payment */
  minLeaseMonthlyPayment?: number;
  /** Assigned finance plan id */
  financePlanId?: object;
  /** Assigned finance plan name */
  financePlanName?: object;
  /** Predicted SELL strategy name if a negotiation were created now */
  predictedSellerStrategyName?: object;
  /** Finance mode: off | generic | plan */
  financeMode?: string;
  /** Last imported generic finance monthly */
  financeGenericMonthly?: object;
  /** Images (URLs or identifiers) */
  images?: string[];
  /** Interior color */
  interiorColor?: string;
  /** Exterior color */
  exteriorColor?: string;
  /** Address */
  address?: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** ZIP */
  zip?: string;
  /** Country */
  country?: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
}

export interface SearchVehicleQueryDto {
  /** The query to search for */
  make?: string;
  /** The model to search for */
  model?: string;
  /** The year to search for */
  year?: number;
  /** The price to search for */
  priceMin?: number;
  /** The price to search for */
  priceMax?: number;
  /** The mileage to search for */
  mileage?: number;
}

export interface CreateSavedSearchDto {
  /**
   * Saved search status
   * @example "ACTIVE"
   */
  status: CreateSavedSearchDtoStatusEnum;
  /**
   * Saved search type
   * @example "BUY"
   */
  type: CreateSavedSearchDtoTypeEnum;
  /**
   * Saved search visibility. true=visible in saved searches list; false=transient /results context.
   * @default true
   */
  saved?: boolean;
  /**
   * Saved search title
   * @example "Saved search title"
   */
  title?: string;
  /**
   * Saved search description
   * @example "Saved search description"
   */
  description?: string;
  /**
   * Make model trim
   * @example [null]
   */
  makeModelTrim: MakeModelTrimDto[];
  /**
   * Year
   * @example 2021
   */
  year?: number;
  /**
   * Mileage
   * @example 10000
   */
  mileage?: number;
  /**
   * Condition
   * @example "ANY"
   */
  condition?: string;
  /**
   * Interior color
   * @example ["Black","Beige"]
   */
  interiorColor?: string[];
  /**
   * Exterior color
   * @example ["White","Blue"]
   */
  exteriorColor?: string[];
  /**
   * Body type
   * @example ["SUV","SEDAN"]
   */
  bodyType?: CreateSavedSearchDtoBodyTypeEnum[];
  /**
   * Fuel type
   * @example ["GASOLINE","HYBRID"]
   */
  fuelType?: CreateSavedSearchDtoFuelTypeEnum[];
  /**
   * Purpose
   * @example ["PERSONAL"]
   */
  purpose?: CreateSavedSearchDtoPurposeEnum[];
  /**
   * Drive train
   * @example ["AWD","RWD"]
   */
  drivetrain?: CreateSavedSearchDtoDrivetrainEnum[];
  /**
   * Transmission
   * @example ["AUTOMATIC"]
   */
  transmission?: CreateSavedSearchDtoTransmissionEnum[];
  /**
   * Price total min
   * @example 10000
   */
  priceTotalMin?: number;
  /**
   * Price total max
   * @example 10000
   */
  priceTotalMax?: number;
  /**
   * Price monthly min
   * @example 10000
   */
  priceMonthlyMin?: number;
  /**
   * Price monthly max
   * @example 10000
   */
  priceMonthlyMax?: number;
  /**
   * Downpayment amount
   * @example 10000
   */
  downpaymentAmount?: number;
  /**
   * City + State
   * @example "New York, NY"
   */
  cityState?: string;
  /**
   * Zip
   * @example "10001"
   */
  zip?: string;
  /**
   * Latitude
   * @example 40.7128
   */
  latitude?: number;
  /**
   * Longitude
   * @example -74.006
   */
  longitude?: number;
  /**
   * Radius
   * @example 100
   */
  radius?: number;
  /**
   * Radius unit
   * @example "MI"
   */
  radiusUnit?: string;
  /** Aggregated statistics for the saved search card */
  stats?: SavedSearchStatsEntity;
}

export interface ModelTrimFilterDto {
  model?: object | null;
  trims?: string[] | null;
}

export interface MakeModelTrimFilterDto {
  make?: object | null;
  models?: ModelTrimFilterDto[] | null;
}

export interface YearRangeFilterDto {
  min?: object;
  max?: object;
}

export interface PriceRangeFilterDto {
  min?: object;
  max?: object;
}

export interface MileageRangeFilterDto {
  min?: object;
  max?: object;
}

export interface SearchFiltersDto {
  makeModelTrimFilters?: MakeModelTrimFilterDto[] | null;
  year?: YearRangeFilterDto;
  price?: PriceRangeFilterDto;
  maxFinanceMonthlyPayment?: object | null;
  maxLeaseMonthlyPayment?: object | null;
  mileage?: MileageRangeFilterDto;
  fuelTypes?: string[] | null;
  transmissions?: string[] | null;
  bodyTypes?: string[] | null;
  interiorColors?: string[] | null;
  exteriorColors?: string[] | null;
  drivetrains?: string[] | null;
}

export interface FindAllSavedSearchQueryDto {
  /**
   * Page number (1-based)
   * @default 1
   */
  page?: number;
  /**
   * Limit per page
   * @default 20
   */
  limit?: number;
  /**
   * When true (default), return only saved searches. When false, return only transient (saved=false).
   * @default true
   */
  saved?: boolean;
  filters?: SearchFiltersDto;
  /**
   * When set, list dealer-owner saved searches for this dealer after membership + permission checks.
   * @format uuid
   */
  dealerId?: string;
}

export interface UpdateSavedSearchDto {
  /**
   * Saved search status
   * @example "ACTIVE"
   */
  status?: UpdateSavedSearchDtoStatusEnum;
  /**
   * Saved search type
   * @example "BUY"
   */
  type?: UpdateSavedSearchDtoTypeEnum;
  /**
   * Saved search visibility. true=visible in saved searches list; false=transient /results context.
   * @default true
   */
  saved?: boolean;
  /**
   * Saved search title
   * @example "Saved search title"
   */
  title?: string;
  /**
   * Saved search description
   * @example "Saved search description"
   */
  description?: string;
  /**
   * Make model trim
   * @example [null]
   */
  makeModelTrim?: MakeModelTrimDto[];
  /**
   * Year
   * @example 2021
   */
  year?: number;
  /**
   * Mileage
   * @example 10000
   */
  mileage?: number;
  /**
   * Condition
   * @example "ANY"
   */
  condition?: string;
  /**
   * Interior color
   * @example ["Black","Beige"]
   */
  interiorColor?: string[];
  /**
   * Exterior color
   * @example ["White","Blue"]
   */
  exteriorColor?: string[];
  /**
   * Body type
   * @example ["SUV","SEDAN"]
   */
  bodyType?: UpdateSavedSearchDtoBodyTypeEnum[];
  /**
   * Fuel type
   * @example ["GASOLINE","HYBRID"]
   */
  fuelType?: UpdateSavedSearchDtoFuelTypeEnum[];
  /**
   * Purpose
   * @example ["PERSONAL"]
   */
  purpose?: UpdateSavedSearchDtoPurposeEnum[];
  /**
   * Drive train
   * @example ["AWD","RWD"]
   */
  drivetrain?: UpdateSavedSearchDtoDrivetrainEnum[];
  /**
   * Transmission
   * @example ["AUTOMATIC"]
   */
  transmission?: UpdateSavedSearchDtoTransmissionEnum[];
  /**
   * Price total min
   * @example 10000
   */
  priceTotalMin?: number;
  /**
   * Price total max
   * @example 10000
   */
  priceTotalMax?: number;
  /**
   * Price monthly min
   * @example 10000
   */
  priceMonthlyMin?: number;
  /**
   * Price monthly max
   * @example 10000
   */
  priceMonthlyMax?: number;
  /**
   * Downpayment amount
   * @example 10000
   */
  downpaymentAmount?: number;
  /**
   * City + State
   * @example "New York, NY"
   */
  cityState?: string;
  /**
   * Zip
   * @example "10001"
   */
  zip?: string;
  /**
   * Latitude
   * @example 40.7128
   */
  latitude?: number;
  /**
   * Longitude
   * @example -74.006
   */
  longitude?: number;
  /**
   * Radius
   * @example 100
   */
  radius?: number;
  /**
   * Radius unit
   * @example "MI"
   */
  radiusUnit?: string;
  /**
   * Negotiation strategy
   * @example {"strategy":"strategy"}
   */
  negotiationStrategy?: NegotiationStrategyDto;
  /** Aggregated statistics for the saved search card */
  stats?: SavedSearchStatsEntity;
}

export interface UpdateSavedSearchStatusDto {
  status: UpdateSavedSearchStatusDtoStatusEnum;
}

export interface AutomotiveGroupEntity {
  id: string;
  name: string;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomotiveGroupDto {
  name: string;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export interface UpdateAutomotiveGroupDto {
  name?: string;
  businessAddressStreet?: string;
  businessAddressCity?: string;
  businessAddressState?: string;
  businessAddressZip?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface DealerProviderIdentityDto {
  /**
   * Feed provider code (e.g. DEALER_CENTER, DEALER_SYNC).
   * @example "DEALER_CENTER"
   */
  providerCode: string;
  /**
   * Dealer id in that provider feed (e.g. DCID for Dealer Center).
   * @example "12345"
   */
  feedDealerId: string;
}

export interface AutomotiveGroupRefEntity {
  id: string;
  name: string;
}

export interface DealerAdditionalLocationEntity {
  id: string;
  dealerId: string;
  dealerName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface DealerEntity {
  id: string;
  status: DealerEntityStatusEnum;
  businessName: string;
  /** Feed-provider identities for multi-dealer inventory claim. */
  providerIdentities?: DealerProviderIdentityDto[];
  dba?: string | null;
  businessPhone?: string | null;
  headOfficeName?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  salesContactPhone?: string | null;
  salesContactEmail?: string | null;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  mailingAddressStreet: string;
  mailingAddressCity: string;
  mailingAddressState: string;
  mailingAddressZip: string;
  businessOpenSince?: string | null;
  dealerType: DealerEntityDealerTypeEnum;
  /** @format uuid */
  automotiveGroupId?: string | null;
  automotiveGroup?: AutomotiveGroupRefEntity | null;
  ein?: string | null;
  dmsProvider: DealerEntityDmsProviderEnum;
  crmProvider: DealerEntityCrmProviderEnum;
  inventoryVolumeUnits?: number | null;
  ownerFullName?: string | null;
  ownerTitle?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  primaryContactFullName?: string | null;
  primaryContactTitle?: string | null;
  primaryContactPhone?: string | null;
  primaryContactEmail?: string | null;
  pricingTier: DealerEntityPricingTierEnum;
  additionalLocations?: DealerAdditionalLocationEntity[];
}

export interface DealerMemberInviteDto {
  /** @format email */
  email: string;
  role: DealerMemberInviteDtoRoleEnum;
}

export interface DealerAdditionalLocationDto {
  dealerName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreateDealerDto {
  /**
   * When set, claim an existing UNCLAIMED dealer in place instead of creating a new row.
   * @format uuid
   */
  claimDealerId?: string;
  businessName: string;
  /** Optional feed-provider identities used to claim multi-dealer inventory (providerCode + feedDealerId). */
  providerIdentities?: DealerProviderIdentityDto[];
  dba?: string;
  businessPhone?: string;
  headOfficeName?: string;
  description?: string;
  photoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  salesContactPhone?: string;
  salesContactEmail?: string;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  mailingAddressStreet: string;
  mailingAddressCity: string;
  mailingAddressState: string;
  mailingAddressZip: string;
  /** Date string in YYYY/MM/dd format */
  businessOpenSince?: string;
  dealerType: CreateDealerDtoDealerTypeEnum;
  /** @format uuid */
  automotiveGroupId?: string | null;
  ein?: string;
  dmsProvider: CreateDealerDtoDmsProviderEnum;
  crmProvider: CreateDealerDtoCrmProviderEnum;
  inventoryVolumeUnits?: number;
  /** Optional initial dealer user invites (invite-by-email). Users may not exist yet. */
  memberInvites?: DealerMemberInviteDto[];
  ownerFullName?: string;
  ownerTitle?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  primaryContactFullName?: string;
  primaryContactTitle?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  pricingTier: CreateDealerDtoPricingTierEnum;
  additionalLocations?: DealerAdditionalLocationDto[];
}

export interface UpdateDealerDto {
  /**
   * When set, claim an existing UNCLAIMED dealer in place instead of creating a new row.
   * @format uuid
   */
  claimDealerId?: string;
  businessName?: string;
  /** Optional feed-provider identities used to claim multi-dealer inventory (providerCode + feedDealerId). */
  providerIdentities?: DealerProviderIdentityDto[];
  dba?: string;
  businessPhone?: string;
  headOfficeName?: string;
  description?: string;
  photoUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  salesContactPhone?: string;
  salesContactEmail?: string;
  businessAddressStreet?: string;
  businessAddressCity?: string;
  businessAddressState?: string;
  businessAddressZip?: string;
  mailingAddressStreet?: string;
  mailingAddressCity?: string;
  mailingAddressState?: string;
  mailingAddressZip?: string;
  /** Date string in YYYY/MM/dd format */
  businessOpenSince?: string;
  dealerType?: UpdateDealerDtoDealerTypeEnum;
  /** @format uuid */
  automotiveGroupId?: string | null;
  ein?: string;
  dmsProvider?: UpdateDealerDtoDmsProviderEnum;
  crmProvider?: UpdateDealerDtoCrmProviderEnum;
  inventoryVolumeUnits?: number;
  /** Optional initial dealer user invites (invite-by-email). Users may not exist yet. */
  memberInvites?: DealerMemberInviteDto[];
  ownerFullName?: string;
  ownerTitle?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  primaryContactFullName?: string;
  primaryContactTitle?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  pricingTier?: UpdateDealerDtoPricingTierEnum;
  additionalLocations?: DealerAdditionalLocationDto[];
}

export interface ReplaceDealerOwnerDto {
  /** @format email */
  email: string;
}

export interface DealerAdminStatusItemDto {
  status: DealerAdminStatusItemDtoStatusEnum;
  email: string | null;
  /** @format uuid */
  userId: string | null;
  /** @format date-time */
  invitedAtUtc: string | null;
  /** @format date-time */
  acceptedAtUtc: string | null;
}

export interface DealerAdminStatusResponseDto {
  hasDealerAdmin: boolean;
  admin: DealerAdminStatusItemDto | null;
}

export type UpdateChatSystemToolPolicyDto = object;

export interface FeedSourceImportProgressEntity {
  /** Current progress phase (best-effort). */
  phase: string;
  rowsTotal?: object | null;
  rowsProcessed?: object | null;
  /** Import start time (UTC ISO-8601). */
  startedAtUtc: string;
  /** Last progress update time (UTC ISO-8601). */
  updatedAtUtc: string;
}

export interface FeedSourceEntity {
  /** FeedSource ID (UUIDv7 generated in app) */
  id: string;
  type: FeedSourceEntityTypeEnum;
  /** Feed provider code for MULTI_DEALER_FTP (e.g. DEALER_CENTER). Null for SINGLE_DEALER_FTP. */
  providerCode?: string | null;
  /**
   * Optional Dealer link for single-dealer feed sources.
   * @format uuid
   */
  dealerId?: string | null;
  /** Tenant-level file transfer protocol used to build the derived connection URL. */
  protocol: FeedSourceEntityProtocolEnum;
  /** Tenant-level file transfer host. Operators do not edit it per feed. */
  host: string;
  /**
   * Tenant-level file transfer port. Operators do not edit it per feed.
   * @example 22
   */
  port: number;
  /** Path to the uploaded file inside the feed user logical home directory, for example `/cars.csv`. */
  remotePath: string;
  /** Per-feed username used to upload the file. */
  connectionUsername: object;
  /**
   * Whether a password is currently configured in Secrets Manager for this feed.
   * @default false
   */
  credentialsConfigured?: boolean;
  /**
   * Cron schedule (e.g. "0 0 * * *")
   * @default "0 0 * * *"
   */
  schedule: string;
  /** Last known import status */
  status?: FeedSourceEntityStatusEnum | null;
  /** Last completed run timestamp (success or fail) */
  lastRunAt?: object | null;
  /** Best-effort in-memory progress snapshot while status is IN_PROCESS (not persisted). */
  importProgress?: FeedSourceImportProgressEntity | null;
  /**
   * Mapping from remote feed columns to internal Vehicle fields (stored as jsonb). Keys are Vehicle field names (e.g. "vin", "year", "make", "model", "mileage", "price", "images", etc). Each value is a rule object.
   *
   * Rule fields:
   * - columnName: string (header name in CSV)
   * - columnIndex: number (1-based column index)
   * - type: "string" | "int" | "float" | "stringArray"
   * - split: "whitespace" | string (only for type=stringArray)
   * @example {"vin":{"columnName":"VIN"},"year":{"columnName":"Year","type":"int"},"make":{"columnName":"Make"},"model":{"columnName":"Model"},"mileage":{"columnName":"Odometer","type":"int"},"price":{"columnName":"SpecialPrice","type":"float"},"images":{"columnName":"PhotoURLs","type":"stringArray","split":"whitespace"},"stockNumber":{"columnName":"StockNumber"},"trim":{"columnName":"Trim"},"interiorColor":{"columnName":"InteriorColor"},"exteriorColor":{"columnName":"ExteriorColor"},"transmission":{"columnName":"Transmission"},"url":{"columnName":"VDP"},"description":{"columnName":"WebAdDescription"},"address":{"columnName":"Address"},"city":{"columnName":"City"},"state":{"columnName":"State"},"zip":{"columnName":"Zip"},"fuelType":{"columnName":"FuelType"}}
   */
  mapping: Record<string, any>;
  /**
   * Default values applied when the mapped source value is missing/empty (stored as jsonb). Also supports providing defaults for fields that are not present in `mapping`.
   * @example {"condition":"NEW","country":"US"}
   */
  mappingDefaults?: Record<string, any>;
  /**
   * Import flags (stored as jsonb array)
   * @default []
   */
  flags?: FeedSourceEntityFlagsEnum[];
  /** @default true */
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedProviderEntity {
  /** @example "DEALER_CENTER" */
  code: string;
  /** @example "Dealer Center" */
  label: string;
  /** @example "dealer-center" */
  usernamePrefix: string;
  leadHint?: string | null;
}

export interface FeedSourceConnectionDto {
  feedSourceId: string;
  protocol: FeedSourceConnectionDtoProtocolEnum;
  host: string;
  port: number;
  connectionUsername: string;
  remotePath: string;
  /** Password stored in Secrets Manager. Only returned for explicit operator actions. */
  password: string;
  /** Fully composed connection URL, for example `sftp://user:password@host:22/path/file.csv`. */
  connectionUrl: string;
}

export interface FeedSourceConnectionConfigDto {
  protocol: FeedSourceConnectionConfigDtoProtocolEnum;
  host: string;
  port: number;
}

export interface FeedSourceCsvPreviewEntity {
  feedSourceId: string;
  remotePath: string;
  headers: string[];
  /** Bounded sample of parsed CSV rows keyed by header name. */
  sampleRows: Record<string, any>[];
  /** @example 5 */
  sampleRowCount: number;
  /** Existing persisted mapping for this feed source. */
  mapping?: Record<string, any>;
  /** Existing persisted mapping defaults for this feed source. */
  mappingDefaults?: Record<string, any>;
  /**
   * Defaults resolved from database (e.g. derived userId for SINGLE_DEALER_FTP).
   * @example {"userId":"00000000-0000-0000-0000-000000000000"}
   */
  resolvedDefaults?: Record<string, any> | null;
  /**
   * Dealer contact resolved from database (e.g. SINGLE_DEALER_FTP uses Dealer fields instead of CSV mapping).
   * @example {"dealerName":"Example Motors","phone":"+1-555-0100","contactPhone":"+1-555-0101","address":"1 Main St","city":"Austin","state":"TX","zip":"78701"}
   */
  resolvedDealerContact?: Record<string, any> | null;
}

export interface FeedSourceMappingValidationEntity {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingRequiredFields: string[];
  unknownTargetFields: string[];
  unknownCsvColumns: string[];
  /** Normalized mapping that the backend validated. */
  mapping: Record<string, any>;
  /** Normalized mapping defaults that the backend validated. */
  mappingDefaults?: Record<string, any>;
  /** Mapped output preview for a bounded sample of CSV rows. */
  sampleMappedRows?: Record<string, any>[];
}

export interface DealerContactGeoBackfillEntity {
  feedSourceId: string;
  scanned: number;
  resolved: number;
  updated: number;
  unresolved: number;
  limit: number;
}

export interface CreateFeedSourceDto {
  type: CreateFeedSourceDtoTypeEnum;
  /** Feed provider code for MULTI_DEALER_FTP (e.g. DEALER_CENTER, DEALER_SYNC). Must be null for SINGLE_DEALER_FTP. */
  providerCode?: string | null;
  /** Remote file path inside the feed user logical home directory, e.g. `/cars.csv`. */
  remotePath: string;
  /**
   * Optional Dealer link for dealer-scoped feed sources (e.g. type=SINGLE_DEALER_FTP).
   * @format uuid
   */
  dealerId?: string | null;
  /** Per-feed username used to upload the file. */
  connectionUsername: string;
  /** Optional password override. When omitted, the backend generates a strong password and stores it in Secrets Manager. */
  password?: string;
  /**
   * Cron schedule (e.g. "0 0 * * *")
   * @default "0 0 * * *"
   */
  schedule: string;
  /** Feed mapping JSON. May be omitted during initial feed source creation and configured later from the mapping editor. */
  mapping?: Record<string, any>;
  /** Optional mapping defaults JSON. */
  mappingDefaults?: Record<string, any>;
  /**
   * Import flags.
   * @default []
   */
  flags?: CreateFeedSourceDtoFlagsEnum[];
  /**
   * Whether scheduled imports are enabled. Prefer creating new sources disabled until CSV preview and mapping are configured.
   * @default false
   */
  enabled?: boolean;
}

export interface UpdateFeedSourceDto {
  type?: UpdateFeedSourceDtoTypeEnum;
  /** Feed provider code for MULTI_DEALER_FTP (e.g. DEALER_CENTER, DEALER_SYNC). Must be null for SINGLE_DEALER_FTP. */
  providerCode?: string | null;
  /** Remote file path inside the feed user logical home directory, e.g. `/cars.csv`. */
  remotePath?: string;
  /**
   * Optional Dealer link for dealer-scoped feed sources (e.g. type=SINGLE_DEALER_FTP).
   * @format uuid
   */
  dealerId?: string | null;
  /** Per-feed username used to upload the file. */
  connectionUsername?: string;
  /** Optional password override. When omitted, the backend generates a strong password and stores it in Secrets Manager. */
  password?: string;
  /**
   * Cron schedule (e.g. "0 0 * * *")
   * @default "0 0 * * *"
   */
  schedule?: string;
  /** Feed mapping JSON. May be omitted during initial feed source creation and configured later from the mapping editor. */
  mapping?: Record<string, any>;
  /** Optional mapping defaults JSON. */
  mappingDefaults?: Record<string, any>;
  /**
   * Import flags.
   * @default []
   */
  flags?: UpdateFeedSourceDtoFlagsEnum[];
  /**
   * Whether scheduled imports are enabled. Prefer creating new sources disabled until CSV preview and mapping are configured.
   * @default false
   */
  enabled?: boolean;
}

export interface ValidateFeedSourceMappingDto {
  /** Candidate mapping JSON to validate against the discovered CSV headers. */
  mapping: Record<string, any>;
  /** Optional defaults JSON to validate alongside the mapping. */
  mappingDefaults?: Record<string, any>;
}

export interface FeedProviderAdminEntity {
  id: string;
  /** @example "DEALER_CENTER" */
  code: string;
  /** @example "Dealer Center" */
  label: string;
  /** @example "dealer-center" */
  usernamePrefix: string;
  leadHint?: string | null;
  defaultMapping?: Record<string, any> | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedProviderDto {
  /**
   * Stable uppercase code (A-Z, 0-9, underscore). Immutable after create.
   * @example "DEALER_CENTER"
   */
  code: string;
  /** @example "Dealer Center" */
  label: string;
  /**
   * Prefix used when generating default feed usernames.
   * @example "dealer-center"
   */
  usernamePrefix: string;
  /** Optional lead-routing hint (e.g. ELEADS). */
  leadHint?: string | null;
  /** Optional default CSV mapping JSON (FeedVehicleMapping). */
  defaultMapping?: Record<string, any> | null;
  /** @default true */
  enabled?: boolean;
}

export interface UpdateFeedProviderDto {
  /** @example "Dealer Center" */
  label?: string;
  /** @example "dealer-center" */
  usernamePrefix?: string;
  leadHint?: string | null;
  defaultMapping?: Record<string, any> | null;
  enabled?: boolean;
}

export type DealerMembershipsMeResponseDto = object;

export interface DealerStaffInviteDto {
  /** @format email */
  email: string;
  role: DealerStaffInviteDtoRoleEnum;
}

export interface DealerProfileLocationCountDto {
  vehicleCount: number;
  inventoryHref: string;
}

export interface DealerProfileAdditionalLocationResponseDto {
  id: string;
  dealerName: string;
  description?: string | null;
  photoUrl?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  email: string;
  cars: DealerProfileLocationCountDto;
}

export interface DealerProfileResponseDto {
  id: string;
  businessName: string;
  headOfficeName?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  latitude?: number | null;
  longitude?: number | null;
  salesContactPhone?: string | null;
  salesContactEmail?: string | null;
  headOfficeCars: DealerProfileLocationCountDto;
  additionalLocations: DealerProfileAdditionalLocationResponseDto[];
  canEdit: boolean;
}

export interface DealerProfileAdditionalLocationDto {
  /** Existing row id (ignored on create). */
  id?: string;
  dealerName: string;
  description?: string;
  photoUrl?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
}

export interface UpdateDealerProfileDto {
  businessName: string;
  headOfficeName?: string;
  description?: string;
  photoUrl?: string;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  latitude?: number;
  longitude?: number;
  salesContactPhone?: string;
  salesContactEmail?: string;
  additionalLocations?: DealerProfileAdditionalLocationDto[];
}

export interface DealerInventoryVehicleWithCountsDto {
  /** Vehicle ID (DB-generated UUID stored as TEXT) */
  id: string;
  /** Current vehicle owner user id (live; may differ from negotiation.sellerId) */
  userId?: string;
  /** Dealer-scoped inventory key for feed-backed vehicles */
  sourceInventoryKey?: string;
  /**
   * Vehicle status (stored as TEXT in DB)
   * @default "ACTIVE"
   */
  status?: DealerInventoryVehicleWithCountsDtoStatusEnum;
  /** Stock number */
  stockNumber?: string;
  /** VIN */
  vin?: string;
  /** Year */
  year: number;
  /** Make */
  make: string;
  /** Model */
  model: string;
  /** Mileage */
  mileage: number;
  /** Days on market from feed (dealer-reported); optional */
  daysOnMarket?: object;
  /** Trim */
  trim?: string;
  /** Body type (stored as TEXT in DB) */
  bodyType?: string;
  /** Fuel type (stored as TEXT in DB) */
  fuelType?: string;
  /** Drivetrain (stored as TEXT in DB) */
  drivetrain?: string;
  /** Purpose (stored as TEXT in DB) */
  purpose?: string;
  /** Conditions (stored as TEXT in DB) */
  condition?: string;
  /** Description */
  description?: string;
  /** URL */
  url?: string;
  /** Price */
  price?: number;
  /** Cost */
  cost?: number;
  /** Min finance monthly payment */
  minFinanceMonthlyPayment?: number;
  /** Min lease monthly payment */
  minLeaseMonthlyPayment?: number;
  /** Assigned finance plan id */
  financePlanId?: object;
  /** Assigned finance plan name */
  financePlanName?: object;
  /** Predicted SELL strategy name if a negotiation were created now */
  predictedSellerStrategyName?: object;
  /** Finance mode: off | generic | plan */
  financeMode?: string;
  /** Last imported generic finance monthly */
  financeGenericMonthly?: object;
  /** Images (URLs or identifiers) */
  images?: string[];
  /** Interior color */
  interiorColor?: string;
  /** Exterior color */
  exteriorColor?: string;
  /** Address */
  address?: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** ZIP */
  zip?: string;
  /** Country */
  country?: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
  /** Created at */
  createdAt?: string;
  /** Updated at */
  updatedAt?: string;
  /**
   * Total negotiations for this vehicle (dealer-scoped).
   * @example 3
   */
  negotiationsCount: number;
  /**
   * Total offers for this vehicle (dealer-scoped).
   * @example 12
   */
  offersTotalCount: number;
  /**
   * Active offers for this vehicle (dealer-scoped).
   * @example 2
   */
  offersActiveCount: number;
}

export interface DealerInventoryResponseDto {
  /**
   * Dealer context used for inventory scoping.
   * @example {"id":"uuid","businessName":"USA Cars Center"}
   */
  dealer: object;
  /** Vehicles in the requested page (with counters). */
  items: DealerInventoryVehicleWithCountsDto[];
  /**
   * Total vehicles count for the dealer
   * @example 123
   */
  total: number;
  /**
   * 1-based page index
   * @example 1
   */
  page: number;
  /**
   * Page size
   * @example 24
   */
  pageSize: number;
}

export interface DealerInventoryVisibilityDto {
  /**
   * When true, the vehicle is hidden from public search (status=HIDDEN).
   * @example true
   */
  hidden: boolean;
}

export interface DealerInventoryOptimizedResponseDto {
  /**
   * Dealer context used for inventory scoping.
   * @example {"id":"uuid","businessName":"USA Cars Center"}
   */
  dealer: object;
  /** Vehicles in the requested page (no offer/neg counts). */
  items: VehicleEntity[];
  /**
   * Total vehicles count for the dealer
   * @example 123
   */
  total: number;
  /**
   * 1-based page index
   * @example 1
   */
  page: number;
  /**
   * Page size
   * @example 48
   */
  pageSize: number;
}

export interface FinancePlanWriteDto {
  name: string;
  isActive?: boolean;
  isDefault?: boolean;
  isOverrideFeedValue?: boolean;
  order?: number;
  filter?: object;
  finance?: object;
}

export interface FinancePlanPatchDto {
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isOverrideFeedValue?: boolean;
  order?: number;
  filter?: object;
  finance?: object;
}

export interface DealerStrategyRuleWriteDto {
  /** @format uuid */
  strategyId: string;
  isActive?: boolean;
  order?: number;
  filter?: object;
}

export interface DealerStrategyRulePatchDto {
  /** @format uuid */
  strategyId?: string;
  isActive?: boolean;
  order?: number;
  filter?: object;
}

export interface PublicDealerListItemDto {
  id: string;
  publicSlug?: string | null;
  businessName: string;
  headOfficeName?: string | null;
  photoUrl?: string | null;
  city: string;
  state: string;
  /** Count of ACTIVE vehicles in dealer scope */
  carsListed: number;
}

export interface PublicDealerListResponseDto {
  items: PublicDealerListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicDealerVehicleItemDto {
  id: string;
  publicSlug?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  vin?: string | null;
  mileage?: number | null;
  price?: number | null;
  minFinanceMonthlyPayment?: number | null;
  minLeaseMonthlyPayment?: number | null;
  /** Computed finance monthly tooltip inputs from tenant-search (response-only). */
  financeDisclaimer?: object | null;
  images?: string[];
  url?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface PublicDealerVehiclesResponseDto {
  items: PublicDealerVehicleItemDto[];
  /** Total matching current filters */
  total: number;
  /** Total ACTIVE vehicles for dealer without make/model/year filters */
  totalUnfiltered: number;
  page: number;
  limit: number;
}

export interface PublicDealerVehicleFiltersDto {
  makes: string[];
  models: string[];
  years: number[];
}

export interface PublicDealerLocationCountDto {
  vehicleCount: number;
  inventoryHref: string;
}

export interface PublicDealerAdditionalLocationDto {
  id: string;
  dealerName: string;
  description?: string | null;
  photoUrl?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  email: string;
  cars: PublicDealerLocationCountDto;
}

export interface PublicDealerProfileDto {
  id: string;
  publicSlug?: string | null;
  businessName: string;
  headOfficeName?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  businessAddressStreet: string;
  businessAddressCity: string;
  businessAddressState: string;
  businessAddressZip: string;
  latitude?: number | null;
  longitude?: number | null;
  salesContactPhone?: string | null;
  salesContactEmail?: string | null;
  headOfficeCars: PublicDealerLocationCountDto;
  additionalLocations: PublicDealerAdditionalLocationDto[];
}

export interface SearchPricingDto {
  /** Move non-acceptable prices to the end instead of excluding */
  wrapNonAcceptablePrices?: boolean;
  /**
   * Minimum cost considered acceptable
   * @format double
   */
  nonAcceptableMinCost?: number;
  /** Include vehicles with non-acceptable prices */
  includeNonAcceptablePrices?: boolean;
}

export interface GeoPointDto {
  /**
   * Latitude
   * @format double
   */
  lat?: number;
  /**
   * Longitude
   * @format double
   */
  lon?: number;
}

export interface SearchLocationDto {
  /** City + State */
  cityState?: string;
  /** ZIP code */
  zip?: string;
  /** Geographic point coordinates */
  geoPoint?: GeoPointDto;
  /**
   * Maximum distance in miles
   * @format double
   */
  maxDistanceMiles?: number;
}

export interface SearchSortDto {
  /** Sort field */
  field?: string;
  /** Sort direction */
  direction?: string;
}

export interface SearchPaginationDto {
  /**
   * Page number
   * @format int32
   */
  page?: number;
  /**
   * Page size
   * @format int32
   */
  pageSize?: number;
}

export interface SearchVehicleRequestDto {
  /** Saved search id */
  savedSearchId?: string;
  /** Purchase type (BUY | FINANCE | LEASE) */
  purchaseType?: string;
  /** Search filters */
  filters?: SearchFiltersDto;
  /** Pricing options */
  pricing?: SearchPricingDto;
  /** Search location */
  location?: SearchLocationDto;
  /** Sort options */
  sort?: SearchSortDto;
  /** Pagination options */
  pagination?: SearchPaginationDto;
  /** When true, TenantSearch may return multi-section relaxed results if strict matches are below threshold */
  sectionedFallback?: boolean;
}

export interface UpdateSearchDto {
  /** Saved search id */
  savedSearchId?: string;
  /** Purchase type (BUY | FINANCE | LEASE) */
  purchaseType?: string;
  /** Search filters */
  filters?: SearchFiltersDto;
  /** Pricing options */
  pricing?: SearchPricingDto;
  /** Search location */
  location?: SearchLocationDto;
  /** Sort options */
  sort?: SearchSortDto;
  /** Pagination options */
  pagination?: SearchPaginationDto;
  /** When true, TenantSearch may return multi-section relaxed results if strict matches are below threshold */
  sectionedFallback?: boolean;
}

export interface TaxonomyMake {
  /** The taxonomy make id */
  id: string;
  /** The taxonomy make name */
  name: string;
}

export interface TaxonomyMakeResponseDto {
  /** The taxonomy makes */
  makes: TaxonomyMake[];
}

export interface TaxonomyModel {
  /** The taxonomy model id */
  id: string;
  /** The taxonomy model name */
  name: string;
}

export interface TaxonomyModelResponseDto {
  /** The taxonomy model parent make */
  parentMake: TaxonomyMake;
  /** The taxonomy models */
  models: TaxonomyModel[];
}

export interface TaxonomyTrim {
  /** The taxonomy trim id */
  id: string;
  /** The taxonomy trim name */
  name: string;
}

export interface TaxonomyTrimResponseDto {
  /** The taxonomy trim parent make */
  parentMake: TaxonomyMake;
  /** The taxonomy trim parent model */
  parentModel: TaxonomyModel;
  /** The taxonomy trims */
  trims: TaxonomyTrim[];
}

export interface TaxonomyAttribute {
  /** The taxonomy attribute id */
  id: string;
  /** The taxonomy attribute name */
  name: string;
}

export interface TaxonomyAttributeResponseDto {
  /** The taxonomy attribute class */
  attributeClass: string;
  /** The taxonomy attribute values */
  values: TaxonomyAttribute[];
}

export interface IssueOfferCertificateDto {
  /** @example "44444444-4444-4444-4444-444444444444" */
  negotiationId: string;
  /** @example "55555555-5555-5555-5555-555555555555" */
  offerId: string;
  /** Best-effort dealer name override from UI context */
  dealerName?: string | null;
}

export interface IssueOfferCertificateResponseDto {
  /** @example true */
  ok: IssueOfferCertificateResponseDtoOkEnum;
  token: string;
  /** @example "/offer/certificate/<token>" */
  path: string;
}

export interface OfferCertificateIdsDto {
  vehicleId: string;
  buyerId: string;
  sellerId: string;
  negotiationId: string;
  offerId: string;
}

export interface OfferCertificateOfferHistoryDto {
  createdAtUtc: string;
  createdBy: OfferCertificateOfferHistoryDtoCreatedByEnum | null;
  createdById: string | null;
  terminalState: string | null;
  terminalAtUtc: string | null;
  terminalBy: OfferCertificateOfferHistoryDtoTerminalByEnum | null;
  terminalById: string | null;
}

export interface OfferCertificateTermsDto {
  terminalTerms: string | null;
  terminalTermsVersionDate: string | null;
}

export interface OfferCertificateIssuedToDto {
  name: string;
  phone: string | null;
  email: string | null;
}

export interface OfferCertificateVehicleDto {
  title: string;
  vin: string | null;
  stockNum: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  imageUrl: string | null;
  descriptionLines: string[];
}

export interface OfferCertificateAddonDto {
  id: string;
  title: string;
  description: string | null;
  priceAmount: number;
  priceType: string;
}

export interface OfferCertificatePriceDto {
  dealType?: OfferCertificatePriceDtoDealTypeEnum | null;
  type: OfferCertificatePriceDtoTypeEnum;
  amount: number;
  per: OfferCertificatePriceDtoPerEnum;
  downPaymentAmount: number | null;
  tradeInAmount: number | null;
  payoffAmount: number | null;
  addons: OfferCertificateAddonDto[];
}

export interface OfferCertificateDealerDto {
  name: string | null;
  address: string | null;
  phone?: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

export interface OfferCertificateSnapshotV1Dto {
  /** @example "v1" */
  schemaVersion: OfferCertificateSnapshotV1DtoSchemaVersionEnum;
  createdAtUtc: string;
  ids: OfferCertificateIdsDto;
  offerHistory?: OfferCertificateOfferHistoryDto;
  terms?: OfferCertificateTermsDto;
  issuedTo: OfferCertificateIssuedToDto;
  vehicle: OfferCertificateVehicleDto;
  price: OfferCertificatePriceDto;
  dealer: OfferCertificateDealerDto;
}

export interface PublicOfferCertificateResponseDto {
  /** @example true */
  ok: PublicOfferCertificateResponseDtoOkEnum;
  snapshot: OfferCertificateSnapshotV1Dto;
}

export interface UnreadChatsEmailUserDto {
  /** @format uuid */
  id: string;
  email: string;
  name: string;
}

export interface UnreadChatsEmailChatDto {
  scope: UnreadChatsEmailChatDtoScopeEnum;
  /**
   * Entity id (negotiation/savedSearch/strategy/offer). Ignored for GENERAL_* scopes.
   * @format uuid
   */
  id?: string;
  /** Short Messages-inbox preview used as the email hyperlink label. */
  preview?: string;
}

export interface UnreadChatsEmailDto {
  user: UnreadChatsEmailUserDto;
  chats: UnreadChatsEmailChatDto[];
}

/** Unread-chat email digest timing in minutes (read via GET profile; write via PATCH /user/notification-settings). Null = system default. */
export enum UserDtoUnreadEmailTimingMinutesEnum {
  Value15 = 15,
  Value60 = 60,
  Value480 = 480,
  Value1440 = 1440,
}

/**
 * Unread-chat email digest timing in minutes. Null means use the system default (global unreadNotificationsTiming).
 * @example 60
 */
export enum NotificationSettingsDtoUnreadEmailTimingMinutesEnum {
  Value15 = 15,
  Value60 = 60,
  Value480 = 480,
  Value1440 = 1440,
}

/**
 * Unread-chat email digest timing in minutes, or null for system default. Allowed: 15, 60, 480, 1440.
 * @example 60
 */
export enum NotificationSettingsPatchDtoUnreadEmailTimingMinutesEnum {
  Value15 = 15,
  Value60 = 60,
  Value480 = 480,
  Value1440 = 1440,
}

/**
 * Saved search type
 * @example "BUY"
 */
export enum SavedSearchChatDataDtoTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

export enum SavedSearchChatDataDtoBodyTypeEnum {
  ANY = "ANY",
  SEDAN = "SEDAN",
  SUV = "SUV",
  HATCHBACK = "HATCHBACK",
  CONVERTIBLE = "CONVERTIBLE",
  COUPE = "COUPE",
  TRUCK = "TRUCK",
  VAN = "VAN",
  MINIVAN = "MINIVAN",
  WAGON = "WAGON",
  PICKUP = "PICKUP",
  CROSSOVER = "CROSSOVER",
  ROADSTER = "ROADSTER",
  OTHER = "OTHER",
}

export enum SavedSearchChatDataDtoFuelTypeEnum {
  ANY = "ANY",
  GASOLINE = "GASOLINE",
  DIESEL = "DIESEL",
  ELECTRIC = "ELECTRIC",
  HYBRID = "HYBRID",
  OTHER = "OTHER",
}

export enum SavedSearchChatDataDtoPurposeEnum {
  ANY = "ANY",
  PERSONAL = "PERSONAL",
  DAILY_DRIVER = "DAILY_DRIVER",
  COMMERCIAL = "COMMERCIAL",
  RENTAL = "RENTAL",
  LEASE = "LEASE",
  COLLECTION = "COLLECTION",
  LUXURY = "LUXURY",
  OTHER = "OTHER",
}

export enum SavedSearchChatDataDtoDrivetrainEnum {
  ANY = "ANY",
  FWD = "FWD",
  RWD = "RWD",
  AWD = "AWD",
  IFR = "IFR",
}

export enum SavedSearchChatDataDtoTransmissionEnum {
  ANY = "ANY",
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
  SEMI_AUTOMATIC = "SEMI_AUTOMATIC",
  DIRECT_DRIVE = "DIRECT_DRIVE",
}

/** Kind of chat */
export enum ChatDtoKindEnum {
  DEFAULT = "DEFAULT",
  NEGOTIATION_BUYER_AGENT = "NEGOTIATION_BUYER_AGENT",
  NEGOTIATION_AGENT_AGENT = "NEGOTIATION_AGENT_AGENT",
  NEGOTIATION_SELLER_AGENT = "NEGOTIATION_SELLER_AGENT",
}

/** Scope of chat */
export enum CreateChatRequestDtoScopeEnum {
  GENERAL_SAVED_SEARCHES = "GENERAL_SAVED_SEARCHES",
  GENERAL_NEGOTIATIONS = "GENERAL_NEGOTIATIONS",
  GENERAL_OFFERS = "GENERAL_OFFERS",
  GENERAL_STRATEGIES = "GENERAL_STRATEGIES",
  SAVED_SEARCH = "SAVED_SEARCH",
  NEGOTIATION = "NEGOTIATION",
  OFFER = "OFFER",
  STRATEGY = "STRATEGY",
}

/** Kind of chat (optional; DEFAULT unless specified) */
export enum CreateChatRequestDtoKindEnum {
  DEFAULT = "DEFAULT",
  NEGOTIATION_BUYER_AGENT = "NEGOTIATION_BUYER_AGENT",
  NEGOTIATION_AGENT_AGENT = "NEGOTIATION_AGENT_AGENT",
  NEGOTIATION_SELLER_AGENT = "NEGOTIATION_SELLER_AGENT",
}

export enum InboxChatSummaryDtoScopeEnum {
  GENERAL_SAVED_SEARCHES = "GENERAL_SAVED_SEARCHES",
  GENERAL_NEGOTIATIONS = "GENERAL_NEGOTIATIONS",
  GENERAL_OFFERS = "GENERAL_OFFERS",
  GENERAL_STRATEGIES = "GENERAL_STRATEGIES",
  SAVED_SEARCH = "SAVED_SEARCH",
  NEGOTIATION = "NEGOTIATION",
  OFFER = "OFFER",
  STRATEGY = "STRATEGY",
}

export enum InboxChatSummaryDtoKindEnum {
  DEFAULT = "DEFAULT",
  NEGOTIATION_BUYER_AGENT = "NEGOTIATION_BUYER_AGENT",
  NEGOTIATION_AGENT_AGENT = "NEGOTIATION_AGENT_AGENT",
  NEGOTIATION_SELLER_AGENT = "NEGOTIATION_SELLER_AGENT",
}

/** Negotiation status */
export enum NegotiationChatDataDtoStatusEnum {
  NEGOTIATION_NEW = "NEGOTIATION_NEW",
  NEGOTIATION_OPEN = "NEGOTIATION_OPEN",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

/** Guardrail kind scoped by offer age */
export enum NegotiationStrategyAgeGuardrailDtoKindEnum {
  MinCutOffValue = "minCutOffValue",
  MinAutoAccept = "minAutoAccept",
  MaxCutOffValue = "maxCutOffValue",
  MaxAutoAccept = "maxAutoAccept",
}

/** Offer payment type for which the threshold applies. Optional for section-local guardrails (payment type is implied by the section). */
export enum NegotiationStrategyAgeGuardrailDtoPaymentTypeEnum {
  Cash = "cash",
  Finance = "finance",
  Lease = "lease",
}

/**
 * How addon price should be applied
 * @example "UPFRONT"
 */
export enum OfferAddonDtoPriceTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
  UPFRONT = "UPFRONT",
}

/** Price type for the initial offer when initialOfferPriceAmount is set */
export enum CreateNegotiationDtoInitialOfferPriceTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
}

/**
 * Negotiation status
 * @example "NEGOTIATION_NEW"
 */
export enum NegotiationEntityStatusEnum {
  NEGOTIATION_NEW = "NEGOTIATION_NEW",
  NEGOTIATION_OPEN = "NEGOTIATION_OPEN",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

/**
 * Vehicle status (stored as TEXT in DB)
 * @default "ACTIVE"
 */
export enum VehicleEntityStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SOLD = "SOLD",
  HIDDEN = "HIDDEN",
}

/**
 * Saved search status
 * @example "ACTIVE"
 */
export enum SavedSearchEntityStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

/**
 * Saved search type
 * @example "BUY"
 */
export enum SavedSearchEntityTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

export enum SavedSearchEntityBodyTypeEnum {
  ANY = "ANY",
  SEDAN = "SEDAN",
  SUV = "SUV",
  HATCHBACK = "HATCHBACK",
  CONVERTIBLE = "CONVERTIBLE",
  COUPE = "COUPE",
  TRUCK = "TRUCK",
  VAN = "VAN",
  MINIVAN = "MINIVAN",
  WAGON = "WAGON",
  PICKUP = "PICKUP",
  CROSSOVER = "CROSSOVER",
  ROADSTER = "ROADSTER",
  OTHER = "OTHER",
}

export enum SavedSearchEntityFuelTypeEnum {
  ANY = "ANY",
  GASOLINE = "GASOLINE",
  DIESEL = "DIESEL",
  ELECTRIC = "ELECTRIC",
  HYBRID = "HYBRID",
  OTHER = "OTHER",
}

export enum SavedSearchEntityPurposeEnum {
  ANY = "ANY",
  PERSONAL = "PERSONAL",
  DAILY_DRIVER = "DAILY_DRIVER",
  COMMERCIAL = "COMMERCIAL",
  RENTAL = "RENTAL",
  LEASE = "LEASE",
  COLLECTION = "COLLECTION",
  LUXURY = "LUXURY",
  OTHER = "OTHER",
}

export enum SavedSearchEntityDrivetrainEnum {
  ANY = "ANY",
  FWD = "FWD",
  RWD = "RWD",
  AWD = "AWD",
  IFR = "IFR",
}

export enum SavedSearchEntityTransmissionEnum {
  ANY = "ANY",
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
  SEMI_AUTOMATIC = "SEMI_AUTOMATIC",
  DIRECT_DRIVE = "DIRECT_DRIVE",
}

/**
 * Negotiation status
 * @example "NEGOTIATION_NEW"
 */
export enum NegotiationWithVehicleEntityStatusEnum {
  NEGOTIATION_NEW = "NEGOTIATION_NEW",
  NEGOTIATION_OPEN = "NEGOTIATION_OPEN",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

/**
 * Fallback payment type when unknown
 * @example "finance"
 */
export enum NegotiationStrategyFallbackWhenUnknownPaymentTypeEnum {
  Cash = "cash",
  Finance = "finance",
  Lease = "lease",
}

/** Operation combining fixed+percent when both are present (OR=more restrictive, AND=less restrictive) */
export enum NegotiationStrategyThresholdOpEnum {
  OR = "OR",
  AND = "AND",
}

/** Guardrail kind scoped by offer age */
export enum NegotiationStrategyAgeGuardrailEntryKindEnum {
  MinCutOffValue = "minCutOffValue",
  MinAutoAccept = "minAutoAccept",
  MaxCutOffValue = "maxCutOffValue",
  MaxAutoAccept = "maxAutoAccept",
}

/** Offer payment type for which the threshold applies. Optional for section-local guardrails (payment type is implied by the section). */
export enum NegotiationStrategyAgeGuardrailEntryPaymentTypeEnum {
  Cash = "cash",
  Finance = "finance",
  Lease = "lease",
}

/**
 * Strategy kind
 * @example "BUY"
 */
export enum NegotiationStrategyEntityKindEnum {
  BUY = "BUY",
  SELL = "SELL",
}

/**
 * Negotiation status
 * @example "NEGOTIATION_NEW"
 */
export enum FullNegotiationEntityStatusEnum {
  NEGOTIATION_NEW = "NEGOTIATION_NEW",
  NEGOTIATION_OPEN = "NEGOTIATION_OPEN",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

/** Price type for the initial offer when initialOfferPriceAmount is set */
export enum UpdateNegotiationDtoInitialOfferPriceTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
}

/**
 * Negotiation status
 * @example "NEGOTIATION_OPEN"
 */
export enum UpdateNegotiationDtoStatusEnum {
  NEGOTIATION_NEW = "NEGOTIATION_NEW",
  NEGOTIATION_OPEN = "NEGOTIATION_OPEN",
  NEGOTIATION_ACCEPTED = "NEGOTIATION_ACCEPTED",
  NEGOTIATION_CANCELLED_BY_BUYER = "NEGOTIATION_CANCELLED_BY_BUYER",
  NEGOTIATION_TIMEOUT = "NEGOTIATION_TIMEOUT",
  NEGOTIATION_DECLINED_BY_SELLER = "NEGOTIATION_DECLINED_BY_SELLER",
  NEGOTIATION_TERMINATED_BY_SYSTEM = "NEGOTIATION_TERMINATED_BY_SYSTEM",
  VEHICLE_OUT_OF_MARKET = "VEHICLE_OUT_OF_MARKET",
}

/** Strategy kind */
export enum CreateNegotiationStrategyRequestDtoKindEnum {
  BUY = "BUY",
  SELL = "SELL",
}

export enum LeadEntityStatusEnum {
  CREATED = "CREATED",
  SENT = "SENT",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum LeadSetupEntityTypeEnum {
  EMAIL = "EMAIL",
  ELEADS = "ELEADS",
}

/** @default "ELEADS" */
export enum CreateLeadSetupDtoTypeEnum {
  EMAIL = "EMAIL",
  ELEADS = "ELEADS",
}

/** Unread-chat email digest timing in minutes (read via GET profile; write via PATCH /user/notification-settings). Null = system default. */
export enum UpdateUserDtoUnreadEmailTimingMinutesEnum {
  Value15 = 15,
  Value60 = 60,
  Value480 = 480,
  Value1440 = 1440,
}

/**
 * Optional SavedSearchType this template applies to (null = any)
 * @example "BUY"
 */
export enum OfferAddonTemplateEntitySavedSearchTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

/**
 * How addon price should be applied
 * @example "UPFRONT"
 */
export enum OfferAddonTemplateEntityPriceTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
  UPFRONT = "UPFRONT",
}

/**
 * Optional SavedSearchType this template applies to (null = any)
 * @example "BUY"
 */
export enum CreateOfferAddonDtoSavedSearchTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

/**
 * How addon price should be applied
 * @example "UPFRONT"
 */
export enum CreateOfferAddonDtoPriceTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
  UPFRONT = "UPFRONT",
}

/**
 * Vehicle status (stored as TEXT in DB)
 * @default "ACTIVE"
 */
export enum CreateVehicleDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SOLD = "SOLD",
  HIDDEN = "HIDDEN",
}

/**
 * Vehicle status (stored as TEXT in DB)
 * @default "ACTIVE"
 */
export enum UpdateVehicleDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SOLD = "SOLD",
  HIDDEN = "HIDDEN",
}

/**
 * Saved search status
 * @example "ACTIVE"
 */
export enum CreateSavedSearchDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

/**
 * Saved search type
 * @example "BUY"
 */
export enum CreateSavedSearchDtoTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

export enum CreateSavedSearchDtoBodyTypeEnum {
  ANY = "ANY",
  SEDAN = "SEDAN",
  SUV = "SUV",
  HATCHBACK = "HATCHBACK",
  CONVERTIBLE = "CONVERTIBLE",
  COUPE = "COUPE",
  TRUCK = "TRUCK",
  VAN = "VAN",
  MINIVAN = "MINIVAN",
  WAGON = "WAGON",
  PICKUP = "PICKUP",
  CROSSOVER = "CROSSOVER",
  ROADSTER = "ROADSTER",
  OTHER = "OTHER",
}

export enum CreateSavedSearchDtoFuelTypeEnum {
  ANY = "ANY",
  GASOLINE = "GASOLINE",
  DIESEL = "DIESEL",
  ELECTRIC = "ELECTRIC",
  HYBRID = "HYBRID",
  OTHER = "OTHER",
}

export enum CreateSavedSearchDtoPurposeEnum {
  ANY = "ANY",
  PERSONAL = "PERSONAL",
  DAILY_DRIVER = "DAILY_DRIVER",
  COMMERCIAL = "COMMERCIAL",
  RENTAL = "RENTAL",
  LEASE = "LEASE",
  COLLECTION = "COLLECTION",
  LUXURY = "LUXURY",
  OTHER = "OTHER",
}

export enum CreateSavedSearchDtoDrivetrainEnum {
  ANY = "ANY",
  FWD = "FWD",
  RWD = "RWD",
  AWD = "AWD",
  IFR = "IFR",
}

export enum CreateSavedSearchDtoTransmissionEnum {
  ANY = "ANY",
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
  SEMI_AUTOMATIC = "SEMI_AUTOMATIC",
  DIRECT_DRIVE = "DIRECT_DRIVE",
}

/**
 * Saved search status
 * @example "ACTIVE"
 */
export enum UpdateSavedSearchDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

/**
 * Saved search type
 * @example "BUY"
 */
export enum UpdateSavedSearchDtoTypeEnum {
  BUY = "BUY",
  FINANCE = "FINANCE",
  LEASE = "LEASE",
}

export enum UpdateSavedSearchDtoBodyTypeEnum {
  ANY = "ANY",
  SEDAN = "SEDAN",
  SUV = "SUV",
  HATCHBACK = "HATCHBACK",
  CONVERTIBLE = "CONVERTIBLE",
  COUPE = "COUPE",
  TRUCK = "TRUCK",
  VAN = "VAN",
  MINIVAN = "MINIVAN",
  WAGON = "WAGON",
  PICKUP = "PICKUP",
  CROSSOVER = "CROSSOVER",
  ROADSTER = "ROADSTER",
  OTHER = "OTHER",
}

export enum UpdateSavedSearchDtoFuelTypeEnum {
  ANY = "ANY",
  GASOLINE = "GASOLINE",
  DIESEL = "DIESEL",
  ELECTRIC = "ELECTRIC",
  HYBRID = "HYBRID",
  OTHER = "OTHER",
}

export enum UpdateSavedSearchDtoPurposeEnum {
  ANY = "ANY",
  PERSONAL = "PERSONAL",
  DAILY_DRIVER = "DAILY_DRIVER",
  COMMERCIAL = "COMMERCIAL",
  RENTAL = "RENTAL",
  LEASE = "LEASE",
  COLLECTION = "COLLECTION",
  LUXURY = "LUXURY",
  OTHER = "OTHER",
}

export enum UpdateSavedSearchDtoDrivetrainEnum {
  ANY = "ANY",
  FWD = "FWD",
  RWD = "RWD",
  AWD = "AWD",
  IFR = "IFR",
}

export enum UpdateSavedSearchDtoTransmissionEnum {
  ANY = "ANY",
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
  SEMI_AUTOMATIC = "SEMI_AUTOMATIC",
  DIRECT_DRIVE = "DIRECT_DRIVE",
}

export enum UpdateSavedSearchStatusDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

export enum DealerEntityStatusEnum {
  UNCLAIMED = "UNCLAIMED",
  CLAIMED = "CLAIMED",
}

export enum DealerEntityDealerTypeEnum {
  NONE = "NONE",
  INDEPENDENT = "INDEPENDENT",
  FRANCHISE = "FRANCHISE",
  BACKED_BY_FRANCHISE = "BACKED_BY_FRANCHISE",
  WHOLESALE = "WHOLESALE",
}

export enum DealerEntityDmsProviderEnum {
  NONE = "NONE",
  AUTO_MANAGER = "AUTO_MANAGER",
  AUTO_FUNDS = "AUTO_FUNDS",
  DEALERS_CLOUD = "DEALERS_CLOUD",
  DEALER_SYNC = "DEALER_SYNC",
  FRAZER = "FRAZER",
  IDMS_DEALERSOCKET = "IDMS_DEALERSOCKET",
  REYNOLDS_AND_REYNOLDS = "REYNOLDS_AND_REYNOLDS",
}

export enum DealerEntityCrmProviderEnum {
  NONE = "NONE",
  ELEADS = "ELEADS",
}

export enum DealerEntityPricingTierEnum {
  TRIAL_FREE_3_MONTHS = "TRIAL_FREE_3_MONTHS",
  TRIAL_FREE_6_MONTHS = "TRIAL_FREE_6_MONTHS",
  TRIAL_FREE_12_MONTHS = "TRIAL_FREE_12_MONTHS",
  SUBSCRIPTION_MONTHLY = "SUBSCRIPTION_MONTHLY",
  SUBSCRIPTION_ANNUAL = "SUBSCRIPTION_ANNUAL",
}

export enum DealerMemberInviteDtoRoleEnum {
  DEALER_OWNER = "DEALER_OWNER",
  DEALER_ADMIN = "DEALER_ADMIN",
  DEALER_MANAGER = "DEALER_MANAGER",
  DEALER_VIEWER = "DEALER_VIEWER",
  DEALER_FINANCE = "DEALER_FINANCE",
}

export enum CreateDealerDtoDealerTypeEnum {
  NONE = "NONE",
  INDEPENDENT = "INDEPENDENT",
  FRANCHISE = "FRANCHISE",
  BACKED_BY_FRANCHISE = "BACKED_BY_FRANCHISE",
  WHOLESALE = "WHOLESALE",
}

export enum CreateDealerDtoDmsProviderEnum {
  NONE = "NONE",
  AUTO_MANAGER = "AUTO_MANAGER",
  AUTO_FUNDS = "AUTO_FUNDS",
  DEALERS_CLOUD = "DEALERS_CLOUD",
  DEALER_SYNC = "DEALER_SYNC",
  FRAZER = "FRAZER",
  IDMS_DEALERSOCKET = "IDMS_DEALERSOCKET",
  REYNOLDS_AND_REYNOLDS = "REYNOLDS_AND_REYNOLDS",
}

export enum CreateDealerDtoCrmProviderEnum {
  NONE = "NONE",
  ELEADS = "ELEADS",
}

export enum CreateDealerDtoPricingTierEnum {
  TRIAL_FREE_3_MONTHS = "TRIAL_FREE_3_MONTHS",
  TRIAL_FREE_6_MONTHS = "TRIAL_FREE_6_MONTHS",
  TRIAL_FREE_12_MONTHS = "TRIAL_FREE_12_MONTHS",
  SUBSCRIPTION_MONTHLY = "SUBSCRIPTION_MONTHLY",
  SUBSCRIPTION_ANNUAL = "SUBSCRIPTION_ANNUAL",
}

export enum UpdateDealerDtoDealerTypeEnum {
  NONE = "NONE",
  INDEPENDENT = "INDEPENDENT",
  FRANCHISE = "FRANCHISE",
  BACKED_BY_FRANCHISE = "BACKED_BY_FRANCHISE",
  WHOLESALE = "WHOLESALE",
}

export enum UpdateDealerDtoDmsProviderEnum {
  NONE = "NONE",
  AUTO_MANAGER = "AUTO_MANAGER",
  AUTO_FUNDS = "AUTO_FUNDS",
  DEALERS_CLOUD = "DEALERS_CLOUD",
  DEALER_SYNC = "DEALER_SYNC",
  FRAZER = "FRAZER",
  IDMS_DEALERSOCKET = "IDMS_DEALERSOCKET",
  REYNOLDS_AND_REYNOLDS = "REYNOLDS_AND_REYNOLDS",
}

export enum UpdateDealerDtoCrmProviderEnum {
  NONE = "NONE",
  ELEADS = "ELEADS",
}

export enum UpdateDealerDtoPricingTierEnum {
  TRIAL_FREE_3_MONTHS = "TRIAL_FREE_3_MONTHS",
  TRIAL_FREE_6_MONTHS = "TRIAL_FREE_6_MONTHS",
  TRIAL_FREE_12_MONTHS = "TRIAL_FREE_12_MONTHS",
  SUBSCRIPTION_MONTHLY = "SUBSCRIPTION_MONTHLY",
  SUBSCRIPTION_ANNUAL = "SUBSCRIPTION_ANNUAL",
}

export enum DealerAdminStatusItemDtoStatusEnum {
  Active = "active",
  Invited = "invited",
}

export enum FeedSourceEntityTypeEnum {
  MULTI_DEALER_FTP = "MULTI_DEALER_FTP",
  SINGLE_DEALER_FTP = "SINGLE_DEALER_FTP",
}

/** Tenant-level file transfer protocol used to build the derived connection URL. */
export enum FeedSourceEntityProtocolEnum {
  FTP = "FTP",
  SFTP = "SFTP",
}

/** Last known import status */
export enum FeedSourceEntityStatusEnum {
  SUCCESS = "SUCCESS",
  IN_PROCESS = "IN_PROCESS",
  FAIL = "FAIL",
}

export enum FeedSourceEntityFlagsEnum {
  ZIP_ARCHIVE = "ZIP_ARCHIVE",
}

export enum FeedSourceConnectionDtoProtocolEnum {
  FTP = "FTP",
  SFTP = "SFTP",
}

export enum FeedSourceConnectionConfigDtoProtocolEnum {
  FTP = "FTP",
  SFTP = "SFTP",
}

export enum CreateFeedSourceDtoTypeEnum {
  MULTI_DEALER_FTP = "MULTI_DEALER_FTP",
  SINGLE_DEALER_FTP = "SINGLE_DEALER_FTP",
}

export enum CreateFeedSourceDtoFlagsEnum {
  ZIP_ARCHIVE = "ZIP_ARCHIVE",
}

export enum UpdateFeedSourceDtoTypeEnum {
  MULTI_DEALER_FTP = "MULTI_DEALER_FTP",
  SINGLE_DEALER_FTP = "SINGLE_DEALER_FTP",
}

export enum UpdateFeedSourceDtoFlagsEnum {
  ZIP_ARCHIVE = "ZIP_ARCHIVE",
}

export enum DealerStaffInviteDtoRoleEnum {
  DEALER_ADMIN = "DEALER_ADMIN",
  DEALER_MANAGER = "DEALER_MANAGER",
  DEALER_VIEWER = "DEALER_VIEWER",
  DEALER_FINANCE = "DEALER_FINANCE",
}

/**
 * Vehicle status (stored as TEXT in DB)
 * @default "ACTIVE"
 */
export enum DealerInventoryVehicleWithCountsDtoStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SOLD = "SOLD",
  HIDDEN = "HIDDEN",
}

/** @example true */
export enum IssueOfferCertificateResponseDtoOkEnum {
  True = true,
}

export enum OfferCertificateOfferHistoryDtoCreatedByEnum {
  Buyer = "Buyer",
  BuyerAgent = "Buyer Agent",
  Seller = "Seller",
  SellerAgent = "Seller Agent",
}

export enum OfferCertificateOfferHistoryDtoTerminalByEnum {
  Buyer = "Buyer",
  BuyerAgent = "Buyer Agent",
  Seller = "Seller",
  SellerAgent = "Seller Agent",
  System = "System",
}

export enum OfferCertificatePriceDtoDealTypeEnum {
  FINANCE = "FINANCE",
  LEASE = "LEASE",
  CASH = "CASH",
}

export enum OfferCertificatePriceDtoTypeEnum {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
}

export enum OfferCertificatePriceDtoPerEnum {
  Year = "year",
  Month = "month",
  Total = "total",
}

/** @example "v1" */
export enum OfferCertificateSnapshotV1DtoSchemaVersionEnum {
  V1 = "v1",
}

/** @example true */
export enum PublicOfferCertificateResponseDtoOkEnum {
  True = true,
}

export enum UnreadChatsEmailChatDtoScopeEnum {
  GENERAL_SAVED_SEARCHES = "GENERAL_SAVED_SEARCHES",
  GENERAL_NEGOTIATIONS = "GENERAL_NEGOTIATIONS",
  GENERAL_OFFERS = "GENERAL_OFFERS",
  GENERAL_STRATEGIES = "GENERAL_STRATEGIES",
  SAVED_SEARCH = "SAVED_SEARCH",
  NEGOTIATION = "NEGOTIATION",
  OFFER = "OFFER",
  STRATEGY = "STRATEGY",
}

/**
 * Offer status filter for vehicles-with-offers list
 * @default "all"
 */
export enum NegotiationsControllerFindOfferVehiclesParamsOfferStatusEnum {
  All = "all",
  Active = "active",
  Inactive = "inactive",
}

export enum AdminOfferTermsControllerActivateVersionSideEnum {
  BUYER = "BUYER",
  SELLER = "SELLER",
}

/**
 * Sort field
 * @default "updatedAt"
 */
export enum DealerInventoryControllerListDealerInventoryParamsSortFieldEnum {
  UpdatedAt = "updatedAt",
  CreatedAt = "createdAt",
  Price = "price",
  Year = "year",
  Mileage = "mileage",
}

/**
 * Sort order
 * @default "desc"
 */
export enum DealerInventoryControllerListDealerInventoryParamsSortOrderEnum {
  Asc = "asc",
  Desc = "desc",
}

/**
 * Sort field (legacy single-sort)
 * @default "updatedAt"
 */
export enum DealerInventoryOptimizedControllerListParamsSortFieldEnum {
  UpdatedAt = "updatedAt",
  CreatedAt = "createdAt",
  Price = "price",
  Year = "year",
  Mileage = "mileage",
}

/**
 * Sort order (legacy single-sort)
 * @default "desc"
 */
export enum DealerInventoryOptimizedControllerListParamsSortOrderEnum {
  Asc = "asc",
  Desc = "desc",
}

export namespace App {
  /**
   * No description
   * @tags App
   * @name AppControllerGetSidebarAdminDashboard
   * @summary Get sidebar for admin dashboard
   * @request GET:/app/admin-dashboard-sidebar
   * @secure
   * @response `200` `AdminDashboardSidebarDto` Sidebar for admin dashboard
   */
  export namespace AppControllerGetSidebarAdminDashboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AdminDashboardSidebarDto;
  }
}

export namespace Ping {
  /**
   * No description
   * @tags Health
   * @name HealthControllerPing
   * @request GET:/ping
   * @secure
   * @response `200` `void`
   */
  export namespace HealthControllerPing {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Public {
  /**
   * No description
   * @tags Public URL resolve
   * @name PublicUrlResolveControllerResolveVehicle
   * @summary Resolve a public vehicle URL token to id + current slug
   * @request GET:/public/url-resolve/vehicle/{token}
   * @secure
   * @response `200` `void`
   * @response `404` `void`
   */
  export namespace PublicUrlResolveControllerResolveVehicle {
    export type RequestParams = {
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Public URL resolve
   * @name PublicUrlResolveControllerResolveDealer
   * @summary Resolve a public dealer URL token to id + current slug
   * @request GET:/public/url-resolve/dealer/{token}
   * @secure
   * @response `200` `void`
   * @response `404` `void`
   */
  export namespace PublicUrlResolveControllerResolveDealer {
    export type RequestParams = {
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Public sitemap
   * @name SitemapPublicControllerIndex
   * @summary Last-good sitemap index (S3 read only)
   * @request GET:/public/sitemap.xml
   * @secure
   * @response `200` `void`
   */
  export namespace SitemapPublicControllerIndex {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Public sitemap
   * @name SitemapPublicControllerShard
   * @summary Last-good sitemap shard (S3 read only)
   * @request GET:/public/sitemap/{file}
   * @secure
   * @response `200` `void`
   */
  export namespace SitemapPublicControllerShard {
    export type RequestParams = {
      /** @example "0.xml" */
      file: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Public dealers
   * @name PublicDealersControllerList
   * @summary List CLAIMED dealers (public)
   * @request GET:/public/dealers
   * @secure
   * @response `200` `PublicDealerListResponseDto`
   */
  export namespace PublicDealersControllerList {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
      /** Search by business name or city/state (contains, case-insensitive) */
      query?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublicDealerListResponseDto;
  }

  /**
   * No description
   * @tags Public dealers
   * @name PublicDealersControllerListVehicles
   * @summary List ACTIVE vehicles for a public dealer profile
   * @request GET:/public/dealers/{id}/vehicles
   * @secure
   * @response `200` `PublicDealerVehiclesResponseDto`
   * @response `404` `void` Dealer not found
   */
  export namespace PublicDealersControllerListVehicles {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 6
       */
      limit?: number;
      /** Filter by make (exact, case-insensitive) */
      make?: string;
      /** Filter by model (exact, case-insensitive) */
      model?: string;
      /** Filter by model year (exact) */
      year?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublicDealerVehiclesResponseDto;
  }

  /**
   * No description
   * @tags Public dealers
   * @name PublicDealersControllerGetVehicleFilters
   * @summary Get make/model/year filter options for dealer inventory
   * @request GET:/public/dealers/{id}/vehicle-filters
   * @secure
   * @response `200` `PublicDealerVehicleFiltersDto`
   * @response `404` `void` Dealer not found
   */
  export namespace PublicDealersControllerGetVehicleFilters {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      /** Scope models list to a make */
      make?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublicDealerVehicleFiltersDto;
  }

  /**
   * No description
   * @tags Public dealers
   * @name PublicDealersControllerGetById
   * @summary Get public dealer profile by id
   * @request GET:/public/dealers/{id}
   * @secure
   * @response `200` `PublicDealerProfileDto`
   * @response `404` `void` Dealer not found
   */
  export namespace PublicDealersControllerGetById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublicDealerProfileDto;
  }

  /**
   * No description
   * @tags Public offer certificate
   * @name PublicOffersCertificateControllerGetByToken
   * @summary Resolve an offer certificate snapshot by share token (public)
   * @request GET:/public/offers/certificate/{token}
   * @secure
   * @response `200` `PublicOfferCertificateResponseDto`
   */
  export namespace PublicOffersCertificateControllerGetByToken {
    export type RequestParams = {
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublicOfferCertificateResponseDto;
  }
}

export namespace Admin {
  /**
   * No description
   * @tags Admin SEO
   * @name SeoSitemapControllerStatus
   * @summary Last-good sitemap rebuild status (no slug list)
   * @request GET:/admin/seo/sitemap-status
   * @secure
   * @response `200` `void`
   */
  export namespace SeoSitemapControllerStatus {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin SEO
   * @name SeoSitemapControllerRebuildNow
   * @summary Force sitemap rewrite (skip probe equality)
   * @request POST:/admin/seo/sitemap-rebuild
   * @secure
   * @response `202` `void`
   */
  export namespace SeoSitemapControllerRebuildNow {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerCreate
   * @summary Create a new negotiation
   * @request POST:/admin/negotiations
   * @secure
   * @response `201` `NegotiationEntity` The negotiation has been successfully created.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace NegotiationsControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateNegotiationDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationEntity;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindAll
   * @summary List negotiations
   * @request GET:/admin/negotiations
   * @secure
   * @response `200` `NegotiationsPageResponseDto` Paginated negotiations
   */
  export namespace NegotiationsControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Page number (1-based)
       * @default 1
       */
      page?: number;
      /**
       * Limit per page
       * @default 20
       */
      limit?: number;
      /**
       * When set, list dealer-owner assets for this dealer after membership + permission checks (query principal).
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationsPageResponseDto;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindOfferVehicles
   * @summary List vehicles that have offers for the current user
   * @request GET:/admin/negotiations/offers/vehicles
   * @secure
   * @response `200` `OffersVehiclesResponseDto` Vehicles with offers
   */
  export namespace NegotiationsControllerFindOfferVehicles {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Page number (1-based)
       * @default 1
       */
      page?: number;
      /**
       * Limit per page
       * @default 20
       */
      limit?: number;
      /** Vehicle make filter (exact match) */
      make?: string;
      /**
       * Offer status filter for vehicles-with-offers list
       * @default "all"
       */
      offerStatus?: NegotiationsControllerFindOfferVehiclesParamsOfferStatusEnum;
      /**
       * When set, list dealer-owner offer vehicles for this dealer after membership + permission checks.
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OffersVehiclesResponseDto;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindOffersByVehicle
   * @summary List negotiations-with-offers for a vehicle (paginated)
   * @request GET:/admin/negotiations/offers/vehicle/{vehicleId}
   * @secure
   * @response `200` `NegotiationsPageResponseDto` Paginated negotiations filtered by vehicleId and offers presence
   */
  export namespace NegotiationsControllerFindOffersByVehicle {
    export type RequestParams = {
      vehicleId: string;
    };
    export type RequestQuery = {
      /**
       * Page number (1-based)
       * @default 1
       */
      page?: number;
      /**
       * Limit per page
       * @default 20
       */
      limit?: number;
      /**
       * When set, list dealer-owner assets for this dealer after membership + permission checks (query principal).
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationsPageResponseDto;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindFullNegotiation
   * @summary Get full negotiation by id (with vehicle, savedSearch, offers)
   * @request GET:/admin/negotiations/{id}/full
   * @secure
   * @response `200` `FullNegotiationResponseDto` Full negotiation (negotiation + vehicle + savedSearch + offers)
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace NegotiationsControllerFindFullNegotiation {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = FullNegotiationResponseDto;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindOne
   * @summary Get negotiation by id
   * @request GET:/admin/negotiations/{id}
   * @secure
   * @response `200` `NegotiationEntity` Negotiation
   */
  export namespace NegotiationsControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationEntity;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerUpdate
   * @summary Update negotiation
   * @request PATCH:/admin/negotiations/{id}
   * @secure
   * @response `200` `NegotiationEntity` Updated negotiation
   */
  export namespace NegotiationsControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateNegotiationDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationEntity;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerRemove
   * @summary Delete negotiation
   * @request DELETE:/admin/negotiations/{id}
   * @secure
   * @response `200` `void` Deleted negotiation
   */
  export namespace NegotiationsControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerRequestStrategyChange
   * @summary Request negotiation strategy change (may require expiry decision)
   * @request POST:/admin/negotiations/{id}/strategy-change
   * @secure
   * @response `201` `void`
   */
  export namespace NegotiationsControllerRequestStrategyChange {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RequestNegotiationStrategyChangeDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerConfirmStrategyChange
   * @summary Confirm negotiation strategy change expiry decision
   * @request POST:/admin/negotiations/{id}/strategy-change/confirm
   * @secure
   * @response `201` `void`
   */
  export namespace NegotiationsControllerConfirmStrategyChange {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ConfirmNegotiationStrategyChangeDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags Admin Negotiations
 * @name NegotiationsControllerFindExistingNegotiationsForMe
 * @summary Get existing negotiations for the current buyer and vehicle ids
 * @request POST:/admin/negotiations/existing-negotiations/for-me
 * @secure
 * @response `200` `({
    id?: string,
    vehicleId?: string,

})[]` Existing negotiations for the current user
*/
  export namespace NegotiationsControllerFindExistingNegotiationsForMe {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ExistingNegotiationsForVehiclesDto;
    export type RequestHeaders = {};
    export type ResponseBody = {
      id?: string;
      vehicleId?: string;
    }[];
  }

  /**
   * No description
   * @tags Admin Negotiations
   * @name NegotiationsControllerFindExistingNegotiation
   * @summary Get latest negotiation for a saved search
   * @request GET:/admin/negotiations/existing-negotiation/{savedSearchId}
   * @secure
   * @response `200` `NegotiationEntity` Existing negotiation
   */
  export namespace NegotiationsControllerFindExistingNegotiation {
    export type RequestParams = {
      savedSearchId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationEntity;
  }

  /**
 * No description
 * @tags Admin Negotiations
 * @name NegotiationsControllerFindExistingNegotiationsForVehicles
 * @summary Get existing negotiations for saved search and vehicle ids
 * @request POST:/admin/negotiations/existing-negotiations/lookup
 * @secure
 * @response `200` `({
    id?: string,
    vehicleId?: string,

})[]` Existing negotiations lookup result
*/
  export namespace NegotiationsControllerFindExistingNegotiationsForVehicles {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ExistingNegotiationsLookupDto;
    export type RequestHeaders = {};
    export type ResponseBody = {
      id?: string;
      vehicleId?: string;
    }[];
  }

  /**
   * No description
   * @tags Admin Negotiation Strategies
   * @name NegotiationStrategiesControllerFindAll
   * @summary List global negotiation strategy templates
   * @request GET:/admin/negotiation-strategies
   * @secure
   * @response `200` `(NegotiationStrategyEntity)[]` List of global strategy templates (userId=null)
   */
  export namespace NegotiationStrategiesControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity[];
  }

  /**
   * No description
   * @tags Admin Negotiation Strategies
   * @name NegotiationStrategiesControllerCreate
   * @summary Create global negotiation strategy template
   * @request POST:/admin/negotiation-strategies
   * @secure
   * @response `201` `NegotiationStrategyEntity` Created global strategy template (userId=null)
   */
  export namespace NegotiationStrategiesControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateNegotiationStrategyRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Admin Negotiation Strategies
   * @name NegotiationStrategiesControllerFindOne
   * @summary Get global strategy template by id
   * @request GET:/admin/negotiation-strategies/{id}
   * @secure
   * @response `200` `NegotiationStrategyEntity` Global strategy template (userId=null)
   */
  export namespace NegotiationStrategiesControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Admin Negotiation Strategies
   * @name NegotiationStrategiesControllerUpdate
   * @summary Update global negotiation strategy template
   * @request PATCH:/admin/negotiation-strategies/{id}
   * @secure
   * @response `200` `NegotiationStrategyEntity` Updated global strategy template (userId=null)
   */
  export namespace NegotiationStrategiesControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateNegotiationStrategyRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Admin Lead Source
   * @name LeadSetupAdminControllerUpsert
   * @summary Create or update LeadSetup for a FeedSource (feed default or per-dealer)
   * @request POST:/admin/lead-source
   * @secure
   * @response `201` `void`
   */
  export namespace LeadSetupAdminControllerUpsert {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateLeadSetupDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags Admin Lead Source
 * @name LeadSetupAdminControllerList
 * @summary List LeadSetups (paged)
 * @request GET:/admin/lead-source
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (LeadSetupEntity)[],

})` LeadSetups retrieved successfully.
*/
  export namespace LeadSetupAdminControllerList {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: LeadSetupEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Lead Source
   * @name LeadSetupAdminControllerListDealers
   * @summary List dealers linked to a FeedSource (for per-dealer LeadSetup)
   * @request GET:/admin/lead-source/dealers
   * @secure
   * @response `200` `(LeadSetupDealerOptionDto)[]`
   */
  export namespace LeadSetupAdminControllerListDealers {
    export type RequestParams = {};
    export type RequestQuery = {
      /** FeedSource id to list dealers for */
      feedSourceId: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LeadSetupDealerOptionDto[];
  }

  /**
   * No description
   * @tags Admin Lead Source
   * @name LeadSetupAdminControllerLookup
   * @summary Lookup per-dealer LeadSetup for a FeedSource + dealer pair
   * @request GET:/admin/lead-source/lookup
   * @secure
   * @response `200` `(LeadSetupEntity | null)`
   */
  export namespace LeadSetupAdminControllerLookup {
    export type RequestParams = {};
    export type RequestQuery = {
      /** FeedSource id */
      feedSourceId: string;
      /** Dealer id for per-dealer LeadSetup lookup */
      dealerId: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LeadSetupEntity | null;
  }

  /**
   * No description
   * @tags Admin Lead Source
   * @name LeadSetupAdminControllerPreviewEleadsTargets
   * @summary Preview default ELEADS destination emails for a FeedSource (when credentials.toEmail is empty)
   * @request GET:/admin/lead-source/eleads-target-preview
   * @secure
   * @response `200` `void`
   */
  export namespace LeadSetupAdminControllerPreviewEleadsTargets {
    export type RequestParams = {};
    export type RequestQuery = {
      /** FeedSource id to preview ELEADS targets for */
      feedSourceId: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Offer terms
   * @name AdminOfferTermsControllerCreateVersion
   * @summary Create a standard terms version (optionally activate)
   * @request POST:/admin/offers/terms/version
   * @secure
   * @response `201` `OfferStandardTermsEntity`
   */
  export namespace AdminOfferTermsControllerCreateVersion {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpsertOfferStandardTermsDto;
    export type RequestHeaders = {};
    export type ResponseBody = OfferStandardTermsEntity;
  }

  /**
   * No description
   * @tags Admin Offer terms
   * @name AdminOfferTermsControllerActivateVersion
   * @summary Activate an existing version for (side,isDealer)
   * @request POST:/admin/offers/terms/activate
   * @secure
   * @response `200` `OfferStandardTermsEntity`
   */
  export namespace AdminOfferTermsControllerActivateVersion {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      side: AdminOfferTermsControllerActivateVersionSideEnum;
      isDealer: boolean;
      /** @example "2026-06-21" */
      versionDate: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = OfferStandardTermsEntity;
  }

  /**
   * No description
   * @tags Admin
   * @name AdminControllerUpdateUserByAdmin
   * @summary Admin: Update arbitrary user fields
   * @request PUT:/admin/user
   * @secure
   * @response `200` `void` User updated successfully.
   */
  export namespace AdminControllerUpdateUserByAdmin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateUserDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin
   * @name AdminControllerDeleteUserByAdmin
   * @summary Admin: Delete user
   * @request DELETE:/admin/user/{id}
   * @secure
   * @response `200` `void` User deleted successfully.
   */
  export namespace AdminControllerDeleteUserByAdmin {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Offers
   * @name AdminOffersControllerSetupOffers
   * @summary Setup offers
   * @request GET:/admin/offers/setup
   * @secure
   * @response `200` `void` Offers setup successfully.
   */
  export namespace AdminOffersControllerSetupOffers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Offers
   * @name AdminOffersControllerCreateOffer
   * @summary Create offer
   * @request POST:/admin/offers/create
   * @secure
   * @response `201` `void` Offer created successfully.
   */
  export namespace AdminOffersControllerCreateOffer {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateOfferDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Offers
   * @name AdminOffersControllerGetOffersByNegotiationId
   * @summary Get offers by negotiationId
   * @request GET:/admin/offers/{negotiationId}
   * @secure
   * @response `200` `(OfferEntity)[]` Offers fetched successfully.
   */
  export namespace AdminOffersControllerGetOffersByNegotiationId {
    export type RequestParams = {
      negotiationId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OfferEntity[];
  }

  /**
   * No description
   * @tags Admin Offers
   * @name AdminOffersControllerUpdateOffer
   * @summary Update offer
   * @request PUT:/admin/offers/{id}
   * @secure
   * @response `200` `void` Offer updated successfully.
   */
  export namespace AdminOffersControllerUpdateOffer {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateOfferDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Offer Addons
   * @name AdminOfferAddonsControllerList
   * @summary List offer addon templates
   * @request GET:/admin/offer-addons
   * @secure
   * @response `200` `(OfferAddonTemplateEntity)[]` Offer addon templates fetched successfully.
   */
  export namespace AdminOfferAddonsControllerList {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OfferAddonTemplateEntity[];
  }

  /**
   * No description
   * @tags Admin Offer Addons
   * @name AdminOfferAddonsControllerCreate
   * @summary Create offer addon template
   * @request POST:/admin/offer-addons
   * @secure
   * @response `201` `OfferAddonTemplateEntity` Offer addon template created successfully.
   */
  export namespace AdminOfferAddonsControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateOfferAddonDto;
    export type RequestHeaders = {};
    export type ResponseBody = OfferAddonTemplateEntity;
  }

  /**
   * No description
   * @tags Admin Offer Addons
   * @name AdminOfferAddonsControllerDelete
   * @summary Delete offer addon template
   * @request DELETE:/admin/offer-addons/{id}
   * @secure
   * @response `200` `OfferAddonTemplateEntity` Offer addon template deleted successfully.
   */
  export namespace AdminOfferAddonsControllerDelete {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OfferAddonTemplateEntity;
  }

  /**
   * No description
   * @tags Admin Vehicles
   * @name VehiclesControllerCreate
   * @request POST:/admin/vehicles
   * @secure
   * @response `201` `void`
   */
  export namespace VehiclesControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateVehicleDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags Admin Vehicles
 * @name VehiclesControllerFindAll
 * @summary Get all vehicles
 * @request POST:/admin/vehicles/list
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (VehicleEntity)[],

})` The vehicles have been successfully retrieved.
*/
  export namespace VehiclesControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FindAllVehiclesQueryDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: VehicleEntity[];
    };
  }

  /**
 * No description
 * @tags Admin Vehicles
 * @name VehiclesControllerFindOne
 * @summary Get a vehicle by ID
 * @request GET:/admin/vehicles/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: VehicleEntity,

})` The vehicle has been successfully retrieved.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
*/
  export namespace VehiclesControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: VehicleEntity;
    };
  }

  /**
 * No description
 * @tags Admin Vehicles
 * @name VehiclesControllerUpdate
 * @summary Update a vehicle
 * @request PATCH:/admin/vehicles/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: VehicleEntity,

})` The vehicle has been successfully updated.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
*/
  export namespace VehiclesControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateVehicleDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: VehicleEntity;
    };
  }

  /**
 * No description
 * @tags Admin Vehicles
 * @name VehiclesControllerSearch
 * @summary Search for vehicles
 * @request POST:/admin/vehicles/search
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (VehicleEntity)[],

})` The vehicles have been successfully searched.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
*/
  export namespace VehiclesControllerSearch {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SearchVehicleQueryDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: VehicleEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Automotive Groups
   * @name AutomotiveGroupsAdminControllerCreate
   * @summary Create Automotive Group
   * @request POST:/admin/automotive-groups
   * @secure
   * @response `200` `AutomotiveGroupEntity`
   */
  export namespace AutomotiveGroupsAdminControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateAutomotiveGroupDto;
    export type RequestHeaders = {};
    export type ResponseBody = AutomotiveGroupEntity;
  }

  /**
 * No description
 * @tags Admin Automotive Groups
 * @name AutomotiveGroupsAdminControllerFindPage
 * @summary List Automotive Groups (paged)
 * @request GET:/admin/automotive-groups
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (AutomotiveGroupEntity)[],

})`
*/
  export namespace AutomotiveGroupsAdminControllerFindPage {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
      /** Search by name (contains, case-insensitive) */
      query?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: AutomotiveGroupEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Automotive Groups
   * @name AutomotiveGroupsAdminControllerFindOne
   * @summary Get Automotive Group by id
   * @request GET:/admin/automotive-groups/{id}
   * @secure
   * @response `200` `AutomotiveGroupEntity`
   */
  export namespace AutomotiveGroupsAdminControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AutomotiveGroupEntity;
  }

  /**
   * No description
   * @tags Admin Automotive Groups
   * @name AutomotiveGroupsAdminControllerUpdate
   * @summary Update Automotive Group
   * @request PATCH:/admin/automotive-groups/{id}
   * @secure
   * @response `200` `AutomotiveGroupEntity`
   */
  export namespace AutomotiveGroupsAdminControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateAutomotiveGroupDto;
    export type RequestHeaders = {};
    export type ResponseBody = AutomotiveGroupEntity;
  }

  /**
   * No description
   * @tags Admin Automotive Groups
   * @name AutomotiveGroupsAdminControllerRemove
   * @summary Delete Automotive Group (if no Dealers reference it)
   * @request DELETE:/admin/automotive-groups/{id}
   * @secure
   * @response `200` `AutomotiveGroupEntity`
   */
  export namespace AutomotiveGroupsAdminControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AutomotiveGroupEntity;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerCreate
   * @summary Create Dealer
   * @request POST:/admin/dealers
   * @secure
   * @response `200` `DealerEntity`
   */
  export namespace DealersAdminControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateDealerDto;
    export type RequestHeaders = {};
    export type ResponseBody = DealerEntity;
  }

  /**
 * No description
 * @tags Admin Dealers
 * @name DealersAdminControllerFindPage
 * @summary List Dealers (paged)
 * @request GET:/admin/dealers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (DealerEntity)[],

})`
*/
  export namespace DealersAdminControllerFindPage {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
      /** Search by businessName (contains, case-insensitive) */
      query?: string;
      /** Include UNCLAIMED dealers (picker); default grid is CLAIMED only */
      includeUnclaimed?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: DealerEntity[];
    };
  }

  /**
 * No description
 * @tags Admin Dealers
 * @name DealersAdminControllerFindAllUnclaimed
 * @summary List all UNCLAIMED dealers (feed claim picker)
 * @request GET:/admin/dealers/unclaimed
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (DealerEntity)[],

})`
*/
  export namespace DealersAdminControllerFindAllUnclaimed {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: DealerEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerFindOne
   * @summary Get Dealer by id
   * @request GET:/admin/dealers/{id}
   * @secure
   * @response `200` `DealerEntity`
   */
  export namespace DealersAdminControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerEntity;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerUpdate
   * @summary Update Dealer
   * @request PATCH:/admin/dealers/{id}
   * @secure
   * @response `200` `DealerEntity`
   */
  export namespace DealersAdminControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateDealerDto;
    export type RequestHeaders = {};
    export type ResponseBody = DealerEntity;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerRemove
   * @summary Delete Dealer
   * @request DELETE:/admin/dealers/{id}
   * @secure
   * @response `200` `DealerEntity`
   */
  export namespace DealersAdminControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerEntity;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerInviteMember
   * @summary Invite/link a dealer member by email
   * @request POST:/admin/dealers/{id}/members/invite
   * @secure
   * @response `200` `void` DealerMember row (invite or active membership).
   */
  export namespace DealersAdminControllerInviteMember {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = DealerMemberInviteDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerReplaceOwner
   * @summary Replace dealer owner (revoke current + invite/link new)
   * @request POST:/admin/dealers/{id}/members/replace-owner
   * @secure
   * @response `200` `void` DealerMember row for the new (or updated) owner invite/membership.
   */
  export namespace DealersAdminControllerReplaceOwner {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ReplaceDealerOwnerDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Dealers
   * @name DealersAdminControllerGetAdminStatus
   * @summary Get dealer admin invite/membership status
   * @request GET:/admin/dealers/{id}/members/admin-status
   * @secure
   * @response `200` `DealerAdminStatusResponseDto` Dealer admin state (active vs invited).
   */
  export namespace DealersAdminControllerGetAdminStatus {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerAdminStatusResponseDto;
  }

  /**
   * No description
   * @tags ChatSystemToolPolicy
   * @name ChatSystemToolPolicyControllerList
   * @request GET:/admin/chat-tools
   * @secure
   * @response `200` `void`
   */
  export namespace ChatSystemToolPolicyControllerList {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags ChatSystemToolPolicy
   * @name ChatSystemToolPolicyControllerSetOptionalDefault
   * @request PATCH:/admin/chat-tools
   * @secure
   * @response `200` `void`
   */
  export namespace ChatSystemToolPolicyControllerSetOptionalDefault {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateChatSystemToolPolicyDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerCreate
   * @summary Create FeedSource
   * @request POST:/admin/feed-sources
   * @secure
   * @response `201` `void`
   */
  export namespace FeedSourceControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateFeedSourceDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags Admin Feed Sources
 * @name FeedSourceControllerFindPage
 * @summary List FeedSources (paged)
 * @request GET:/admin/feed-sources
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedSourceEntity)[],

})` FeedSources retrieved successfully.
*/
  export namespace FeedSourceControllerFindPage {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: FeedSourceEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerGetConnectionConfig
   * @summary Get tenant-level feed connection config used for derived URLs
   * @request GET:/admin/feed-sources/connection-config
   * @secure
   * @response `200` `void`
   */
  export namespace FeedSourceControllerGetConnectionConfig {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags Admin Feed Sources
 * @name FeedSourceControllerListFeedProviders
 * @summary List known feed providers for MULTI_DEALER_FTP sources
 * @request GET:/admin/feed-sources/feed-providers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedProviderEntity)[],

})` Feed providers retrieved successfully.
*/
  export namespace FeedSourceControllerListFeedProviders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: FeedProviderEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerFindOne
   * @summary Get FeedSource by id
   * @request GET:/admin/feed-sources/{id}
   * @secure
   * @response `404` `void` FeedSource not found
   */
  export namespace FeedSourceControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = any;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerUpdate
   * @summary Update FeedSource
   * @request PATCH:/admin/feed-sources/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FeedSourceControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateFeedSourceDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerRemove
   * @summary Delete FeedSource
   * @request DELETE:/admin/feed-sources/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FeedSourceControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerGetConnection
   * @summary Reveal feed connection details including password-bearing connection URL
   * @request GET:/admin/feed-sources/{id}/connection-url
   * @secure
   * @response `200` `void`
   */
  export namespace FeedSourceControllerGetConnection {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerResetPassword
   * @summary Rotate feed password and return the new derived connection URL
   * @request POST:/admin/feed-sources/{id}/reset-password
   * @secure
   * @response `201` `void`
   */
  export namespace FeedSourceControllerResetPassword {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerPreviewMappingCsv
   * @summary Preview CSV headers and sample rows for the feed source using the currently configured remote path and credentials
   * @request GET:/admin/feed-sources/{id}/mapping-preview
   * @secure
   * @response `200` `FeedSourceCsvPreviewEntity`
   */
  export namespace FeedSourceControllerPreviewMappingCsv {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = FeedSourceCsvPreviewEntity;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerValidateMapping
   * @summary Validate candidate mapping/defaults against the previewed CSV headers before saving
   * @request POST:/admin/feed-sources/{id}/mapping-validate
   * @secure
   * @response `200` `FeedSourceMappingValidationEntity`
   */
  export namespace FeedSourceControllerValidateMapping {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ValidateFeedSourceMappingDto;
    export type RequestHeaders = {};
    export type ResponseBody = FeedSourceMappingValidationEntity;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerRunImportNow
   * @summary Run FeedSource import now
   * @request POST:/admin/feed-sources/{id}/import
   * @secure
   * @response `202` `void`
   */
  export namespace FeedSourceControllerRunImportNow {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Sources
   * @name FeedSourceControllerBackfillDealerContactGeo
   * @summary Backfill missing dealer-contact coordinates for a single FeedSource
   * @request POST:/admin/feed-sources/{id}/dealer-contacts/backfill-geo
   * @secure
   * @response `200` `DealerContactGeoBackfillEntity`
   */
  export namespace FeedSourceControllerBackfillDealerContactGeo {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      /**
       * @min 1
       * @max 5000
       * @default 500
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerContactGeoBackfillEntity;
  }

  /**
 * No description
 * @tags Admin Feed Providers
 * @name FeedProviderControllerList
 * @summary List feed providers
 * @request GET:/admin/feed-providers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedProviderAdminEntity)[],

})` Feed providers retrieved successfully.
*/
  export namespace FeedProviderControllerList {
    export type RequestParams = {};
    export type RequestQuery = {
      /** When true, return only enabled providers (for selects). */
      enabled?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: FeedProviderAdminEntity[];
    };
  }

  /**
   * No description
   * @tags Admin Feed Providers
   * @name FeedProviderControllerCreate
   * @summary Create feed provider
   * @request POST:/admin/feed-providers
   * @secure
   * @response `201` `void`
   */
  export namespace FeedProviderControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateFeedProviderDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Providers
   * @name FeedProviderControllerFindOne
   * @summary Get feed provider by id
   * @request GET:/admin/feed-providers/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FeedProviderControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Providers
   * @name FeedProviderControllerUpdate
   * @summary Update feed provider (code is immutable)
   * @request PATCH:/admin/feed-providers/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FeedProviderControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateFeedProviderDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Admin Feed Providers
   * @name FeedProviderControllerRemove
   * @summary Delete feed provider. Fails with 409 if referenced by feed sources or dealer identities.
   * @request DELETE:/admin/feed-providers/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FeedProviderControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace User {
  /**
   * No description
   * @tags User
   * @name UserControllerGetProfile
   * @summary Get user profile
   * @request GET:/user/profile
   * @secure
   * @response `200` `ApiResponseDto` Successfully retrieved user profile
   * @response `401` `void` Unauthorized - Invalid or missing token
   */
  export namespace UserControllerGetProfile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * @description preferredZip, preferredCityState, and unreadEmailTimingMinutes cannot be updated via this endpoint (stripped server-side). Use PATCH /user/profile/preferred-location or PATCH /user/notification-settings.
   * @tags User
   * @name UserControllerUpdateProfile
   * @summary Update user profile
   * @request PUT:/user/profile
   * @secure
   * @response `200` `ApiResponseDto` Successfully updated user profile
   * @response `401` `void` Unauthorized - Invalid or missing token
   */
  export namespace UserControllerUpdateProfile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags User
   * @name UserControllerCreateProfile
   * @summary Create user profile
   * @request POST:/user/profile
   * @secure
   * @response `201` `ApiResponseDto` Successfully created user profile
   * @response `401` `void` Unauthorized - Invalid or missing token
   */
  export namespace UserControllerCreateProfile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserCreateInputDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags User
   * @name UserControllerDeleteProfile
   * @summary Delete user profile
   * @request DELETE:/user/profile
   * @secure
   * @response `200` `ApiResponseDto` Successfully deleted user profile
   * @response `401` `void` Unauthorized - Invalid or missing token
   */
  export namespace UserControllerDeleteProfile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * @description Creates or updates preferredZip/preferredCityState for the authenticated user. Each provided body field overwrites that column; omitted keys are unchanged. Use instead of PUT /user/profile for these fields.
   * @tags User
   * @name UserControllerPatchPreferredLocation
   * @summary Upsert preferred search location
   * @request PATCH:/user/profile/preferred-location
   * @secure
   * @response `200` `UserDto` Preferred location saved
   * @response `400` `void` Validation error
   */
  export namespace UserControllerPatchPreferredLocation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PreferredLocationPatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = UserDto;
  }

  /**
   * @description Sets preferredZip and preferredCityState to null for the authenticated user.
   * @tags User
   * @name UserControllerDeletePreferredLocation
   * @summary Clear preferred search location
   * @request DELETE:/user/profile/preferred-location
   * @secure
   * @response `200` `UserDto` Preferred location cleared
   * @response `400` `void` User not found
   */
  export namespace UserControllerDeletePreferredLocation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UserDto;
  }

  /**
   * @description Returns per-user unread email digest timing. Null unreadEmailTimingMinutes means system default.
   * @tags User
   * @name UserControllerGetNotificationSettings
   * @summary Get unread-chat email notification settings
   * @request GET:/user/notification-settings
   * @secure
   * @response `200` `NotificationSettingsDto` Notification settings
   */
  export namespace UserControllerGetNotificationSettings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NotificationSettingsDto;
  }

  /**
   * @description Sets unreadEmailTimingMinutes to 15, 60, 480, 1440, or null (system default). Prefer this over PUT /user/profile.
   * @tags User
   * @name UserControllerPatchNotificationSettings
   * @summary Update unread-chat email notification settings
   * @request PATCH:/user/notification-settings
   * @secure
   * @response `200` `NotificationSettingsDto` Notification settings saved
   * @response `400` `void` Validation error
   */
  export namespace UserControllerPatchNotificationSettings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = NotificationSettingsPatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = NotificationSettingsDto;
  }

  /**
   * No description
   * @tags User
   * @name UserControllerGetAgents
   * @summary Get agents
   * @request GET:/user/agents
   * @secure
   * @response `200` `ApiResponseDto` Successfully retrieved agents
   */
  export namespace UserControllerGetAgents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags User
   * @name UserControllerGetAllUsers
   * @summary Get all users
   * @request GET:/user/all
   * @secure
   * @response `200` `ApiResponseDto` Successfully retrieved all users
   */
  export namespace UserControllerGetAllUsers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }
}

export namespace Oauth {
  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerInitiateGoogleAuth
   * @summary Initiate Google OAuth authentication
   * @request GET:/oauth/google
   * @secure
   * @response `302` `void` Redirects to Google authentication page
   * @response `500` `void` Failed to initiate Google authentication
   */
  export namespace OAuthControllerInitiateGoogleAuth {
    export type RequestParams = {};
    export type RequestQuery = {
      app: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = any;
  }

  /**
 * No description
 * @tags OAuth
 * @name OAuthControllerHandleGoogleCode
 * @summary Handle Google OAuth callback
 * @request POST:/oauth/google/code
 * @secure
 * @response `200` `{
  /** JWT access token *\/
    access_token?: string,
  /** JWT ID token *\/
    id_token?: string,
  /** JWT refresh token *\/
    refresh_token?: string,
  /** Token expiration time in seconds *\/
    expires_in?: number,
  /**
   * Type of token
   * @example "Bearer"
   *\/
    token_type?: string,

}` Successfully exchanged code for tokens
 * @response `400` `void` No code provided
 * @response `500` `void` Failed to exchange code for tokens
*/
  export namespace OAuthControllerHandleGoogleCode {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      /**
       * Authorization code from Google OAuth
       * @example "4/0AfJohXn5g6..."
       */
      code: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = {
      /** JWT access token */
      access_token?: string;
      /** JWT ID token */
      id_token?: string;
      /** JWT refresh token */
      refresh_token?: string;
      /** Token expiration time in seconds */
      expires_in?: number;
      /**
       * Type of token
       * @example "Bearer"
       */
      token_type?: string;
    };
  }

  /**
 * No description
 * @tags OAuth
 * @name OAuthControllerGetProfile
 * @summary Get user profile
 * @request GET:/oauth/profile
 * @secure
 * @response `200` `{
    data?: {
  /** User ID *\/
    id?: string,
  /** User email *\/
    email?: string,
  /** User name *\/
    name?: string,
  /** User avatar *\/
    avatar?: string,

},

}` Successfully got user profile
 * @response `400` `void` No access token provided
 * @response `500` `void` Failed to get user profile
*/
  export namespace OAuthControllerGetProfile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = {
      data?: {
        /** User ID */
        id?: string;
        /** User email */
        email?: string;
        /** User name */
        name?: string;
        /** User avatar */
        avatar?: string;
      };
    };
  }

  /**
 * No description
 * @tags OAuth
 * @name OAuthControllerRefreshToken
 * @summary Refresh access token using refresh token
 * @request POST:/oauth/refresh
 * @secure
 * @response `200` `{
  /** New JWT access token *\/
    access_token?: string,
  /** New JWT ID token *\/
    id_token?: string,
  /** Token expiration time in seconds *\/
    expires_in?: number,
  /**
   * Type of token
   * @example "Bearer"
   *\/
    token_type?: string,

}` Successfully refreshed access token
 * @response `400` `void` No refresh token provided
 * @response `401` `void` Invalid refresh token
 * @response `500` `void` Failed to refresh access token
*/
  export namespace OAuthControllerRefreshToken {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      /**
       * Refresh token to exchange for new access token
       * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
       */
      refresh_token: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = {
      /** New JWT access token */
      access_token?: string;
      /** New JWT ID token */
      id_token?: string;
      /** Token expiration time in seconds */
      expires_in?: number;
      /**
       * Type of token
       * @example "Bearer"
       */
      token_type?: string;
    };
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordSignUp
   * @summary Sign up with email/password
   * @request POST:/oauth/password/signup
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordSignUp {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordConfirm
   * @summary Confirm sign up code for email/password
   * @request POST:/oauth/password/confirm
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordConfirm {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordResendConfirmation
   * @summary Resend email/password sign-up confirmation code
   * @request POST:/oauth/password/resend-confirmation
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordResendConfirmation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordCheckEmail
   * @summary Check Cognito auth methods for email (password vs Google-only)
   * @request POST:/oauth/password/check-email
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordCheckEmail {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordSignIn
   * @summary Sign in with email/password (returns tokens)
   * @request POST:/oauth/password/signin
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordSignIn {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordForgot
   * @summary Request password reset code (email)
   * @request POST:/oauth/password/forgot
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordForgot {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags OAuth
   * @name OAuthControllerPasswordReset
   * @summary Confirm password reset with code
   * @request POST:/oauth/password/reset
   * @secure
   * @response `201` `void`
   */
  export namespace OAuthControllerPasswordReset {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Chat {
  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToSavedSearchChat
   * @summary Send a message to a saved search chat
   * @request POST:/chat/message/saved-search
   * @secure
   * @response `200` `void` Message sent to saved search chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToSavedSearchChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SavedSearchChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralSavedSearchesChat
   * @summary Send a message to a general saved searches chat
   * @request POST:/chat/message/general-saved-searches
   * @secure
   * @response `200` `void` Message sent to general saved searches chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralSavedSearchesChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralSavedSearchesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralSavedSearchesChatList
   * @summary List saved searches chat
   * @request POST:/chat/list-saved-searches
   * @secure
   * @response `200` `void` Message processed for list saved searches chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralSavedSearchesChatList {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralSavedSearchesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralNegotiationsChat
   * @summary Send a message to a general negotiations chat
   * @request POST:/chat/message/general-negotiations
   * @secure
   * @response `200` `void` Message sent to general negotiations chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralNegotiationsChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralNegotiationsChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralNegotiationsChatList
   * @summary List negotiations chat
   * @request POST:/chat/list-negotiations
   * @secure
   * @response `200` `void` Message processed for list negotiations chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralNegotiationsChatList {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralNegotiationsChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralOffersChat
   * @summary List offers chat
   * @request POST:/chat/list-offers
   * @secure
   * @response `200` `void` Message processed for list offers chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralOffersChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralOffersChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralOffersChatLegacy
   * @summary [Deprecated] List offers chat (legacy route)
   * @request POST:/chat/message/general-offers
   * @secure
   * @response `200` `void` Message processed for list offers chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralOffersChatLegacy {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralOffersChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralStrategiesChat
   * @summary List strategies chat
   * @request POST:/chat/list-strategies
   * @secure
   * @response `200` `void` Message processed for list strategies chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralStrategiesChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralStrategiesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToGeneralStrategiesChatLegacy
   * @summary List strategies chat (Marketplace BFF route)
   * @request POST:/chat/message/general-strategies
   * @secure
   * @response `200` `void` Message processed for list strategies chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToGeneralStrategiesChatLegacy {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GeneralStrategiesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToGeneralStrategiesChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/general-strategies
   * @secure
   * @response `200` `void` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToGeneralStrategiesChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentGeneralStrategiesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToSavedSearchChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/saved-search
   * @secure
   * @response `200` `void` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToSavedSearchChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentChatMessageToSavedSearchChatDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToGeneralSavedSearchesChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/general-saved-searches
   * @secure
   * @response `200` `void` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToGeneralSavedSearchesChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentGeneralSavedSearchesChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToNegotiationChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/negotiation
   * @secure
   * @response `200` `ChatResponseDto` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `404` `void` Chat response not found
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToNegotiationChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentChatMessageToNegotiationChatDto;
    export type RequestHeaders = {};
    export type ResponseBody = ChatResponseDto;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToGeneralNegotiationsChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/general-negotiations
   * @secure
   * @response `200` `void` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToGeneralNegotiationsChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentGeneralNegotiationsChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentMessageToGeneralOffersChat
   * @summary Send a message to an agent chat
   * @request POST:/chat/message/agent/general-offers
   * @secure
   * @response `200` `void` Message sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentMessageToGeneralOffersChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentGeneralOffersChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendAgentRequestToNegotiationChat
   * @summary Send a request to an agent chat
   * @request POST:/chat/message/agent/negotiation/request
   * @secure
   * @response `200` `ChatRequestDto` Request sent to agent chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendAgentRequestToNegotiationChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AgentRequestToNegotiationChatDto;
    export type RequestHeaders = {};
    export type ResponseBody = ChatRequestDto;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerApplyNegotiationUpdates
   * @summary Apply negotiation/offer patches mid-turn (ChatRuntime update executor / update_offer tool)
   * @request POST:/chat/negotiation/apply-updates
   * @secure
   * @response `200` `void` Patches applied
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerApplyNegotiationUpdates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ApplyNegotiationUpdatesDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerCreateChat
   * @summary Create a chat
   * @request POST:/chat/create-chat
   * @secure
   * @response `200` `void` Chat created successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerCreateChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateChatRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetChatBySavedSearchId
 * @summary Get a chat by saved search ID
 * @request GET:/chat/saved-search/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetChatBySavedSearchId {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      page: string;
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatHistoryResponseDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetChatByNegotiationId
 * @summary Get a chat by negotiation ID
 * @request GET:/chat/negotiation/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetChatByNegotiationId {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      page: string;
      limit: string;
      kind: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatHistoryResponseDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetChatByOfferId
 * @summary Get a chat by offer ID
 * @request GET:/chat/offer/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetChatByOfferId {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      page: string;
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatHistoryResponseDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetChatByStrategyId
 * @summary Get or create a strategy chat by strategy id
 * @request GET:/chat/strategy/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetChatByStrategyId {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      page: string;
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatHistoryResponseDto;
    };
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToNegotiationChat
   * @summary Send a message to a negotiation chat
   * @request POST:/chat/message/negotiation
   * @secure
   * @response `200` `void` Message sent to negotiation chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToNegotiationChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = NegotiationChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToOfferChat
   * @summary Send a message to an offer chat
   * @request POST:/chat/message/offer
   * @secure
   * @response `200` `void` Message sent to offer chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToOfferChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = OfferChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerSendMessageToStrategyChat
   * @summary Send a message to a strategy editor chat
   * @request POST:/chat/message/strategy
   * @secure
   * @response `200` `void` Message sent to strategy chat successfully
   * @response `400` `void` Bad request
   * @response `401` `void` Invalid token (when Bearer is provided)
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerSendMessageToStrategyChat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = StrategyChatMessageDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetGeneralChat
 * @summary Get a General Chat by scope
 * @request GET:/chat/general-chat/{scope}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `ApiResponseDto` Unauthorized
 * @response `404` `ApiResponseDto` Chat not found
 * @response `500` `ApiResponseDto` Internal server error
*/
  export namespace ChatControllerGetGeneralChat {
    export type RequestParams = {
      scope: string;
    };
    export type RequestQuery = {
      page: string;
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatHistoryResponseDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetInboxSummary
 * @summary Inbox summary (unread + latest activity) for current user
 * @request GET:/chat/inbox/summary
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: InboxSummaryDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetInboxSummary {
    export type RequestParams = {};
    export type RequestQuery = {
      since: string;
      dealerId: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: InboxSummaryDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetUserMessagesInbox
 * @summary Paginated per-user Agent→User messages inbox (proxied from tenant-chat)
 * @request GET:/chat/messages
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: UserMessageInboxPageDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetUserMessagesInbox {
    export type RequestParams = {};
    export type RequestQuery = {
      page: string;
      pageSize: string;
      readStatus: string;
      dealerId: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: UserMessageInboxPageDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerMarkUserMessagesRead
 * @summary Bulk mark inbox messages as read (proxied to tenant-chat Optimization inbox)
 * @request POST:/chat/messages/mark-read
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: MarkUserMessagesReadResultDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerMarkUserMessagesRead {
    export type RequestParams = {};
    export type RequestQuery = {
      dealerId: string;
    };
    export type RequestBody = MarkUserMessagesReadDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: MarkUserMessagesReadResultDto;
    };
  }

  /**
 * No description
 * @tags chat
 * @name ChatControllerGetChatUpdates
 * @summary Incremental chat updates (responses since cursor)
 * @request GET:/chat/{id}/updates
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatUpdatesDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
*/
  export namespace ChatControllerGetChatUpdates {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      after: string;
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: ChatUpdatesDto;
    };
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerMarkChatMessagesRead
   * @summary Mark specific chat response messages as read for current user
   * @request POST:/chat/{id}/messages/read
   * @secure
   * @response `200` `void` Success
   * @response `201` `void`
   * @response `400` `void` Bad request
   * @response `401` `void` Unauthorized
   * @response `500` `void` Internal server error
   */
  export namespace ChatControllerMarkChatMessagesRead {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      dealerId: string;
    };
    export type RequestBody = MarkChatMessagesReadDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Internal {
  /**
   * No description
   * @tags internal-chat-user-profile
   * @name InternalChatUserProfileControllerGet
   * @summary Get sanitized user profile for tenant-chat tools
   * @request GET:/internal/chat/user-profile/{userId}
   * @secure
   * @response `200` `void`
   */
  export namespace InternalChatUserProfileControllerGet {
    export type RequestParams = {
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags internal-chat-user-profile
   * @name InternalChatUserProfileControllerPatch
   * @summary Update allowlisted user profile fields for tenant-chat tools
   * @request PATCH:/internal/chat/user-profile
   * @secure
   * @response `200` `void`
   */
  export namespace InternalChatUserProfileControllerPatch {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ChatUserProfilePatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags InternalChatSystemToolPolicy
   * @name InternalChatSystemToolPolicyControllerListEffectivePolicies
   * @request GET:/internal/chat-tools/policy
   * @secure
   * @response `200` `void`
   */
  export namespace InternalChatSystemToolPolicyControllerListEffectivePolicies {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags notifications
   * @name InternalUnreadChatsControllerSendUnreadChatsEmail
   * @request POST:/internal/notifications/unread-chats
   * @secure
   * @response `201` `void`
   */
  export namespace InternalUnreadChatsControllerSendUnreadChatsEmail {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UnreadChatsEmailDto;
    export type RequestHeaders = {
      /** Shared credential for internal notification endpoints. */
      "x-notifications-service-token": string;
    };
    export type ResponseBody = void;
  }
}

export namespace Messages {
  /**
   * No description
   * @tags Messages
   * @name MessagesControllerSendChatMessage
   * @request POST:/messages/chat/{chatId}
   * @secure
   * @response `201` `void`
   */
  export namespace MessagesControllerSendChatMessage {
    export type RequestParams = {
      chatId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Account {
  /**
   * No description
   * @tags Account
   * @name AccountStatsControllerGetStats
   * @summary Account stats for Personal (actor) or Dealer context (same negotiation scope as dealer lists).
   * @request GET:/account/stats
   * @secure
   * @response `200` `void` Account stats snapshot (may be null while cold).
   */
  export namespace AccountStatsControllerGetStats {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * When set, return dealer-scoped list counts after membership + permission checks.
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace NegotiationStrategies {
  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerFindAllTemplates
   * @summary List template negotiation strategies
   * @request GET:/negotiation-strategies/templates
   * @secure
   * @response `200` `(NegotiationStrategyEntity)[]` List of template negotiation strategies
   */
  export namespace UserNegotiationStrategiesControllerFindAllTemplates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity[];
  }

  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerFindAll
   * @summary List negotiation strategies for current user
   * @request GET:/negotiation-strategies
   * @secure
   * @response `200` `(NegotiationStrategyEntity)[]` List of negotiation strategies for the authenticated user
   */
  export namespace UserNegotiationStrategiesControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * When set, list dealer-owner strategies for this dealer after membership + permission checks.
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity[];
  }

  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerCreate
   * @summary Create negotiation strategy for current user
   * @request POST:/negotiation-strategies
   * @secure
   * @response `201` `NegotiationStrategyEntity` Created negotiation strategy for the authenticated user
   */
  export namespace UserNegotiationStrategiesControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateNegotiationStrategyRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerFindOne
   * @summary Get negotiation strategy for current user by id
   * @request GET:/negotiation-strategies/{id}
   * @secure
   * @response `200` `NegotiationStrategyEntity` Negotiation strategy for the authenticated user
   */
  export namespace UserNegotiationStrategiesControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerUpdate
   * @summary Update negotiation strategy for current user
   * @request PATCH:/negotiation-strategies/{id}
   * @secure
   * @response `200` `NegotiationStrategyEntity` Updated negotiation strategy for the authenticated user
   */
  export namespace UserNegotiationStrategiesControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateNegotiationStrategyRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }

  /**
   * No description
   * @tags Negotiation Strategies
   * @name UserNegotiationStrategiesControllerRemove
   * @summary Delete negotiation strategy for current user
   * @request DELETE:/negotiation-strategies/{id}
   * @secure
   * @response `200` `NegotiationStrategyEntity` Deleted negotiation strategy for the authenticated user
   */
  export namespace UserNegotiationStrategiesControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = NegotiationStrategyEntity;
  }
}

export namespace Leads {
  /**
   * No description
   * @tags Leads
   * @name LeadControllerInstructions
   * @summary Lead setup instructions for dashboard
   * @request GET:/leads/instructions
   * @secure
   * @response `200` `LeadInstructionsDto`
   */
  export namespace LeadControllerInstructions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LeadInstructionsDto;
  }

  /**
 * No description
 * @tags Leads
 * @name LeadControllerList
 * @summary List leads (paged)
 * @request GET:/leads
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (LeadEntity)[],

})` Leads retrieved successfully.
*/
  export namespace LeadControllerList {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @default 20
       */
      limit?: number;
      /** Optional filter: only leads resolved to this FeedSource */
      feedSourceId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto & {
      data?: LeadEntity[];
    };
  }

  /**
   * No description
   * @tags Leads
   * @name LeadControllerCreate
   * @summary Create a lead and dispatch sending
   * @request POST:/leads
   * @secure
   * @response `200` `void` Lead accepted for processing.
   */
  export namespace LeadControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LeadRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Offers {
  /**
   * No description
   * @tags Offer terms
   * @name OfferTermsControllerGetTerms
   * @summary Get standard offer terms (active, dealer-aware)
   * @request GET:/offers/terms/{side}
   * @secure
   * @response `200` `OfferStandardTermsEntity`
   */
  export namespace OfferTermsControllerGetTerms {
    export type RequestParams = {
      side: OfferTermsSide;
    };
    export type RequestQuery = {
      isDealer?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OfferStandardTermsEntity;
  }

  /**
   * No description
   * @tags Offer certificate
   * @name OffersCertificateControllerIssue
   * @summary Issue an offer certificate share token (ensures S3 snapshot exists)
   * @request POST:/offers/certificate
   * @secure
   * @response `201` `IssueOfferCertificateResponseDto`
   */
  export namespace OffersCertificateControllerIssue {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = IssueOfferCertificateDto;
    export type RequestHeaders = {};
    export type ResponseBody = IssueOfferCertificateResponseDto;
  }
}

export namespace Permissions {
  /**
   * No description
   * @tags Permissions
   * @name PermissionsControllerGetMyPermissions
   * @request GET:/permissions/me
   * @secure
   * @response `200` `PermissionsMeResponseDto` CASL snapshot plus per-dealer membership permission slugs for the authenticated user.
   */
  export namespace PermissionsControllerGetMyPermissions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PermissionsMeResponseDto;
  }
}

export namespace SavedSearch {
  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerCreate
   * @summary Create a new saved search
   * @request POST:/saved-search
   * @secure
   * @response `201` `SavedSearchEntity` The saved search has been successfully created.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SavedSearchControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateSavedSearchDto;
    export type RequestHeaders = {};
    export type ResponseBody = SavedSearchEntity;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerFindAllLegacyGet
   * @summary Get all saved searches (deprecated; use POST /saved-search/findall)
   * @request GET:/saved-search
   * @secure
   * @response `200` `ApiResponseDto` The saved searches have been successfully fetched.
   */
  export namespace SavedSearchControllerFindAllLegacyGet {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Page number (1-based)
       * @default 1
       */
      page?: number;
      /**
       * Limit per page
       * @default 20
       */
      limit?: number;
      /**
       * When true (default), return only saved searches. When false, return only transient (saved=false).
       * @default true
       */
      saved?: boolean;
      filters?: SearchFiltersDto;
      /**
       * When set, list dealer-owner saved searches for this dealer after membership + permission checks.
       * @format uuid
       */
      dealerId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerFindAll
   * @summary Get all saved searches
   * @request POST:/saved-search/findall
   * @secure
   * @response `200` `ApiResponseDto` The saved searches have been successfully fetched.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SavedSearchControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FindAllSavedSearchQueryDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerFindOne
   * @request GET:/saved-search/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace SavedSearchControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerUpdate
   * @summary Update a saved search
   * @request PATCH:/saved-search/{id}
   * @secure
   * @response `200` `SavedSearchEntity` The saved search has been successfully updated.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SavedSearchControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSavedSearchDto;
    export type RequestHeaders = {};
    export type ResponseBody = SavedSearchEntity;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerRemove
   * @request DELETE:/saved-search/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace SavedSearchControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Saved Searches
   * @name SavedSearchControllerUpdateStatus
   * @summary Update the status of a saved search
   * @request PATCH:/saved-search/{id}/status
   * @secure
   * @response `200` `SavedSearchEntity` The saved search status has been successfully updated.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SavedSearchControllerUpdateStatus {
    export type RequestParams = {
      /** Saved search ID */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSavedSearchStatusDto;
    export type RequestHeaders = {};
    export type ResponseBody = SavedSearchEntity;
  }
}

export namespace DealerMemberships {
  /**
   * No description
   * @tags Dealer memberships
   * @name DealerMembershipsControllerGetMyMemberships
   * @request GET:/dealer-memberships/me
   * @secure
   * @response `200` `DealerMembershipsMeResponseDto` Dealer memberships (dealer context) for the authenticated user.
   */
  export namespace DealerMembershipsControllerGetMyMemberships {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerMembershipsMeResponseDto;
  }

  /**
   * No description
   * @tags Dealer memberships
   * @name DealerMembershipsControllerListDealerMembers
   * @request GET:/dealer-memberships/dealers/{dealerId}/members
   * @secure
   * @response `200` `void` List active members/invites for a dealer (caller must be a member).
   */
  export namespace DealerMembershipsControllerListDealerMembers {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer memberships
   * @name DealerMembershipsControllerInviteStaff
   * @request POST:/dealer-memberships/dealers/{dealerId}/invites
   * @secure
   * @response `200` `void` Invite staff (admin/manager/viewer). Requires users.manage. Rejects OWNER.
   */
  export namespace DealerMembershipsControllerInviteStaff {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = DealerStaffInviteDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace DealerProfile {
  /**
   * No description
   * @tags Dealer profile
   * @name DealerProfileControllerGetProfile
   * @request GET:/dealer-profile/{dealerId}
   * @secure
   * @response `200` `DealerProfileResponseDto` Dealer profile for marketplace (requires inventory.read).
   */
  export namespace DealerProfileControllerGetProfile {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerProfileResponseDto;
  }

  /**
   * No description
   * @tags Dealer profile
   * @name DealerProfileControllerUpdateProfile
   * @request PATCH:/dealer-profile/{dealerId}
   * @secure
   * @response `200` `DealerProfileResponseDto` Update dealer profile (requires dealer.profile.manage).
   */
  export namespace DealerProfileControllerUpdateProfile {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateDealerProfileDto;
    export type RequestHeaders = {};
    export type ResponseBody = DealerProfileResponseDto;
  }
}

export namespace DealerInventory {
  /**
   * No description
   * @tags Dealer inventory
   * @name DealerInventoryControllerListDealerInventory
   * @request GET:/dealer-inventory/{dealerId}
   * @secure
   * @response `200` `DealerInventoryResponseDto` Dealer-scoped inventory (requires active membership).
   */
  export namespace DealerInventoryControllerListDealerInventory {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {
      /**
       * 1-based page index
       * @default 1
       */
      page?: number;
      /**
       * Page size
       * @max 200
       * @default 24
       */
      limit?: number;
      /** Free-text search (vin, stock number, make/model/trim, city/state) */
      q?: string;
      /**
       * Sort field
       * @default "updatedAt"
       */
      sortField?: DealerInventoryControllerListDealerInventoryParamsSortFieldEnum;
      /** Multi-sort spec in priority order. Repeatable query param. Format: `<field>:<asc|desc>` (e.g. `sort=price:asc&sort=mileage:desc`). */
      sort?: string[];
      /**
       * Sort order
       * @default "desc"
       */
      sortOrder?: DealerInventoryControllerListDealerInventoryParamsSortOrderEnum;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerInventoryResponseDto;
  }

  /**
   * No description
   * @tags Dealer inventory
   * @name DealerInventoryControllerUpdateVehicleVisibility
   * @request PATCH:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/visibility
   * @secure
   * @response `200` `void` Toggle a dealer vehicle visibility (ACTIVE <-> HIDDEN).
   */
  export namespace DealerInventoryControllerUpdateVehicleVisibility {
    export type RequestParams = {
      dealerId: string;
      vehicleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = DealerInventoryVisibilityDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer inventory
   * @name DealerInventoryControllerPreviewOutOfMarket
   * @request GET:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/out-of-market
   * @secure
   * @response `200` `void` Preview open deals before removing a listing from the market.
   */
  export namespace DealerInventoryControllerPreviewOutOfMarket {
    export type RequestParams = {
      dealerId: string;
      vehicleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer inventory
   * @name DealerInventoryControllerApplyOutOfMarket
   * @request POST:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/out-of-market
   * @secure
   * @response `200` `void` Remove a listing from the market and close its open deals.
   */
  export namespace DealerInventoryControllerApplyOutOfMarket {
    export type RequestParams = {
      dealerId: string;
      vehicleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer inventory
   * @name DealerInventoryControllerAssignFinance
   * @request POST:/dealer-inventory/{dealerId}/finance-assignment
   * @secure
   * @response `201` `void`
   */
  export namespace DealerInventoryControllerAssignFinance {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace DealerInventoryOptimized {
  /**
   * No description
   * @tags Dealer inventory (optimized)
   * @name DealerInventoryOptimizedControllerSuggestions
   * @summary Dealer-scoped inventory suggestions (tenant-search proxy; requires inventory.read)
   * @request GET:/dealer-inventory_optimized/{dealerId}/suggestions
   * @secure
   * @response `200` `void` SearchSuggestion[] scoped to the dealer posting list.
   */
  export namespace DealerInventoryOptimizedControllerSuggestions {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {
      /** Suggestion query prefix (make/model/trim/VIN/stock) */
      q?: string;
      /**
       * Max suggestions to return (tenant-search clamps to 50)
       * @max 50
       * @default 10
       */
      max?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer inventory (optimized)
   * @name DealerInventoryOptimizedControllerList
   * @summary Dealer-scoped inventory list via tenant-search (requires inventory.read; no counts)
   * @request GET:/dealer-inventory_optimized/{dealerId}
   * @secure
   * @response `200` `DealerInventoryOptimizedResponseDto` Dealer-scoped inventory page (search-backed; no offer/neg counts).
   */
  export namespace DealerInventoryOptimizedControllerList {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {
      /**
       * 1-based page index
       * @default 1
       */
      page?: number;
      /**
       * Page size (alias of pageSize). Default 48; max 200.
       * @max 200
       * @default 48
       */
      limit?: number;
      /**
       * Page size (alias of limit). Default 48; max 200.
       * @max 200
       * @default 48
       */
      pageSize?: number;
      /** Free-text search (vin, stock number, make/model/trim, city/state) */
      q?: string;
      /**
       * Sort field (legacy single-sort)
       * @default "updatedAt"
       */
      sortField?: DealerInventoryOptimizedControllerListParamsSortFieldEnum;
      /** Multi-sort spec in priority order. Repeatable query param. Format: `<field>:<asc|desc>` (e.g. `sort=price:asc&sort=mileage:desc`). */
      sort?: string[];
      /**
       * Sort order (legacy single-sort)
       * @default "desc"
       */
      sortOrder?: DealerInventoryOptimizedControllerListParamsSortOrderEnum;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DealerInventoryOptimizedResponseDto;
  }
}

export namespace Dealers {
  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerList
   * @request GET:/dealers/{dealerId}/finance-plans
   * @secure
   * @response `200` `void`
   */
  export namespace FinancePlansControllerList {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerCreate
   * @request POST:/dealers/{dealerId}/finance-plans
   * @secure
   * @response `201` `void`
   */
  export namespace FinancePlansControllerCreate {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = FinancePlanWriteDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerGetOne
   * @request GET:/dealers/{dealerId}/finance-plans/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FinancePlansControllerGetOne {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerUpdate
   * @request PATCH:/dealers/{dealerId}/finance-plans/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FinancePlansControllerUpdate {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = FinancePlanPatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerRemove
   * @request DELETE:/dealers/{dealerId}/finance-plans/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace FinancePlansControllerRemove {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerUsage
   * @request GET:/dealers/{dealerId}/finance-plans/{id}/usage
   * @secure
   * @response `200` `void`
   */
  export namespace FinancePlansControllerUsage {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer finance plans
   * @name FinancePlansControllerRetire
   * @request POST:/dealers/{dealerId}/finance-plans/{id}/retire
   * @secure
   * @response `201` `void`
   */
  export namespace FinancePlansControllerRetire {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer strategy rules
   * @name DealerStrategyRulesControllerList
   * @request GET:/dealers/{dealerId}/strategy-rules
   * @secure
   * @response `200` `void`
   */
  export namespace DealerStrategyRulesControllerList {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer strategy rules
   * @name DealerStrategyRulesControllerCreate
   * @request POST:/dealers/{dealerId}/strategy-rules
   * @secure
   * @response `201` `void`
   */
  export namespace DealerStrategyRulesControllerCreate {
    export type RequestParams = {
      dealerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = DealerStrategyRuleWriteDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer strategy rules
   * @name DealerStrategyRulesControllerGetOne
   * @request GET:/dealers/{dealerId}/strategy-rules/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace DealerStrategyRulesControllerGetOne {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer strategy rules
   * @name DealerStrategyRulesControllerUpdate
   * @request PATCH:/dealers/{dealerId}/strategy-rules/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace DealerStrategyRulesControllerUpdate {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = DealerStrategyRulePatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Dealer strategy rules
   * @name DealerStrategyRulesControllerRemove
   * @request DELETE:/dealers/{dealerId}/strategy-rules/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace DealerStrategyRulesControllerRemove {
    export type RequestParams = {
      dealerId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Search {
  /**
   * No description
   * @tags Search
   * @name SearchControllerSuggestions
   * @summary Get search suggestions
   * @request GET:/search/suggestions
   * @secure
   * @response `200` `(string)[]` Search suggestions retrieved successfully.
   */
  export namespace SearchControllerSuggestions {
    export type RequestParams = {};
    export type RequestQuery = {
      q: string;
      max: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerCreate
   * @summary Create a new search
   * @request POST:/search
   * @secure
   * @response `201` `ApiResponseDto` The search has been successfully created.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerCreate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SearchVehicleRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = ApiResponseDto;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerFindAll
   * @request GET:/search
   * @secure
   * @response `200` `void`
   */
  export namespace SearchControllerFindAll {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetVehicleFinanceDisclaimer
   * @summary Finance monthly tooltip inputs for one vehicle (tenant-search)
   * @request GET:/search/vehicles/{vehicleId}/finance-disclaimer
   * @secure
   * @response `200` `void`
   */
  export namespace SearchControllerGetVehicleFinanceDisclaimer {
    export type RequestParams = {
      vehicleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetVehicleFinanceDisclaimers
   * @summary Finance monthly tooltip inputs for many vehicles (tenant-search)
   * @request POST:/search/vehicles/finance-disclaimers
   * @secure
   * @response `201` `void`
   */
  export namespace SearchControllerGetVehicleFinanceDisclaimers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerFindOne
   * @request GET:/search/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace SearchControllerFindOne {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerUpdate
   * @request PATCH:/search/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace SearchControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSearchDto;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerRemove
   * @request DELETE:/search/{id}
   * @secure
   * @response `200` `void`
   */
  export namespace SearchControllerRemove {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetTaxonomyMakes
   * @summary Get taxonomy makes
   * @request GET:/search/taxonomy/makes
   * @secure
   * @response `200` `TaxonomyMakeResponseDto` The taxonomy makes have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetTaxonomyMakes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TaxonomyMakeResponseDto;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetTaxonomyModel
   * @summary Get taxonomy model
   * @request GET:/search/taxonomy/model/{make}
   * @secure
   * @response `200` `TaxonomyModelResponseDto` The taxonomy model have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetTaxonomyModel {
    export type RequestParams = {
      make: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TaxonomyModelResponseDto;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetTaxonomyTrims
   * @summary Get taxonomy trims
   * @request GET:/search/taxonomy/trims/{make}/{model}
   * @secure
   * @response `200` `TaxonomyTrimResponseDto` The taxonomy trims have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetTaxonomyTrims {
    export type RequestParams = {
      make: string;
      model: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TaxonomyTrimResponseDto;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetTaxonomyAttributes
   * @summary Get taxonomy attributes
   * @request GET:/search/taxonomy/attributes/{attributeClass}
   * @secure
   * @response `200` `TaxonomyAttributeResponseDto` The taxonomy attributes have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetTaxonomyAttributes {
    export type RequestParams = {
      attributeClass: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TaxonomyAttributeResponseDto;
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetGeoZipList
   * @summary Get geo zip list
   * @request GET:/search/geo/zip/list/{startWith}
   * @secure
   * @response `200` `(string)[]` The geo zip list have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetGeoZipList {
    export type RequestParams = {
      startWith: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetGeoCityStateList
   * @summary Get geo city state list
   * @request GET:/search/geo/city-state/list/{contains}
   * @secure
   * @response `200` `(string)[]` The geo city state list have been successfully retrieved.
   * @response `400` `void` Invalid request body.
   * @response `401` `void` Unauthorized.
   * @response `403` `void` Forbidden.
   * @response `404` `void` Not found.
   * @response `500` `void` Internal server error.
   */
  export namespace SearchControllerGetGeoCityStateList {
    export type RequestParams = {
      contains: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetGeoZipResolve
   * @summary Resolve a zip code to city/state candidates
   * @request GET:/search/geo/zip/resolve/{zip}
   * @secure
   * @response `200` `(string)[]` Resolved geo list retrieved successfully.
   */
  export namespace SearchControllerGetGeoZipResolve {
    export type RequestParams = {
      zip: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }

  /**
   * No description
   * @tags Search
   * @name SearchControllerGetGeoCityStateResolve
   * @summary Resolve city/state string to canonical candidates
   * @request GET:/search/geo/city-state/resolve
   * @secure
   * @response `200` `(string)[]` Resolved geo list retrieved successfully.
   */
  export namespace SearchControllerGetGeoCityStateResolve {
    export type RequestParams = {};
    export type RequestQuery = {
      cityState: string;
      max: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }
}

export namespace Pricing {
  /**
   * No description
   * @tags Pricing
   * @name PricingControllerGetVehiclePricing
   * @summary Compute pricing for a vehicle
   * @request GET:/pricing/vehicle/{vehicleId}
   * @secure
   * @response `200` `void`
   */
  export namespace PricingControllerGetVehiclePricing {
    export type RequestParams = {
      /** Vehicle UUID */
      vehicleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

export namespace Home {
  /**
   * No description
   * @tags Home
   * @name HomeControllerGetHomeStats
   * @summary Get homepage stats (cached)
   * @request GET:/home/stats
   * @secure
   * @response `200` `void` Homepage stats totals (tenant-scoped).
   */
  export namespace HomeControllerGetHomeStats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }

  /**
   * No description
   * @tags Home
   * @name HomeControllerGetHomeSearchPills
   * @summary Get home search pills (proxy to tenant-search)
   * @request GET:/home/search-pills
   * @secure
   * @response `200` `void` Top saved searches rendered as search pills.
   */
  export namespace HomeControllerGetHomeSearchPills {
    export type RequestParams = {};
    export type RequestQuery = {
      limit: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = void;
  }
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title DealConnect API
 * @version 1.0
 * @contact
 *
 * The DealConnect API description
 */
export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  app = {
    /**
     * No description
     *
     * @tags App
     * @name AppControllerGetSidebarAdminDashboard
     * @summary Get sidebar for admin dashboard
     * @request GET:/app/admin-dashboard-sidebar
     * @secure
     * @response `200` `AdminDashboardSidebarDto` Sidebar for admin dashboard
     */
    appControllerGetSidebarAdminDashboard: (params: RequestParams = {}) =>
      this.http.request<AdminDashboardSidebarDto, any>({
        path: `/app/admin-dashboard-sidebar`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ping = {
    /**
     * No description
     *
     * @tags Health
     * @name HealthControllerPing
     * @request GET:/ping
     * @secure
     * @response `200` `void`
     */
    healthControllerPing: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/ping`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  public = {
    /**
     * No description
     *
     * @tags Public URL resolve
     * @name PublicUrlResolveControllerResolveVehicle
     * @summary Resolve a public vehicle URL token to id + current slug
     * @request GET:/public/url-resolve/vehicle/{token}
     * @secure
     * @response `200` `void`
     * @response `404` `void`
     */
    publicUrlResolveControllerResolveVehicle: (
      token: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/public/url-resolve/vehicle/${token}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public URL resolve
     * @name PublicUrlResolveControllerResolveDealer
     * @summary Resolve a public dealer URL token to id + current slug
     * @request GET:/public/url-resolve/dealer/{token}
     * @secure
     * @response `200` `void`
     * @response `404` `void`
     */
    publicUrlResolveControllerResolveDealer: (
      token: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/public/url-resolve/dealer/${token}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public sitemap
     * @name SitemapPublicControllerIndex
     * @summary Last-good sitemap index (S3 read only)
     * @request GET:/public/sitemap.xml
     * @secure
     * @response `200` `void`
     */
    sitemapPublicControllerIndex: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/public/sitemap.xml`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public sitemap
     * @name SitemapPublicControllerShard
     * @summary Last-good sitemap shard (S3 read only)
     * @request GET:/public/sitemap/{file}
     * @secure
     * @response `200` `void`
     */
    sitemapPublicControllerShard: (file: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/public/sitemap/${file}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public dealers
     * @name PublicDealersControllerList
     * @summary List CLAIMED dealers (public)
     * @request GET:/public/dealers
     * @secure
     * @response `200` `PublicDealerListResponseDto`
     */
    publicDealersControllerList: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
        /** Search by business name or city/state (contains, case-insensitive) */
        query?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<PublicDealerListResponseDto, any>({
        path: `/public/dealers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public dealers
     * @name PublicDealersControllerListVehicles
     * @summary List ACTIVE vehicles for a public dealer profile
     * @request GET:/public/dealers/{id}/vehicles
     * @secure
     * @response `200` `PublicDealerVehiclesResponseDto`
     * @response `404` `void` Dealer not found
     */
    publicDealersControllerListVehicles: (
      id: string,
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 6
         */
        limit?: number;
        /** Filter by make (exact, case-insensitive) */
        make?: string;
        /** Filter by model (exact, case-insensitive) */
        model?: string;
        /** Filter by model year (exact) */
        year?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<PublicDealerVehiclesResponseDto, void>({
        path: `/public/dealers/${id}/vehicles`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public dealers
     * @name PublicDealersControllerGetVehicleFilters
     * @summary Get make/model/year filter options for dealer inventory
     * @request GET:/public/dealers/{id}/vehicle-filters
     * @secure
     * @response `200` `PublicDealerVehicleFiltersDto`
     * @response `404` `void` Dealer not found
     */
    publicDealersControllerGetVehicleFilters: (
      id: string,
      query?: {
        /** Scope models list to a make */
        make?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<PublicDealerVehicleFiltersDto, void>({
        path: `/public/dealers/${id}/vehicle-filters`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public dealers
     * @name PublicDealersControllerGetById
     * @summary Get public dealer profile by id
     * @request GET:/public/dealers/{id}
     * @secure
     * @response `200` `PublicDealerProfileDto`
     * @response `404` `void` Dealer not found
     */
    publicDealersControllerGetById: (id: string, params: RequestParams = {}) =>
      this.http.request<PublicDealerProfileDto, void>({
        path: `/public/dealers/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Public offer certificate
     * @name PublicOffersCertificateControllerGetByToken
     * @summary Resolve an offer certificate snapshot by share token (public)
     * @request GET:/public/offers/certificate/{token}
     * @secure
     * @response `200` `PublicOfferCertificateResponseDto`
     */
    publicOffersCertificateControllerGetByToken: (
      token: string,
      params: RequestParams = {},
    ) =>
      this.http.request<PublicOfferCertificateResponseDto, any>({
        path: `/public/offers/certificate/${token}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  admin = {
    /**
     * No description
     *
     * @tags Admin SEO
     * @name SeoSitemapControllerStatus
     * @summary Last-good sitemap rebuild status (no slug list)
     * @request GET:/admin/seo/sitemap-status
     * @secure
     * @response `200` `void`
     */
    seoSitemapControllerStatus: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/seo/sitemap-status`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin SEO
     * @name SeoSitemapControllerRebuildNow
     * @summary Force sitemap rewrite (skip probe equality)
     * @request POST:/admin/seo/sitemap-rebuild
     * @secure
     * @response `202` `void`
     */
    seoSitemapControllerRebuildNow: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/seo/sitemap-rebuild`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerCreate
     * @summary Create a new negotiation
     * @request POST:/admin/negotiations
     * @secure
     * @response `201` `NegotiationEntity` The negotiation has been successfully created.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    negotiationsControllerCreate: (
      data: CreateNegotiationDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationEntity, void>({
        path: `/admin/negotiations`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindAll
     * @summary List negotiations
     * @request GET:/admin/negotiations
     * @secure
     * @response `200` `NegotiationsPageResponseDto` Paginated negotiations
     */
    negotiationsControllerFindAll: (
      query?: {
        /**
         * Page number (1-based)
         * @default 1
         */
        page?: number;
        /**
         * Limit per page
         * @default 20
         */
        limit?: number;
        /**
         * When set, list dealer-owner assets for this dealer after membership + permission checks (query principal).
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationsPageResponseDto, any>({
        path: `/admin/negotiations`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindOfferVehicles
     * @summary List vehicles that have offers for the current user
     * @request GET:/admin/negotiations/offers/vehicles
     * @secure
     * @response `200` `OffersVehiclesResponseDto` Vehicles with offers
     */
    negotiationsControllerFindOfferVehicles: (
      query?: {
        /**
         * Page number (1-based)
         * @default 1
         */
        page?: number;
        /**
         * Limit per page
         * @default 20
         */
        limit?: number;
        /** Vehicle make filter (exact match) */
        make?: string;
        /**
         * Offer status filter for vehicles-with-offers list
         * @default "all"
         */
        offerStatus?: NegotiationsControllerFindOfferVehiclesParamsOfferStatusEnum;
        /**
         * When set, list dealer-owner offer vehicles for this dealer after membership + permission checks.
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<OffersVehiclesResponseDto, any>({
        path: `/admin/negotiations/offers/vehicles`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindOffersByVehicle
     * @summary List negotiations-with-offers for a vehicle (paginated)
     * @request GET:/admin/negotiations/offers/vehicle/{vehicleId}
     * @secure
     * @response `200` `NegotiationsPageResponseDto` Paginated negotiations filtered by vehicleId and offers presence
     */
    negotiationsControllerFindOffersByVehicle: (
      vehicleId: string,
      query?: {
        /**
         * Page number (1-based)
         * @default 1
         */
        page?: number;
        /**
         * Limit per page
         * @default 20
         */
        limit?: number;
        /**
         * When set, list dealer-owner assets for this dealer after membership + permission checks (query principal).
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationsPageResponseDto, any>({
        path: `/admin/negotiations/offers/vehicle/${vehicleId}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindFullNegotiation
     * @summary Get full negotiation by id (with vehicle, savedSearch, offers)
     * @request GET:/admin/negotiations/{id}/full
     * @secure
     * @response `200` `FullNegotiationResponseDto` Full negotiation (negotiation + vehicle + savedSearch + offers)
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    negotiationsControllerFindFullNegotiation: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<FullNegotiationResponseDto, void>({
        path: `/admin/negotiations/${id}/full`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindOne
     * @summary Get negotiation by id
     * @request GET:/admin/negotiations/{id}
     * @secure
     * @response `200` `NegotiationEntity` Negotiation
     */
    negotiationsControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<NegotiationEntity, any>({
        path: `/admin/negotiations/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerUpdate
     * @summary Update negotiation
     * @request PATCH:/admin/negotiations/{id}
     * @secure
     * @response `200` `NegotiationEntity` Updated negotiation
     */
    negotiationsControllerUpdate: (
      id: string,
      data: UpdateNegotiationDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationEntity, any>({
        path: `/admin/negotiations/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerRemove
     * @summary Delete negotiation
     * @request DELETE:/admin/negotiations/{id}
     * @secure
     * @response `200` `void` Deleted negotiation
     */
    negotiationsControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/negotiations/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerRequestStrategyChange
     * @summary Request negotiation strategy change (may require expiry decision)
     * @request POST:/admin/negotiations/{id}/strategy-change
     * @secure
     * @response `201` `void`
     */
    negotiationsControllerRequestStrategyChange: (
      id: string,
      data: RequestNegotiationStrategyChangeDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/negotiations/${id}/strategy-change`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerConfirmStrategyChange
     * @summary Confirm negotiation strategy change expiry decision
     * @request POST:/admin/negotiations/{id}/strategy-change/confirm
     * @secure
     * @response `201` `void`
     */
    negotiationsControllerConfirmStrategyChange: (
      id: string,
      data: ConfirmNegotiationStrategyChangeDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/negotiations/${id}/strategy-change/confirm`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Negotiations
 * @name NegotiationsControllerFindExistingNegotiationsForMe
 * @summary Get existing negotiations for the current buyer and vehicle ids
 * @request POST:/admin/negotiations/existing-negotiations/for-me
 * @secure
 * @response `200` `({
    id?: string,
    vehicleId?: string,

})[]` Existing negotiations for the current user
 */
    negotiationsControllerFindExistingNegotiationsForMe: (
      data: ExistingNegotiationsForVehiclesDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          id?: string;
          vehicleId?: string;
        }[],
        any
      >({
        path: `/admin/negotiations/existing-negotiations/for-me`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiations
     * @name NegotiationsControllerFindExistingNegotiation
     * @summary Get latest negotiation for a saved search
     * @request GET:/admin/negotiations/existing-negotiation/{savedSearchId}
     * @secure
     * @response `200` `NegotiationEntity` Existing negotiation
     */
    negotiationsControllerFindExistingNegotiation: (
      savedSearchId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationEntity, any>({
        path: `/admin/negotiations/existing-negotiation/${savedSearchId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Negotiations
 * @name NegotiationsControllerFindExistingNegotiationsForVehicles
 * @summary Get existing negotiations for saved search and vehicle ids
 * @request POST:/admin/negotiations/existing-negotiations/lookup
 * @secure
 * @response `200` `({
    id?: string,
    vehicleId?: string,

})[]` Existing negotiations lookup result
 */
    negotiationsControllerFindExistingNegotiationsForVehicles: (
      data: ExistingNegotiationsLookupDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          id?: string;
          vehicleId?: string;
        }[],
        any
      >({
        path: `/admin/negotiations/existing-negotiations/lookup`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiation Strategies
     * @name NegotiationStrategiesControllerFindAll
     * @summary List global negotiation strategy templates
     * @request GET:/admin/negotiation-strategies
     * @secure
     * @response `200` `(NegotiationStrategyEntity)[]` List of global strategy templates (userId=null)
     */
    negotiationStrategiesControllerFindAll: (params: RequestParams = {}) =>
      this.http.request<NegotiationStrategyEntity[], any>({
        path: `/admin/negotiation-strategies`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiation Strategies
     * @name NegotiationStrategiesControllerCreate
     * @summary Create global negotiation strategy template
     * @request POST:/admin/negotiation-strategies
     * @secure
     * @response `201` `NegotiationStrategyEntity` Created global strategy template (userId=null)
     */
    negotiationStrategiesControllerCreate: (
      data: CreateNegotiationStrategyRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/admin/negotiation-strategies`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiation Strategies
     * @name NegotiationStrategiesControllerFindOne
     * @summary Get global strategy template by id
     * @request GET:/admin/negotiation-strategies/{id}
     * @secure
     * @response `200` `NegotiationStrategyEntity` Global strategy template (userId=null)
     */
    negotiationStrategiesControllerFindOne: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/admin/negotiation-strategies/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Negotiation Strategies
     * @name NegotiationStrategiesControllerUpdate
     * @summary Update global negotiation strategy template
     * @request PATCH:/admin/negotiation-strategies/{id}
     * @secure
     * @response `200` `NegotiationStrategyEntity` Updated global strategy template (userId=null)
     */
    negotiationStrategiesControllerUpdate: (
      id: string,
      data: UpdateNegotiationStrategyRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/admin/negotiation-strategies/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Lead Source
     * @name LeadSetupAdminControllerUpsert
     * @summary Create or update LeadSetup for a FeedSource (feed default or per-dealer)
     * @request POST:/admin/lead-source
     * @secure
     * @response `201` `void`
     */
    leadSetupAdminControllerUpsert: (
      data: CreateLeadSetupDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/lead-source`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Lead Source
 * @name LeadSetupAdminControllerList
 * @summary List LeadSetups (paged)
 * @request GET:/admin/lead-source
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (LeadSetupEntity)[],

})` LeadSetups retrieved successfully.
 */
    leadSetupAdminControllerList: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: LeadSetupEntity[];
        },
        any
      >({
        path: `/admin/lead-source`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Lead Source
     * @name LeadSetupAdminControllerListDealers
     * @summary List dealers linked to a FeedSource (for per-dealer LeadSetup)
     * @request GET:/admin/lead-source/dealers
     * @secure
     * @response `200` `(LeadSetupDealerOptionDto)[]`
     */
    leadSetupAdminControllerListDealers: (
      query: {
        /** FeedSource id to list dealers for */
        feedSourceId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<LeadSetupDealerOptionDto[], any>({
        path: `/admin/lead-source/dealers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Lead Source
     * @name LeadSetupAdminControllerLookup
     * @summary Lookup per-dealer LeadSetup for a FeedSource + dealer pair
     * @request GET:/admin/lead-source/lookup
     * @secure
     * @response `200` `(LeadSetupEntity | null)`
     */
    leadSetupAdminControllerLookup: (
      query: {
        /** FeedSource id */
        feedSourceId: string;
        /** Dealer id for per-dealer LeadSetup lookup */
        dealerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<LeadSetupEntity | null, any>({
        path: `/admin/lead-source/lookup`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Lead Source
     * @name LeadSetupAdminControllerPreviewEleadsTargets
     * @summary Preview default ELEADS destination emails for a FeedSource (when credentials.toEmail is empty)
     * @request GET:/admin/lead-source/eleads-target-preview
     * @secure
     * @response `200` `void`
     */
    leadSetupAdminControllerPreviewEleadsTargets: (
      query: {
        /** FeedSource id to preview ELEADS targets for */
        feedSourceId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/lead-source/eleads-target-preview`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offer terms
     * @name AdminOfferTermsControllerCreateVersion
     * @summary Create a standard terms version (optionally activate)
     * @request POST:/admin/offers/terms/version
     * @secure
     * @response `201` `OfferStandardTermsEntity`
     */
    adminOfferTermsControllerCreateVersion: (
      data: UpsertOfferStandardTermsDto,
      params: RequestParams = {},
    ) =>
      this.http.request<OfferStandardTermsEntity, any>({
        path: `/admin/offers/terms/version`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offer terms
     * @name AdminOfferTermsControllerActivateVersion
     * @summary Activate an existing version for (side,isDealer)
     * @request POST:/admin/offers/terms/activate
     * @secure
     * @response `200` `OfferStandardTermsEntity`
     */
    adminOfferTermsControllerActivateVersion: (
      data: {
        side: AdminOfferTermsControllerActivateVersionSideEnum;
        isDealer: boolean;
        /** @example "2026-06-21" */
        versionDate: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<OfferStandardTermsEntity, any>({
        path: `/admin/offers/terms/activate`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminControllerUpdateUserByAdmin
     * @summary Admin: Update arbitrary user fields
     * @request PUT:/admin/user
     * @secure
     * @response `200` `void` User updated successfully.
     */
    adminControllerUpdateUserByAdmin: (
      data: UpdateUserDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/user`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name AdminControllerDeleteUserByAdmin
     * @summary Admin: Delete user
     * @request DELETE:/admin/user/{id}
     * @secure
     * @response `200` `void` User deleted successfully.
     */
    adminControllerDeleteUserByAdmin: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/user/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offers
     * @name AdminOffersControllerSetupOffers
     * @summary Setup offers
     * @request GET:/admin/offers/setup
     * @secure
     * @response `200` `void` Offers setup successfully.
     */
    adminOffersControllerSetupOffers: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/offers/setup`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offers
     * @name AdminOffersControllerCreateOffer
     * @summary Create offer
     * @request POST:/admin/offers/create
     * @secure
     * @response `201` `void` Offer created successfully.
     */
    adminOffersControllerCreateOffer: (
      data: CreateOfferDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/offers/create`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offers
     * @name AdminOffersControllerGetOffersByNegotiationId
     * @summary Get offers by negotiationId
     * @request GET:/admin/offers/{negotiationId}
     * @secure
     * @response `200` `(OfferEntity)[]` Offers fetched successfully.
     */
    adminOffersControllerGetOffersByNegotiationId: (
      negotiationId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<OfferEntity[], any>({
        path: `/admin/offers/${negotiationId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offers
     * @name AdminOffersControllerUpdateOffer
     * @summary Update offer
     * @request PUT:/admin/offers/{id}
     * @secure
     * @response `200` `void` Offer updated successfully.
     */
    adminOffersControllerUpdateOffer: (
      id: string,
      data: UpdateOfferDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/offers/${id}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offer Addons
     * @name AdminOfferAddonsControllerList
     * @summary List offer addon templates
     * @request GET:/admin/offer-addons
     * @secure
     * @response `200` `(OfferAddonTemplateEntity)[]` Offer addon templates fetched successfully.
     */
    adminOfferAddonsControllerList: (params: RequestParams = {}) =>
      this.http.request<OfferAddonTemplateEntity[], any>({
        path: `/admin/offer-addons`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offer Addons
     * @name AdminOfferAddonsControllerCreate
     * @summary Create offer addon template
     * @request POST:/admin/offer-addons
     * @secure
     * @response `201` `OfferAddonTemplateEntity` Offer addon template created successfully.
     */
    adminOfferAddonsControllerCreate: (
      data: CreateOfferAddonDto,
      params: RequestParams = {},
    ) =>
      this.http.request<OfferAddonTemplateEntity, any>({
        path: `/admin/offer-addons`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Offer Addons
     * @name AdminOfferAddonsControllerDelete
     * @summary Delete offer addon template
     * @request DELETE:/admin/offer-addons/{id}
     * @secure
     * @response `200` `OfferAddonTemplateEntity` Offer addon template deleted successfully.
     */
    adminOfferAddonsControllerDelete: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<OfferAddonTemplateEntity, any>({
        path: `/admin/offer-addons/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Vehicles
     * @name VehiclesControllerCreate
     * @request POST:/admin/vehicles
     * @secure
     * @response `201` `void`
     */
    vehiclesControllerCreate: (
      data: CreateVehicleDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/vehicles`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Vehicles
 * @name VehiclesControllerFindAll
 * @summary Get all vehicles
 * @request POST:/admin/vehicles/list
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (VehicleEntity)[],

})` The vehicles have been successfully retrieved.
 */
    vehiclesControllerFindAll: (
      data: FindAllVehiclesQueryDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: VehicleEntity[];
        },
        any
      >({
        path: `/admin/vehicles/list`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Vehicles
 * @name VehiclesControllerFindOne
 * @summary Get a vehicle by ID
 * @request GET:/admin/vehicles/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: VehicleEntity,

})` The vehicle has been successfully retrieved.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
 */
    vehiclesControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<
        ApiResponseDto & {
          data?: VehicleEntity;
        },
        void
      >({
        path: `/admin/vehicles/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Vehicles
 * @name VehiclesControllerUpdate
 * @summary Update a vehicle
 * @request PATCH:/admin/vehicles/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: VehicleEntity,

})` The vehicle has been successfully updated.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
 */
    vehiclesControllerUpdate: (
      id: string,
      data: UpdateVehicleDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: VehicleEntity;
        },
        void
      >({
        path: `/admin/vehicles/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Vehicles
 * @name VehiclesControllerSearch
 * @summary Search for vehicles
 * @request POST:/admin/vehicles/search
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (VehicleEntity)[],

})` The vehicles have been successfully searched.
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Vehicle not found
 * @response `500` `void` Internal server error
 */
    vehiclesControllerSearch: (
      data: SearchVehicleQueryDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: VehicleEntity[];
        },
        void
      >({
        path: `/admin/vehicles/search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Automotive Groups
     * @name AutomotiveGroupsAdminControllerCreate
     * @summary Create Automotive Group
     * @request POST:/admin/automotive-groups
     * @secure
     * @response `200` `AutomotiveGroupEntity`
     */
    automotiveGroupsAdminControllerCreate: (
      data: CreateAutomotiveGroupDto,
      params: RequestParams = {},
    ) =>
      this.http.request<AutomotiveGroupEntity, any>({
        path: `/admin/automotive-groups`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Automotive Groups
 * @name AutomotiveGroupsAdminControllerFindPage
 * @summary List Automotive Groups (paged)
 * @request GET:/admin/automotive-groups
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (AutomotiveGroupEntity)[],

})`
 */
    automotiveGroupsAdminControllerFindPage: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
        /** Search by name (contains, case-insensitive) */
        query?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: AutomotiveGroupEntity[];
        },
        any
      >({
        path: `/admin/automotive-groups`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Automotive Groups
     * @name AutomotiveGroupsAdminControllerFindOne
     * @summary Get Automotive Group by id
     * @request GET:/admin/automotive-groups/{id}
     * @secure
     * @response `200` `AutomotiveGroupEntity`
     */
    automotiveGroupsAdminControllerFindOne: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<AutomotiveGroupEntity, any>({
        path: `/admin/automotive-groups/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Automotive Groups
     * @name AutomotiveGroupsAdminControllerUpdate
     * @summary Update Automotive Group
     * @request PATCH:/admin/automotive-groups/{id}
     * @secure
     * @response `200` `AutomotiveGroupEntity`
     */
    automotiveGroupsAdminControllerUpdate: (
      id: string,
      data: UpdateAutomotiveGroupDto,
      params: RequestParams = {},
    ) =>
      this.http.request<AutomotiveGroupEntity, any>({
        path: `/admin/automotive-groups/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Automotive Groups
     * @name AutomotiveGroupsAdminControllerRemove
     * @summary Delete Automotive Group (if no Dealers reference it)
     * @request DELETE:/admin/automotive-groups/{id}
     * @secure
     * @response `200` `AutomotiveGroupEntity`
     */
    automotiveGroupsAdminControllerRemove: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<AutomotiveGroupEntity, any>({
        path: `/admin/automotive-groups/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerCreate
     * @summary Create Dealer
     * @request POST:/admin/dealers
     * @secure
     * @response `200` `DealerEntity`
     */
    dealersAdminControllerCreate: (
      data: CreateDealerDto,
      params: RequestParams = {},
    ) =>
      this.http.request<DealerEntity, any>({
        path: `/admin/dealers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Dealers
 * @name DealersAdminControllerFindPage
 * @summary List Dealers (paged)
 * @request GET:/admin/dealers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (DealerEntity)[],

})`
 */
    dealersAdminControllerFindPage: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
        /** Search by businessName (contains, case-insensitive) */
        query?: string;
        /** Include UNCLAIMED dealers (picker); default grid is CLAIMED only */
        includeUnclaimed?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: DealerEntity[];
        },
        any
      >({
        path: `/admin/dealers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Dealers
 * @name DealersAdminControllerFindAllUnclaimed
 * @summary List all UNCLAIMED dealers (feed claim picker)
 * @request GET:/admin/dealers/unclaimed
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (DealerEntity)[],

})`
 */
    dealersAdminControllerFindAllUnclaimed: (params: RequestParams = {}) =>
      this.http.request<
        ApiResponseDto & {
          data?: DealerEntity[];
        },
        any
      >({
        path: `/admin/dealers/unclaimed`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerFindOne
     * @summary Get Dealer by id
     * @request GET:/admin/dealers/{id}
     * @secure
     * @response `200` `DealerEntity`
     */
    dealersAdminControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<DealerEntity, any>({
        path: `/admin/dealers/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerUpdate
     * @summary Update Dealer
     * @request PATCH:/admin/dealers/{id}
     * @secure
     * @response `200` `DealerEntity`
     */
    dealersAdminControllerUpdate: (
      id: string,
      data: UpdateDealerDto,
      params: RequestParams = {},
    ) =>
      this.http.request<DealerEntity, any>({
        path: `/admin/dealers/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerRemove
     * @summary Delete Dealer
     * @request DELETE:/admin/dealers/{id}
     * @secure
     * @response `200` `DealerEntity`
     */
    dealersAdminControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<DealerEntity, any>({
        path: `/admin/dealers/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerInviteMember
     * @summary Invite/link a dealer member by email
     * @request POST:/admin/dealers/{id}/members/invite
     * @secure
     * @response `200` `void` DealerMember row (invite or active membership).
     */
    dealersAdminControllerInviteMember: (
      id: string,
      data: DealerMemberInviteDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/dealers/${id}/members/invite`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerReplaceOwner
     * @summary Replace dealer owner (revoke current + invite/link new)
     * @request POST:/admin/dealers/{id}/members/replace-owner
     * @secure
     * @response `200` `void` DealerMember row for the new (or updated) owner invite/membership.
     */
    dealersAdminControllerReplaceOwner: (
      id: string,
      data: ReplaceDealerOwnerDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/dealers/${id}/members/replace-owner`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Dealers
     * @name DealersAdminControllerGetAdminStatus
     * @summary Get dealer admin invite/membership status
     * @request GET:/admin/dealers/{id}/members/admin-status
     * @secure
     * @response `200` `DealerAdminStatusResponseDto` Dealer admin state (active vs invited).
     */
    dealersAdminControllerGetAdminStatus: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<DealerAdminStatusResponseDto, any>({
        path: `/admin/dealers/${id}/members/admin-status`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ChatSystemToolPolicy
     * @name ChatSystemToolPolicyControllerList
     * @request GET:/admin/chat-tools
     * @secure
     * @response `200` `void`
     */
    chatSystemToolPolicyControllerList: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/chat-tools`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags ChatSystemToolPolicy
     * @name ChatSystemToolPolicyControllerSetOptionalDefault
     * @request PATCH:/admin/chat-tools
     * @secure
     * @response `200` `void`
     */
    chatSystemToolPolicyControllerSetOptionalDefault: (
      data: UpdateChatSystemToolPolicyDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/chat-tools`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerCreate
     * @summary Create FeedSource
     * @request POST:/admin/feed-sources
     * @secure
     * @response `201` `void`
     */
    feedSourceControllerCreate: (
      data: CreateFeedSourceDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Feed Sources
 * @name FeedSourceControllerFindPage
 * @summary List FeedSources (paged)
 * @request GET:/admin/feed-sources
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedSourceEntity)[],

})` FeedSources retrieved successfully.
 */
    feedSourceControllerFindPage: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: FeedSourceEntity[];
        },
        any
      >({
        path: `/admin/feed-sources`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerGetConnectionConfig
     * @summary Get tenant-level feed connection config used for derived URLs
     * @request GET:/admin/feed-sources/connection-config
     * @secure
     * @response `200` `void`
     */
    feedSourceControllerGetConnectionConfig: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/connection-config`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Feed Sources
 * @name FeedSourceControllerListFeedProviders
 * @summary List known feed providers for MULTI_DEALER_FTP sources
 * @request GET:/admin/feed-sources/feed-providers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedProviderEntity)[],

})` Feed providers retrieved successfully.
 */
    feedSourceControllerListFeedProviders: (params: RequestParams = {}) =>
      this.http.request<
        ApiResponseDto & {
          data?: FeedProviderEntity[];
        },
        any
      >({
        path: `/admin/feed-sources/feed-providers`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerFindOne
     * @summary Get FeedSource by id
     * @request GET:/admin/feed-sources/{id}
     * @secure
     * @response `404` `void` FeedSource not found
     */
    feedSourceControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<any, void>({
        path: `/admin/feed-sources/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerUpdate
     * @summary Update FeedSource
     * @request PATCH:/admin/feed-sources/{id}
     * @secure
     * @response `200` `void`
     */
    feedSourceControllerUpdate: (
      id: string,
      data: UpdateFeedSourceDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerRemove
     * @summary Delete FeedSource
     * @request DELETE:/admin/feed-sources/{id}
     * @secure
     * @response `200` `void`
     */
    feedSourceControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerGetConnection
     * @summary Reveal feed connection details including password-bearing connection URL
     * @request GET:/admin/feed-sources/{id}/connection-url
     * @secure
     * @response `200` `void`
     */
    feedSourceControllerGetConnection: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/${id}/connection-url`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerResetPassword
     * @summary Rotate feed password and return the new derived connection URL
     * @request POST:/admin/feed-sources/{id}/reset-password
     * @secure
     * @response `201` `void`
     */
    feedSourceControllerResetPassword: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/${id}/reset-password`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerPreviewMappingCsv
     * @summary Preview CSV headers and sample rows for the feed source using the currently configured remote path and credentials
     * @request GET:/admin/feed-sources/{id}/mapping-preview
     * @secure
     * @response `200` `FeedSourceCsvPreviewEntity`
     */
    feedSourceControllerPreviewMappingCsv: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<FeedSourceCsvPreviewEntity, any>({
        path: `/admin/feed-sources/${id}/mapping-preview`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerValidateMapping
     * @summary Validate candidate mapping/defaults against the previewed CSV headers before saving
     * @request POST:/admin/feed-sources/{id}/mapping-validate
     * @secure
     * @response `200` `FeedSourceMappingValidationEntity`
     */
    feedSourceControllerValidateMapping: (
      id: string,
      data: ValidateFeedSourceMappingDto,
      params: RequestParams = {},
    ) =>
      this.http.request<FeedSourceMappingValidationEntity, any>({
        path: `/admin/feed-sources/${id}/mapping-validate`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerRunImportNow
     * @summary Run FeedSource import now
     * @request POST:/admin/feed-sources/{id}/import
     * @secure
     * @response `202` `void`
     */
    feedSourceControllerRunImportNow: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-sources/${id}/import`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Sources
     * @name FeedSourceControllerBackfillDealerContactGeo
     * @summary Backfill missing dealer-contact coordinates for a single FeedSource
     * @request POST:/admin/feed-sources/{id}/dealer-contacts/backfill-geo
     * @secure
     * @response `200` `DealerContactGeoBackfillEntity`
     */
    feedSourceControllerBackfillDealerContactGeo: (
      id: string,
      query?: {
        /**
         * @min 1
         * @max 5000
         * @default 500
         */
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<DealerContactGeoBackfillEntity, any>({
        path: `/admin/feed-sources/${id}/dealer-contacts/backfill-geo`,
        method: "POST",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Admin Feed Providers
 * @name FeedProviderControllerList
 * @summary List feed providers
 * @request GET:/admin/feed-providers
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (FeedProviderAdminEntity)[],

})` Feed providers retrieved successfully.
 */
    feedProviderControllerList: (
      query?: {
        /** When true, return only enabled providers (for selects). */
        enabled?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: FeedProviderAdminEntity[];
        },
        any
      >({
        path: `/admin/feed-providers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Providers
     * @name FeedProviderControllerCreate
     * @summary Create feed provider
     * @request POST:/admin/feed-providers
     * @secure
     * @response `201` `void`
     */
    feedProviderControllerCreate: (
      data: CreateFeedProviderDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-providers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Providers
     * @name FeedProviderControllerFindOne
     * @summary Get feed provider by id
     * @request GET:/admin/feed-providers/{id}
     * @secure
     * @response `200` `void`
     */
    feedProviderControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/feed-providers/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Providers
     * @name FeedProviderControllerUpdate
     * @summary Update feed provider (code is immutable)
     * @request PATCH:/admin/feed-providers/{id}
     * @secure
     * @response `200` `void`
     */
    feedProviderControllerUpdate: (
      id: string,
      data: UpdateFeedProviderDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/admin/feed-providers/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin Feed Providers
     * @name FeedProviderControllerRemove
     * @summary Delete feed provider. Fails with 409 if referenced by feed sources or dealer identities.
     * @request DELETE:/admin/feed-providers/{id}
     * @secure
     * @response `200` `void`
     */
    feedProviderControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/admin/feed-providers/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  user = {
    /**
     * No description
     *
     * @tags User
     * @name UserControllerGetProfile
     * @summary Get user profile
     * @request GET:/user/profile
     * @secure
     * @response `200` `ApiResponseDto` Successfully retrieved user profile
     * @response `401` `void` Unauthorized - Invalid or missing token
     */
    userControllerGetProfile: (params: RequestParams = {}) =>
      this.http.request<ApiResponseDto, void>({
        path: `/user/profile`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description preferredZip, preferredCityState, and unreadEmailTimingMinutes cannot be updated via this endpoint (stripped server-side). Use PATCH /user/profile/preferred-location or PATCH /user/notification-settings.
     *
     * @tags User
     * @name UserControllerUpdateProfile
     * @summary Update user profile
     * @request PUT:/user/profile
     * @secure
     * @response `200` `ApiResponseDto` Successfully updated user profile
     * @response `401` `void` Unauthorized - Invalid or missing token
     */
    userControllerUpdateProfile: (data: UserDto, params: RequestParams = {}) =>
      this.http.request<ApiResponseDto, void>({
        path: `/user/profile`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name UserControllerCreateProfile
     * @summary Create user profile
     * @request POST:/user/profile
     * @secure
     * @response `201` `ApiResponseDto` Successfully created user profile
     * @response `401` `void` Unauthorized - Invalid or missing token
     */
    userControllerCreateProfile: (
      data: UserCreateInputDto,
      params: RequestParams = {},
    ) =>
      this.http.request<ApiResponseDto, void>({
        path: `/user/profile`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name UserControllerDeleteProfile
     * @summary Delete user profile
     * @request DELETE:/user/profile
     * @secure
     * @response `200` `ApiResponseDto` Successfully deleted user profile
     * @response `401` `void` Unauthorized - Invalid or missing token
     */
    userControllerDeleteProfile: (data: UserDto, params: RequestParams = {}) =>
      this.http.request<ApiResponseDto, void>({
        path: `/user/profile`,
        method: "DELETE",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Creates or updates preferredZip/preferredCityState for the authenticated user. Each provided body field overwrites that column; omitted keys are unchanged. Use instead of PUT /user/profile for these fields.
     *
     * @tags User
     * @name UserControllerPatchPreferredLocation
     * @summary Upsert preferred search location
     * @request PATCH:/user/profile/preferred-location
     * @secure
     * @response `200` `UserDto` Preferred location saved
     * @response `400` `void` Validation error
     */
    userControllerPatchPreferredLocation: (
      data: PreferredLocationPatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<UserDto, void>({
        path: `/user/profile/preferred-location`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Sets preferredZip and preferredCityState to null for the authenticated user.
     *
     * @tags User
     * @name UserControllerDeletePreferredLocation
     * @summary Clear preferred search location
     * @request DELETE:/user/profile/preferred-location
     * @secure
     * @response `200` `UserDto` Preferred location cleared
     * @response `400` `void` User not found
     */
    userControllerDeletePreferredLocation: (params: RequestParams = {}) =>
      this.http.request<UserDto, void>({
        path: `/user/profile/preferred-location`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns per-user unread email digest timing. Null unreadEmailTimingMinutes means system default.
     *
     * @tags User
     * @name UserControllerGetNotificationSettings
     * @summary Get unread-chat email notification settings
     * @request GET:/user/notification-settings
     * @secure
     * @response `200` `NotificationSettingsDto` Notification settings
     */
    userControllerGetNotificationSettings: (params: RequestParams = {}) =>
      this.http.request<NotificationSettingsDto, any>({
        path: `/user/notification-settings`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Sets unreadEmailTimingMinutes to 15, 60, 480, 1440, or null (system default). Prefer this over PUT /user/profile.
     *
     * @tags User
     * @name UserControllerPatchNotificationSettings
     * @summary Update unread-chat email notification settings
     * @request PATCH:/user/notification-settings
     * @secure
     * @response `200` `NotificationSettingsDto` Notification settings saved
     * @response `400` `void` Validation error
     */
    userControllerPatchNotificationSettings: (
      data: NotificationSettingsPatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NotificationSettingsDto, void>({
        path: `/user/notification-settings`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name UserControllerGetAgents
     * @summary Get agents
     * @request GET:/user/agents
     * @secure
     * @response `200` `ApiResponseDto` Successfully retrieved agents
     */
    userControllerGetAgents: (params: RequestParams = {}) =>
      this.http.request<ApiResponseDto, any>({
        path: `/user/agents`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name UserControllerGetAllUsers
     * @summary Get all users
     * @request GET:/user/all
     * @secure
     * @response `200` `ApiResponseDto` Successfully retrieved all users
     */
    userControllerGetAllUsers: (params: RequestParams = {}) =>
      this.http.request<ApiResponseDto, any>({
        path: `/user/all`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  oauth = {
    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerInitiateGoogleAuth
     * @summary Initiate Google OAuth authentication
     * @request GET:/oauth/google
     * @secure
     * @response `302` `void` Redirects to Google authentication page
     * @response `500` `void` Failed to initiate Google authentication
     */
    oAuthControllerInitiateGoogleAuth: (
      query: {
        app: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<any, void>({
        path: `/oauth/google`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
 * No description
 *
 * @tags OAuth
 * @name OAuthControllerHandleGoogleCode
 * @summary Handle Google OAuth callback
 * @request POST:/oauth/google/code
 * @secure
 * @response `200` `{
  /** JWT access token *\/
    access_token?: string,
  /** JWT ID token *\/
    id_token?: string,
  /** JWT refresh token *\/
    refresh_token?: string,
  /** Token expiration time in seconds *\/
    expires_in?: number,
  /**
   * Type of token
   * @example "Bearer"
   *\/
    token_type?: string,

}` Successfully exchanged code for tokens
 * @response `400` `void` No code provided
 * @response `500` `void` Failed to exchange code for tokens
 */
    oAuthControllerHandleGoogleCode: (
      data: {
        /**
         * Authorization code from Google OAuth
         * @example "4/0AfJohXn5g6..."
         */
        code: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          /** JWT access token */
          access_token?: string;
          /** JWT ID token */
          id_token?: string;
          /** JWT refresh token */
          refresh_token?: string;
          /** Token expiration time in seconds */
          expires_in?: number;
          /**
           * Type of token
           * @example "Bearer"
           */
          token_type?: string;
        },
        void
      >({
        path: `/oauth/google/code`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags OAuth
 * @name OAuthControllerGetProfile
 * @summary Get user profile
 * @request GET:/oauth/profile
 * @secure
 * @response `200` `{
    data?: {
  /** User ID *\/
    id?: string,
  /** User email *\/
    email?: string,
  /** User name *\/
    name?: string,
  /** User avatar *\/
    avatar?: string,

},

}` Successfully got user profile
 * @response `400` `void` No access token provided
 * @response `500` `void` Failed to get user profile
 */
    oAuthControllerGetProfile: (params: RequestParams = {}) =>
      this.http.request<
        {
          data?: {
            /** User ID */
            id?: string;
            /** User email */
            email?: string;
            /** User name */
            name?: string;
            /** User avatar */
            avatar?: string;
          };
        },
        void
      >({
        path: `/oauth/profile`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags OAuth
 * @name OAuthControllerRefreshToken
 * @summary Refresh access token using refresh token
 * @request POST:/oauth/refresh
 * @secure
 * @response `200` `{
  /** New JWT access token *\/
    access_token?: string,
  /** New JWT ID token *\/
    id_token?: string,
  /** Token expiration time in seconds *\/
    expires_in?: number,
  /**
   * Type of token
   * @example "Bearer"
   *\/
    token_type?: string,

}` Successfully refreshed access token
 * @response `400` `void` No refresh token provided
 * @response `401` `void` Invalid refresh token
 * @response `500` `void` Failed to refresh access token
 */
    oAuthControllerRefreshToken: (
      data: {
        /**
         * Refresh token to exchange for new access token
         * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
         */
        refresh_token: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          /** New JWT access token */
          access_token?: string;
          /** New JWT ID token */
          id_token?: string;
          /** Token expiration time in seconds */
          expires_in?: number;
          /**
           * Type of token
           * @example "Bearer"
           */
          token_type?: string;
        },
        void
      >({
        path: `/oauth/refresh`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordSignUp
     * @summary Sign up with email/password
     * @request POST:/oauth/password/signup
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordSignUp: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/signup`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordConfirm
     * @summary Confirm sign up code for email/password
     * @request POST:/oauth/password/confirm
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordConfirm: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/confirm`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordResendConfirmation
     * @summary Resend email/password sign-up confirmation code
     * @request POST:/oauth/password/resend-confirmation
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordResendConfirmation: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/resend-confirmation`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordCheckEmail
     * @summary Check Cognito auth methods for email (password vs Google-only)
     * @request POST:/oauth/password/check-email
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordCheckEmail: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/check-email`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordSignIn
     * @summary Sign in with email/password (returns tokens)
     * @request POST:/oauth/password/signin
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordSignIn: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/signin`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordForgot
     * @summary Request password reset code (email)
     * @request POST:/oauth/password/forgot
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordForgot: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/forgot`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags OAuth
     * @name OAuthControllerPasswordReset
     * @summary Confirm password reset with code
     * @request POST:/oauth/password/reset
     * @secure
     * @response `201` `void`
     */
    oAuthControllerPasswordReset: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/oauth/password/reset`,
        method: "POST",
        secure: true,
        ...params,
      }),
  };
  chat = {
    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToSavedSearchChat
     * @summary Send a message to a saved search chat
     * @request POST:/chat/message/saved-search
     * @secure
     * @response `200` `void` Message sent to saved search chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToSavedSearchChat: (
      data: SavedSearchChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/saved-search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralSavedSearchesChat
     * @summary Send a message to a general saved searches chat
     * @request POST:/chat/message/general-saved-searches
     * @secure
     * @response `200` `void` Message sent to general saved searches chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralSavedSearchesChat: (
      data: GeneralSavedSearchesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/general-saved-searches`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralSavedSearchesChatList
     * @summary List saved searches chat
     * @request POST:/chat/list-saved-searches
     * @secure
     * @response `200` `void` Message processed for list saved searches chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralSavedSearchesChatList: (
      data: GeneralSavedSearchesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/list-saved-searches`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralNegotiationsChat
     * @summary Send a message to a general negotiations chat
     * @request POST:/chat/message/general-negotiations
     * @secure
     * @response `200` `void` Message sent to general negotiations chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralNegotiationsChat: (
      data: GeneralNegotiationsChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/general-negotiations`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralNegotiationsChatList
     * @summary List negotiations chat
     * @request POST:/chat/list-negotiations
     * @secure
     * @response `200` `void` Message processed for list negotiations chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralNegotiationsChatList: (
      data: GeneralNegotiationsChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/list-negotiations`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralOffersChat
     * @summary List offers chat
     * @request POST:/chat/list-offers
     * @secure
     * @response `200` `void` Message processed for list offers chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralOffersChat: (
      data: GeneralOffersChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/list-offers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralOffersChatLegacy
     * @summary [Deprecated] List offers chat (legacy route)
     * @request POST:/chat/message/general-offers
     * @secure
     * @response `200` `void` Message processed for list offers chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralOffersChatLegacy: (
      data: GeneralOffersChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/general-offers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralStrategiesChat
     * @summary List strategies chat
     * @request POST:/chat/list-strategies
     * @secure
     * @response `200` `void` Message processed for list strategies chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralStrategiesChat: (
      data: GeneralStrategiesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/list-strategies`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToGeneralStrategiesChatLegacy
     * @summary List strategies chat (Marketplace BFF route)
     * @request POST:/chat/message/general-strategies
     * @secure
     * @response `200` `void` Message processed for list strategies chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToGeneralStrategiesChatLegacy: (
      data: GeneralStrategiesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/general-strategies`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToGeneralStrategiesChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/general-strategies
     * @secure
     * @response `200` `void` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToGeneralStrategiesChat: (
      data: AgentGeneralStrategiesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/agent/general-strategies`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToSavedSearchChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/saved-search
     * @secure
     * @response `200` `void` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToSavedSearchChat: (
      data: AgentChatMessageToSavedSearchChatDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/agent/saved-search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToGeneralSavedSearchesChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/general-saved-searches
     * @secure
     * @response `200` `void` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToGeneralSavedSearchesChat: (
      data: AgentGeneralSavedSearchesChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/agent/general-saved-searches`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToNegotiationChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/negotiation
     * @secure
     * @response `200` `ChatResponseDto` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `404` `void` Chat response not found
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToNegotiationChat: (
      data: AgentChatMessageToNegotiationChatDto,
      params: RequestParams = {},
    ) =>
      this.http.request<ChatResponseDto, void>({
        path: `/chat/message/agent/negotiation`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToGeneralNegotiationsChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/general-negotiations
     * @secure
     * @response `200` `void` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToGeneralNegotiationsChat: (
      data: AgentGeneralNegotiationsChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/agent/general-negotiations`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentMessageToGeneralOffersChat
     * @summary Send a message to an agent chat
     * @request POST:/chat/message/agent/general-offers
     * @secure
     * @response `200` `void` Message sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentMessageToGeneralOffersChat: (
      data: AgentGeneralOffersChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/agent/general-offers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendAgentRequestToNegotiationChat
     * @summary Send a request to an agent chat
     * @request POST:/chat/message/agent/negotiation/request
     * @secure
     * @response `200` `ChatRequestDto` Request sent to agent chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerSendAgentRequestToNegotiationChat: (
      data: AgentRequestToNegotiationChatDto,
      params: RequestParams = {},
    ) =>
      this.http.request<ChatRequestDto, void>({
        path: `/chat/message/agent/negotiation/request`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerApplyNegotiationUpdates
     * @summary Apply negotiation/offer patches mid-turn (ChatRuntime update executor / update_offer tool)
     * @request POST:/chat/negotiation/apply-updates
     * @secure
     * @response `200` `void` Patches applied
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerApplyNegotiationUpdates: (
      data: ApplyNegotiationUpdatesDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/negotiation/apply-updates`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerCreateChat
     * @summary Create a chat
     * @request POST:/chat/create-chat
     * @secure
     * @response `200` `void` Chat created successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerCreateChat: (
      data: CreateChatRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/create-chat`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetChatBySavedSearchId
 * @summary Get a chat by saved search ID
 * @request GET:/chat/saved-search/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
 */
    chatControllerGetChatBySavedSearchId: (
      id: string,
      query: {
        page: string;
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatHistoryResponseDto;
        },
        void
      >({
        path: `/chat/saved-search/${id}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetChatByNegotiationId
 * @summary Get a chat by negotiation ID
 * @request GET:/chat/negotiation/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
 */
    chatControllerGetChatByNegotiationId: (
      id: string,
      query: {
        page: string;
        limit: string;
        kind: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatHistoryResponseDto;
        },
        void
      >({
        path: `/chat/negotiation/${id}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetChatByOfferId
 * @summary Get a chat by offer ID
 * @request GET:/chat/offer/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
 */
    chatControllerGetChatByOfferId: (
      id: string,
      query: {
        page: string;
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatHistoryResponseDto;
        },
        void
      >({
        path: `/chat/offer/${id}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetChatByStrategyId
 * @summary Get or create a strategy chat by strategy id
 * @request GET:/chat/strategy/{id}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `404` `void` Chat not found
 * @response `500` `void` Internal server error
 */
    chatControllerGetChatByStrategyId: (
      id: string,
      query: {
        page: string;
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatHistoryResponseDto;
        },
        void
      >({
        path: `/chat/strategy/${id}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToNegotiationChat
     * @summary Send a message to a negotiation chat
     * @request POST:/chat/message/negotiation
     * @secure
     * @response `200` `void` Message sent to negotiation chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToNegotiationChat: (
      data: NegotiationChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/negotiation`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToOfferChat
     * @summary Send a message to an offer chat
     * @request POST:/chat/message/offer
     * @secure
     * @response `200` `void` Message sent to offer chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToOfferChat: (
      data: OfferChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/offer`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerSendMessageToStrategyChat
     * @summary Send a message to a strategy editor chat
     * @request POST:/chat/message/strategy
     * @secure
     * @response `200` `void` Message sent to strategy chat successfully
     * @response `400` `void` Bad request
     * @response `401` `void` Invalid token (when Bearer is provided)
     * @response `500` `void` Internal server error
     */
    chatControllerSendMessageToStrategyChat: (
      data: StrategyChatMessageDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/message/strategy`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetGeneralChat
 * @summary Get a General Chat by scope
 * @request GET:/chat/general-chat/{scope}
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatHistoryResponseDto,

})` Chat retrieved successfully
 * @response `400` `void` Bad request
 * @response `401` `ApiResponseDto` Unauthorized
 * @response `404` `ApiResponseDto` Chat not found
 * @response `500` `ApiResponseDto` Internal server error
 */
    chatControllerGetGeneralChat: (
      scope: string,
      query: {
        page: string;
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatHistoryResponseDto;
        },
        void | ApiResponseDto
      >({
        path: `/chat/general-chat/${scope}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetInboxSummary
 * @summary Inbox summary (unread + latest activity) for current user
 * @request GET:/chat/inbox/summary
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: InboxSummaryDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
 */
    chatControllerGetInboxSummary: (
      query: {
        since: string;
        dealerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: InboxSummaryDto;
        },
        void
      >({
        path: `/chat/inbox/summary`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetUserMessagesInbox
 * @summary Paginated per-user Agent→User messages inbox (proxied from tenant-chat)
 * @request GET:/chat/messages
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: UserMessageInboxPageDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
 */
    chatControllerGetUserMessagesInbox: (
      query: {
        page: string;
        pageSize: string;
        readStatus: string;
        dealerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: UserMessageInboxPageDto;
        },
        void
      >({
        path: `/chat/messages`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerMarkUserMessagesRead
 * @summary Bulk mark inbox messages as read (proxied to tenant-chat Optimization inbox)
 * @request POST:/chat/messages/mark-read
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: MarkUserMessagesReadResultDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
 */
    chatControllerMarkUserMessagesRead: (
      query: {
        dealerId: string;
      },
      data: MarkUserMessagesReadDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: MarkUserMessagesReadResultDto;
        },
        void
      >({
        path: `/chat/messages/mark-read`,
        method: "POST",
        query: query,
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags chat
 * @name ChatControllerGetChatUpdates
 * @summary Incremental chat updates (responses since cursor)
 * @request GET:/chat/{id}/updates
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: ChatUpdatesDto,

})`
 * @response `400` `void` Bad request
 * @response `401` `void` Unauthorized
 * @response `500` `void` Internal server error
 */
    chatControllerGetChatUpdates: (
      id: string,
      query: {
        after: string;
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: ChatUpdatesDto;
        },
        void
      >({
        path: `/chat/${id}/updates`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerMarkChatMessagesRead
     * @summary Mark specific chat response messages as read for current user
     * @request POST:/chat/{id}/messages/read
     * @secure
     * @response `200` `void` Success
     * @response `201` `void`
     * @response `400` `void` Bad request
     * @response `401` `void` Unauthorized
     * @response `500` `void` Internal server error
     */
    chatControllerMarkChatMessagesRead: (
      id: string,
      query: {
        dealerId: string;
      },
      data: MarkChatMessagesReadDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, void>({
        path: `/chat/${id}/messages/read`,
        method: "POST",
        query: query,
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  internal = {
    /**
     * No description
     *
     * @tags internal-chat-user-profile
     * @name InternalChatUserProfileControllerGet
     * @summary Get sanitized user profile for tenant-chat tools
     * @request GET:/internal/chat/user-profile/{userId}
     * @secure
     * @response `200` `void`
     */
    internalChatUserProfileControllerGet: (
      userId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/internal/chat/user-profile/${userId}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags internal-chat-user-profile
     * @name InternalChatUserProfileControllerPatch
     * @summary Update allowlisted user profile fields for tenant-chat tools
     * @request PATCH:/internal/chat/user-profile
     * @secure
     * @response `200` `void`
     */
    internalChatUserProfileControllerPatch: (
      data: ChatUserProfilePatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/internal/chat/user-profile`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags InternalChatSystemToolPolicy
     * @name InternalChatSystemToolPolicyControllerListEffectivePolicies
     * @request GET:/internal/chat-tools/policy
     * @secure
     * @response `200` `void`
     */
    internalChatSystemToolPolicyControllerListEffectivePolicies: (
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/internal/chat-tools/policy`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags notifications
     * @name InternalUnreadChatsControllerSendUnreadChatsEmail
     * @request POST:/internal/notifications/unread-chats
     * @secure
     * @response `201` `void`
     */
    internalUnreadChatsControllerSendUnreadChatsEmail: (
      data: UnreadChatsEmailDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/internal/notifications/unread-chats`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  messages = {
    /**
     * No description
     *
     * @tags Messages
     * @name MessagesControllerSendChatMessage
     * @request POST:/messages/chat/{chatId}
     * @secure
     * @response `201` `void`
     */
    messagesControllerSendChatMessage: (
      chatId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/messages/chat/${chatId}`,
        method: "POST",
        secure: true,
        ...params,
      }),
  };
  account = {
    /**
     * No description
     *
     * @tags Account
     * @name AccountStatsControllerGetStats
     * @summary Account stats for Personal (actor) or Dealer context (same negotiation scope as dealer lists).
     * @request GET:/account/stats
     * @secure
     * @response `200` `void` Account stats snapshot (may be null while cold).
     */
    accountStatsControllerGetStats: (
      query?: {
        /**
         * When set, return dealer-scoped list counts after membership + permission checks.
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/account/stats`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),
  };
  negotiationStrategies = {
    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerFindAllTemplates
     * @summary List template negotiation strategies
     * @request GET:/negotiation-strategies/templates
     * @secure
     * @response `200` `(NegotiationStrategyEntity)[]` List of template negotiation strategies
     */
    userNegotiationStrategiesControllerFindAllTemplates: (
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity[], any>({
        path: `/negotiation-strategies/templates`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerFindAll
     * @summary List negotiation strategies for current user
     * @request GET:/negotiation-strategies
     * @secure
     * @response `200` `(NegotiationStrategyEntity)[]` List of negotiation strategies for the authenticated user
     */
    userNegotiationStrategiesControllerFindAll: (
      query?: {
        /**
         * When set, list dealer-owner strategies for this dealer after membership + permission checks.
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity[], any>({
        path: `/negotiation-strategies`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerCreate
     * @summary Create negotiation strategy for current user
     * @request POST:/negotiation-strategies
     * @secure
     * @response `201` `NegotiationStrategyEntity` Created negotiation strategy for the authenticated user
     */
    userNegotiationStrategiesControllerCreate: (
      data: CreateNegotiationStrategyRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/negotiation-strategies`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerFindOne
     * @summary Get negotiation strategy for current user by id
     * @request GET:/negotiation-strategies/{id}
     * @secure
     * @response `200` `NegotiationStrategyEntity` Negotiation strategy for the authenticated user
     */
    userNegotiationStrategiesControllerFindOne: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/negotiation-strategies/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerUpdate
     * @summary Update negotiation strategy for current user
     * @request PATCH:/negotiation-strategies/{id}
     * @secure
     * @response `200` `NegotiationStrategyEntity` Updated negotiation strategy for the authenticated user
     */
    userNegotiationStrategiesControllerUpdate: (
      id: string,
      data: UpdateNegotiationStrategyRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/negotiation-strategies/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Negotiation Strategies
     * @name UserNegotiationStrategiesControllerRemove
     * @summary Delete negotiation strategy for current user
     * @request DELETE:/negotiation-strategies/{id}
     * @secure
     * @response `200` `NegotiationStrategyEntity` Deleted negotiation strategy for the authenticated user
     */
    userNegotiationStrategiesControllerRemove: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<NegotiationStrategyEntity, any>({
        path: `/negotiation-strategies/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  leads = {
    /**
     * No description
     *
     * @tags Leads
     * @name LeadControllerInstructions
     * @summary Lead setup instructions for dashboard
     * @request GET:/leads/instructions
     * @secure
     * @response `200` `LeadInstructionsDto`
     */
    leadControllerInstructions: (params: RequestParams = {}) =>
      this.http.request<LeadInstructionsDto, any>({
        path: `/leads/instructions`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags Leads
 * @name LeadControllerList
 * @summary List leads (paged)
 * @request GET:/leads
 * @secure
 * @response `200` `(ApiResponseDto & {
    data?: (LeadEntity)[],

})` Leads retrieved successfully.
 */
    leadControllerList: (
      query?: {
        /**
         * @min 1
         * @default 1
         */
        page?: number;
        /**
         * @min 1
         * @default 20
         */
        limit?: number;
        /** Optional filter: only leads resolved to this FeedSource */
        feedSourceId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ApiResponseDto & {
          data?: LeadEntity[];
        },
        any
      >({
        path: `/leads`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name LeadControllerCreate
     * @summary Create a lead and dispatch sending
     * @request POST:/leads
     * @secure
     * @response `200` `void` Lead accepted for processing.
     */
    leadControllerCreate: (data: LeadRequestDto, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/leads`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  offers = {
    /**
     * No description
     *
     * @tags Offer terms
     * @name OfferTermsControllerGetTerms
     * @summary Get standard offer terms (active, dealer-aware)
     * @request GET:/offers/terms/{side}
     * @secure
     * @response `200` `OfferStandardTermsEntity`
     */
    offerTermsControllerGetTerms: (
      side: OfferTermsSide,
      query?: {
        isDealer?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<OfferStandardTermsEntity, any>({
        path: `/offers/terms/${side}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Offer certificate
     * @name OffersCertificateControllerIssue
     * @summary Issue an offer certificate share token (ensures S3 snapshot exists)
     * @request POST:/offers/certificate
     * @secure
     * @response `201` `IssueOfferCertificateResponseDto`
     */
    offersCertificateControllerIssue: (
      data: IssueOfferCertificateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<IssueOfferCertificateResponseDto, any>({
        path: `/offers/certificate`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  permissions = {
    /**
     * No description
     *
     * @tags Permissions
     * @name PermissionsControllerGetMyPermissions
     * @request GET:/permissions/me
     * @secure
     * @response `200` `PermissionsMeResponseDto` CASL snapshot plus per-dealer membership permission slugs for the authenticated user.
     */
    permissionsControllerGetMyPermissions: (params: RequestParams = {}) =>
      this.http.request<PermissionsMeResponseDto, any>({
        path: `/permissions/me`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  savedSearch = {
    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerCreate
     * @summary Create a new saved search
     * @request POST:/saved-search
     * @secure
     * @response `201` `SavedSearchEntity` The saved search has been successfully created.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    savedSearchControllerCreate: (
      data: CreateSavedSearchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<SavedSearchEntity, void>({
        path: `/saved-search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerFindAllLegacyGet
     * @summary Get all saved searches (deprecated; use POST /saved-search/findall)
     * @request GET:/saved-search
     * @secure
     * @response `200` `ApiResponseDto` The saved searches have been successfully fetched.
     */
    savedSearchControllerFindAllLegacyGet: (
      query?: {
        /**
         * Page number (1-based)
         * @default 1
         */
        page?: number;
        /**
         * Limit per page
         * @default 20
         */
        limit?: number;
        /**
         * When true (default), return only saved searches. When false, return only transient (saved=false).
         * @default true
         */
        saved?: boolean;
        filters?: SearchFiltersDto;
        /**
         * When set, list dealer-owner saved searches for this dealer after membership + permission checks.
         * @format uuid
         */
        dealerId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<ApiResponseDto, any>({
        path: `/saved-search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerFindAll
     * @summary Get all saved searches
     * @request POST:/saved-search/findall
     * @secure
     * @response `200` `ApiResponseDto` The saved searches have been successfully fetched.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    savedSearchControllerFindAll: (
      data: FindAllSavedSearchQueryDto,
      params: RequestParams = {},
    ) =>
      this.http.request<ApiResponseDto, void>({
        path: `/saved-search/findall`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerFindOne
     * @request GET:/saved-search/{id}
     * @secure
     * @response `200` `void`
     */
    savedSearchControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/saved-search/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerUpdate
     * @summary Update a saved search
     * @request PATCH:/saved-search/{id}
     * @secure
     * @response `200` `SavedSearchEntity` The saved search has been successfully updated.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    savedSearchControllerUpdate: (
      id: string,
      data: UpdateSavedSearchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<SavedSearchEntity, void>({
        path: `/saved-search/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerRemove
     * @request DELETE:/saved-search/{id}
     * @secure
     * @response `200` `void`
     */
    savedSearchControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/saved-search/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Saved Searches
     * @name SavedSearchControllerUpdateStatus
     * @summary Update the status of a saved search
     * @request PATCH:/saved-search/{id}/status
     * @secure
     * @response `200` `SavedSearchEntity` The saved search status has been successfully updated.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    savedSearchControllerUpdateStatus: (
      id: string,
      data: UpdateSavedSearchStatusDto,
      params: RequestParams = {},
    ) =>
      this.http.request<SavedSearchEntity, void>({
        path: `/saved-search/${id}/status`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  dealerMemberships = {
    /**
     * No description
     *
     * @tags Dealer memberships
     * @name DealerMembershipsControllerGetMyMemberships
     * @request GET:/dealer-memberships/me
     * @secure
     * @response `200` `DealerMembershipsMeResponseDto` Dealer memberships (dealer context) for the authenticated user.
     */
    dealerMembershipsControllerGetMyMemberships: (params: RequestParams = {}) =>
      this.http.request<DealerMembershipsMeResponseDto, any>({
        path: `/dealer-memberships/me`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer memberships
     * @name DealerMembershipsControllerListDealerMembers
     * @request GET:/dealer-memberships/dealers/{dealerId}/members
     * @secure
     * @response `200` `void` List active members/invites for a dealer (caller must be a member).
     */
    dealerMembershipsControllerListDealerMembers: (
      dealerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-memberships/dealers/${dealerId}/members`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer memberships
     * @name DealerMembershipsControllerInviteStaff
     * @request POST:/dealer-memberships/dealers/{dealerId}/invites
     * @secure
     * @response `200` `void` Invite staff (admin/manager/viewer). Requires users.manage. Rejects OWNER.
     */
    dealerMembershipsControllerInviteStaff: (
      dealerId: string,
      data: DealerStaffInviteDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-memberships/dealers/${dealerId}/invites`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  dealerProfile = {
    /**
     * No description
     *
     * @tags Dealer profile
     * @name DealerProfileControllerGetProfile
     * @request GET:/dealer-profile/{dealerId}
     * @secure
     * @response `200` `DealerProfileResponseDto` Dealer profile for marketplace (requires inventory.read).
     */
    dealerProfileControllerGetProfile: (
      dealerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<DealerProfileResponseDto, any>({
        path: `/dealer-profile/${dealerId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer profile
     * @name DealerProfileControllerUpdateProfile
     * @request PATCH:/dealer-profile/{dealerId}
     * @secure
     * @response `200` `DealerProfileResponseDto` Update dealer profile (requires dealer.profile.manage).
     */
    dealerProfileControllerUpdateProfile: (
      dealerId: string,
      data: UpdateDealerProfileDto,
      params: RequestParams = {},
    ) =>
      this.http.request<DealerProfileResponseDto, any>({
        path: `/dealer-profile/${dealerId}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  dealerInventory = {
    /**
     * No description
     *
     * @tags Dealer inventory
     * @name DealerInventoryControllerListDealerInventory
     * @request GET:/dealer-inventory/{dealerId}
     * @secure
     * @response `200` `DealerInventoryResponseDto` Dealer-scoped inventory (requires active membership).
     */
    dealerInventoryControllerListDealerInventory: (
      dealerId: string,
      query?: {
        /**
         * 1-based page index
         * @default 1
         */
        page?: number;
        /**
         * Page size
         * @max 200
         * @default 24
         */
        limit?: number;
        /** Free-text search (vin, stock number, make/model/trim, city/state) */
        q?: string;
        /**
         * Sort field
         * @default "updatedAt"
         */
        sortField?: DealerInventoryControllerListDealerInventoryParamsSortFieldEnum;
        /** Multi-sort spec in priority order. Repeatable query param. Format: `<field>:<asc|desc>` (e.g. `sort=price:asc&sort=mileage:desc`). */
        sort?: string[];
        /**
         * Sort order
         * @default "desc"
         */
        sortOrder?: DealerInventoryControllerListDealerInventoryParamsSortOrderEnum;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<DealerInventoryResponseDto, any>({
        path: `/dealer-inventory/${dealerId}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer inventory
     * @name DealerInventoryControllerUpdateVehicleVisibility
     * @request PATCH:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/visibility
     * @secure
     * @response `200` `void` Toggle a dealer vehicle visibility (ACTIVE <-> HIDDEN).
     */
    dealerInventoryControllerUpdateVehicleVisibility: (
      dealerId: string,
      vehicleId: string,
      data: DealerInventoryVisibilityDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-inventory/${dealerId}/vehicles/${vehicleId}/visibility`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer inventory
     * @name DealerInventoryControllerPreviewOutOfMarket
     * @request GET:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/out-of-market
     * @secure
     * @response `200` `void` Preview open deals before removing a listing from the market.
     */
    dealerInventoryControllerPreviewOutOfMarket: (
      dealerId: string,
      vehicleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-inventory/${dealerId}/vehicles/${vehicleId}/out-of-market`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer inventory
     * @name DealerInventoryControllerApplyOutOfMarket
     * @request POST:/dealer-inventory/{dealerId}/vehicles/{vehicleId}/out-of-market
     * @secure
     * @response `200` `void` Remove a listing from the market and close its open deals.
     */
    dealerInventoryControllerApplyOutOfMarket: (
      dealerId: string,
      vehicleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-inventory/${dealerId}/vehicles/${vehicleId}/out-of-market`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer inventory
     * @name DealerInventoryControllerAssignFinance
     * @request POST:/dealer-inventory/{dealerId}/finance-assignment
     * @secure
     * @response `201` `void`
     */
    dealerInventoryControllerAssignFinance: (
      dealerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-inventory/${dealerId}/finance-assignment`,
        method: "POST",
        secure: true,
        ...params,
      }),
  };
  dealerInventoryOptimized = {
    /**
     * No description
     *
     * @tags Dealer inventory (optimized)
     * @name DealerInventoryOptimizedControllerSuggestions
     * @summary Dealer-scoped inventory suggestions (tenant-search proxy; requires inventory.read)
     * @request GET:/dealer-inventory_optimized/{dealerId}/suggestions
     * @secure
     * @response `200` `void` SearchSuggestion[] scoped to the dealer posting list.
     */
    dealerInventoryOptimizedControllerSuggestions: (
      dealerId: string,
      query?: {
        /** Suggestion query prefix (make/model/trim/VIN/stock) */
        q?: string;
        /**
         * Max suggestions to return (tenant-search clamps to 50)
         * @max 50
         * @default 10
         */
        max?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealer-inventory_optimized/${dealerId}/suggestions`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer inventory (optimized)
     * @name DealerInventoryOptimizedControllerList
     * @summary Dealer-scoped inventory list via tenant-search (requires inventory.read; no counts)
     * @request GET:/dealer-inventory_optimized/{dealerId}
     * @secure
     * @response `200` `DealerInventoryOptimizedResponseDto` Dealer-scoped inventory page (search-backed; no offer/neg counts).
     */
    dealerInventoryOptimizedControllerList: (
      dealerId: string,
      query?: {
        /**
         * 1-based page index
         * @default 1
         */
        page?: number;
        /**
         * Page size (alias of pageSize). Default 48; max 200.
         * @max 200
         * @default 48
         */
        limit?: number;
        /**
         * Page size (alias of limit). Default 48; max 200.
         * @max 200
         * @default 48
         */
        pageSize?: number;
        /** Free-text search (vin, stock number, make/model/trim, city/state) */
        q?: string;
        /**
         * Sort field (legacy single-sort)
         * @default "updatedAt"
         */
        sortField?: DealerInventoryOptimizedControllerListParamsSortFieldEnum;
        /** Multi-sort spec in priority order. Repeatable query param. Format: `<field>:<asc|desc>` (e.g. `sort=price:asc&sort=mileage:desc`). */
        sort?: string[];
        /**
         * Sort order (legacy single-sort)
         * @default "desc"
         */
        sortOrder?: DealerInventoryOptimizedControllerListParamsSortOrderEnum;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<DealerInventoryOptimizedResponseDto, any>({
        path: `/dealer-inventory_optimized/${dealerId}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  dealers = {
    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerList
     * @request GET:/dealers/{dealerId}/finance-plans
     * @secure
     * @response `200` `void`
     */
    financePlansControllerList: (
      dealerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerCreate
     * @request POST:/dealers/{dealerId}/finance-plans
     * @secure
     * @response `201` `void`
     */
    financePlansControllerCreate: (
      dealerId: string,
      data: FinancePlanWriteDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerGetOne
     * @request GET:/dealers/{dealerId}/finance-plans/{id}
     * @secure
     * @response `200` `void`
     */
    financePlansControllerGetOne: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerUpdate
     * @request PATCH:/dealers/{dealerId}/finance-plans/{id}
     * @secure
     * @response `200` `void`
     */
    financePlansControllerUpdate: (
      dealerId: string,
      id: string,
      data: FinancePlanPatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerRemove
     * @request DELETE:/dealers/{dealerId}/finance-plans/{id}
     * @secure
     * @response `200` `void`
     */
    financePlansControllerRemove: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerUsage
     * @request GET:/dealers/{dealerId}/finance-plans/{id}/usage
     * @secure
     * @response `200` `void`
     */
    financePlansControllerUsage: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans/${id}/usage`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer finance plans
     * @name FinancePlansControllerRetire
     * @request POST:/dealers/{dealerId}/finance-plans/{id}/retire
     * @secure
     * @response `201` `void`
     */
    financePlansControllerRetire: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/finance-plans/${id}/retire`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer strategy rules
     * @name DealerStrategyRulesControllerList
     * @request GET:/dealers/{dealerId}/strategy-rules
     * @secure
     * @response `200` `void`
     */
    dealerStrategyRulesControllerList: (
      dealerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/strategy-rules`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer strategy rules
     * @name DealerStrategyRulesControllerCreate
     * @request POST:/dealers/{dealerId}/strategy-rules
     * @secure
     * @response `201` `void`
     */
    dealerStrategyRulesControllerCreate: (
      dealerId: string,
      data: DealerStrategyRuleWriteDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/strategy-rules`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer strategy rules
     * @name DealerStrategyRulesControllerGetOne
     * @request GET:/dealers/{dealerId}/strategy-rules/{id}
     * @secure
     * @response `200` `void`
     */
    dealerStrategyRulesControllerGetOne: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/strategy-rules/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer strategy rules
     * @name DealerStrategyRulesControllerUpdate
     * @request PATCH:/dealers/{dealerId}/strategy-rules/{id}
     * @secure
     * @response `200` `void`
     */
    dealerStrategyRulesControllerUpdate: (
      dealerId: string,
      id: string,
      data: DealerStrategyRulePatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/strategy-rules/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Dealer strategy rules
     * @name DealerStrategyRulesControllerRemove
     * @request DELETE:/dealers/{dealerId}/strategy-rules/{id}
     * @secure
     * @response `200` `void`
     */
    dealerStrategyRulesControllerRemove: (
      dealerId: string,
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/dealers/${dealerId}/strategy-rules/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  search = {
    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerSuggestions
     * @summary Get search suggestions
     * @request GET:/search/suggestions
     * @secure
     * @response `200` `(string)[]` Search suggestions retrieved successfully.
     */
    searchControllerSuggestions: (
      query: {
        q: string;
        max: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<string[], any>({
        path: `/search/suggestions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerCreate
     * @summary Create a new search
     * @request POST:/search
     * @secure
     * @response `201` `ApiResponseDto` The search has been successfully created.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerCreate: (
      data: SearchVehicleRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<ApiResponseDto, void>({
        path: `/search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerFindAll
     * @request GET:/search
     * @secure
     * @response `200` `void`
     */
    searchControllerFindAll: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/search`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetVehicleFinanceDisclaimer
     * @summary Finance monthly tooltip inputs for one vehicle (tenant-search)
     * @request GET:/search/vehicles/{vehicleId}/finance-disclaimer
     * @secure
     * @response `200` `void`
     */
    searchControllerGetVehicleFinanceDisclaimer: (
      vehicleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/search/vehicles/${vehicleId}/finance-disclaimer`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetVehicleFinanceDisclaimers
     * @summary Finance monthly tooltip inputs for many vehicles (tenant-search)
     * @request POST:/search/vehicles/finance-disclaimers
     * @secure
     * @response `201` `void`
     */
    searchControllerGetVehicleFinanceDisclaimers: (
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/search/vehicles/finance-disclaimers`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerFindOne
     * @request GET:/search/{id}
     * @secure
     * @response `200` `void`
     */
    searchControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/search/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerUpdate
     * @request PATCH:/search/{id}
     * @secure
     * @response `200` `void`
     */
    searchControllerUpdate: (
      id: string,
      data: UpdateSearchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/search/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerRemove
     * @request DELETE:/search/{id}
     * @secure
     * @response `200` `void`
     */
    searchControllerRemove: (id: string, params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/search/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetTaxonomyMakes
     * @summary Get taxonomy makes
     * @request GET:/search/taxonomy/makes
     * @secure
     * @response `200` `TaxonomyMakeResponseDto` The taxonomy makes have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetTaxonomyMakes: (params: RequestParams = {}) =>
      this.http.request<TaxonomyMakeResponseDto, void>({
        path: `/search/taxonomy/makes`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetTaxonomyModel
     * @summary Get taxonomy model
     * @request GET:/search/taxonomy/model/{make}
     * @secure
     * @response `200` `TaxonomyModelResponseDto` The taxonomy model have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetTaxonomyModel: (
      make: string,
      params: RequestParams = {},
    ) =>
      this.http.request<TaxonomyModelResponseDto, void>({
        path: `/search/taxonomy/model/${make}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetTaxonomyTrims
     * @summary Get taxonomy trims
     * @request GET:/search/taxonomy/trims/{make}/{model}
     * @secure
     * @response `200` `TaxonomyTrimResponseDto` The taxonomy trims have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetTaxonomyTrims: (
      make: string,
      model: string,
      params: RequestParams = {},
    ) =>
      this.http.request<TaxonomyTrimResponseDto, void>({
        path: `/search/taxonomy/trims/${make}/${model}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetTaxonomyAttributes
     * @summary Get taxonomy attributes
     * @request GET:/search/taxonomy/attributes/{attributeClass}
     * @secure
     * @response `200` `TaxonomyAttributeResponseDto` The taxonomy attributes have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetTaxonomyAttributes: (
      attributeClass: string,
      params: RequestParams = {},
    ) =>
      this.http.request<TaxonomyAttributeResponseDto, void>({
        path: `/search/taxonomy/attributes/${attributeClass}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetGeoZipList
     * @summary Get geo zip list
     * @request GET:/search/geo/zip/list/{startWith}
     * @secure
     * @response `200` `(string)[]` The geo zip list have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetGeoZipList: (
      startWith: string,
      params: RequestParams = {},
    ) =>
      this.http.request<string[], void>({
        path: `/search/geo/zip/list/${startWith}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetGeoCityStateList
     * @summary Get geo city state list
     * @request GET:/search/geo/city-state/list/{contains}
     * @secure
     * @response `200` `(string)[]` The geo city state list have been successfully retrieved.
     * @response `400` `void` Invalid request body.
     * @response `401` `void` Unauthorized.
     * @response `403` `void` Forbidden.
     * @response `404` `void` Not found.
     * @response `500` `void` Internal server error.
     */
    searchControllerGetGeoCityStateList: (
      contains: string,
      params: RequestParams = {},
    ) =>
      this.http.request<string[], void>({
        path: `/search/geo/city-state/list/${contains}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetGeoZipResolve
     * @summary Resolve a zip code to city/state candidates
     * @request GET:/search/geo/zip/resolve/{zip}
     * @secure
     * @response `200` `(string)[]` Resolved geo list retrieved successfully.
     */
    searchControllerGetGeoZipResolve: (
      zip: string,
      params: RequestParams = {},
    ) =>
      this.http.request<string[], any>({
        path: `/search/geo/zip/resolve/${zip}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name SearchControllerGetGeoCityStateResolve
     * @summary Resolve city/state string to canonical candidates
     * @request GET:/search/geo/city-state/resolve
     * @secure
     * @response `200` `(string)[]` Resolved geo list retrieved successfully.
     */
    searchControllerGetGeoCityStateResolve: (
      query: {
        cityState: string;
        max: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<string[], any>({
        path: `/search/geo/city-state/resolve`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  pricing = {
    /**
     * No description
     *
     * @tags Pricing
     * @name PricingControllerGetVehiclePricing
     * @summary Compute pricing for a vehicle
     * @request GET:/pricing/vehicle/{vehicleId}
     * @secure
     * @response `200` `void`
     */
    pricingControllerGetVehiclePricing: (
      vehicleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/pricing/vehicle/${vehicleId}`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  home = {
    /**
     * No description
     *
     * @tags Home
     * @name HomeControllerGetHomeStats
     * @summary Get homepage stats (cached)
     * @request GET:/home/stats
     * @secure
     * @response `200` `void` Homepage stats totals (tenant-scoped).
     */
    homeControllerGetHomeStats: (params: RequestParams = {}) =>
      this.http.request<void, any>({
        path: `/home/stats`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Home
     * @name HomeControllerGetHomeSearchPills
     * @summary Get home search pills (proxy to tenant-search)
     * @request GET:/home/search-pills
     * @secure
     * @response `200` `void` Top saved searches rendered as search pills.
     */
    homeControllerGetHomeSearchPills: (
      query: {
        limit: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<void, any>({
        path: `/home/search-pills`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),
  };
}
