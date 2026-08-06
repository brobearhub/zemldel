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

export interface ApiValidationIssueDto {
  path: string[];
  message: string;
}

export interface ApiBadRequestErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface ApiUnauthorizedErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface ApiForbiddenErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface ApiNotFoundErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface ApiConflictErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface ApiValidationErrorResponseDto {
  /** @example 422 */
  statusCode?: number;
  /** @example "Validation failed" */
  error: string;
  issues: ApiValidationIssueDto[];
}

export interface ApiInternalServerErrorDto {
  /** @example 400 */
  statusCode?: number;
  /** @example "Bad Request" */
  error?: string;
  /** @example "Validation failed" */
  message?: string;
  issues?: ApiValidationIssueDto[];
}

export interface LoginDto {
  /** @example "user@example.com" */
  email: string;
  /**
   * @minLength 1
   * @example "correct horse battery staple"
   */
  password: string;
}

export interface AuthCityDto {
  /** @format uuid */
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
}

export interface AuthMembershipDto {
  /** @format uuid */
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerType: AuthMembershipDtoProviderTypeEnum;
  providerCity: AuthCityDto | null;
  role: AuthMembershipDtoRoleEnum;
  status: AuthMembershipDtoStatusEnum;
}

export interface AuthorizedUserDto {
  /** @format uuid */
  id: string;
  /** @example "user@example.com" */
  email: string;
  /** @example null */
  name: object | null;
  /** @example null */
  image: object | null;
  systemRole: AuthorizedUserDtoSystemRoleEnum;
  /**
   * @format uuid
   * @example null
   */
  activeProviderId: object | null;
  customerCity: AuthCityDto | null;
  memberships: AuthMembershipDto[];
  linkedAuthProviders: AuthorizedUserDtoLinkedAuthProvidersEnum[];
  /** @example {"GOSUSLUGI":"2026-06-14T12:00:00.000Z"} */
  stepUpVerifiedAt: Record<string, string>;
}

export interface AcceptedLegalVersionsDto {
  /** @example "2026-08-04" */
  terms: string;
  /** @example "2026-08-04" */
  privacy: string;
  /** @example "2026-08-04" */
  consent: string;
}

export interface SignupDto {
  /** @example "user@example.com" */
  email: string;
  /**
   * @minLength 6
   * @example "correct horse battery staple"
   */
  password: string;
  /** @example "Alice" */
  name?: string;
  /** @format uuid */
  customerCityId?: string;
  acceptedLegal: AcceptedLegalVersionsDto;
}

export interface LinkedAuthProvidersDto {
  linked: LinkedAuthProvidersDtoLinkedEnum[];
}

export interface ServiceCategoryDto {
  id: string;
  name: string;
  slug: string;
  /** @example null */
  parentId: object | null;
  /** @example null */
  sortOrder: object | null;
  placements: ServiceCategoryDtoPlacementsEnum[];
}

export interface CityRefDto {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
}

export interface ServiceProviderRefDto {
  id: string;
  name: string;
  city: CityRefDto | null;
}

export interface ServiceDto {
  id: string;
  categoryId: string;
  category: ServiceCategoryDto;
  status: ServiceDtoStatusEnum;
  title: string;
  /** @example null */
  image: object | null;
  /** @example null */
  stockBadge: object | null;
  price: string;
  /** @example null */
  rating: object | null;
  /** @example null */
  reviewCount: object | null;
  ctaText: string;
  /** @example null */
  ctaHref: object | null;
  /** @example null */
  description: object | null;
  /** @example null */
  highlight: object | null;
  /** @example null */
  badge: object | null;
  /** @example null */
  paletteColor: ServiceDtoPaletteColorEnum | null;
  /** @example null */
  icon: ServiceDtoIconEnum | null;
  provider: ServiceProviderRefDto;
}

export interface ServiceCreateDto {
  /** @minLength 1 */
  categoryId?: string;
  status?: ServiceCreateDtoStatusEnum;
  /** @minLength 1 */
  title?: string;
  /** @minLength 1 */
  price?: string;
  /** @minLength 1 */
  ctaText?: string;
  /** @example null */
  ctaHref?: object | null;
  /** @example null */
  image?: object | null;
  /** @example null */
  stockBadge?: object | null;
  /** @example null */
  rating?: object | null;
  /** @example null */
  reviewCount?: object | null;
  /** @example null */
  description?: object | null;
  /** @example null */
  highlight?: object | null;
  /** @example null */
  badge?: object | null;
  /** @example null */
  paletteColor?: ServiceCreateDtoPaletteColorEnum | null;
  /** @example null */
  icon?: ServiceCreateDtoIconEnum | null;
}

export interface ServicePatchDto {
  /** @minLength 1 */
  categoryId?: string;
  status?: ServicePatchDtoStatusEnum;
  /** @minLength 1 */
  title?: string;
  /** @minLength 1 */
  price?: string;
  /** @minLength 1 */
  ctaText?: string;
  /** @example null */
  ctaHref?: object | null;
  /** @example null */
  image?: object | null;
  /** @example null */
  stockBadge?: object | null;
  /** @example null */
  rating?: object | null;
  /** @example null */
  reviewCount?: object | null;
  /** @example null */
  description?: object | null;
  /** @example null */
  highlight?: object | null;
  /** @example null */
  badge?: object | null;
  /** @example null */
  paletteColor?: ServicePatchDtoPaletteColorEnum | null;
  /** @example null */
  icon?: ServicePatchDtoIconEnum | null;
}

export interface OkResponseDto {
  /** @example true */
  ok: boolean;
}

export interface CategoryProviderCityDto {
  /** @format uuid */
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
}

export interface CategoryProviderRefDto {
  /** @format uuid */
  id: string;
  name: string;
  city: CategoryProviderCityDto | null;
}

export interface CategoryProviderServiceDto {
  /** @format uuid */
  id: string;
  title: string;
  /** @example null */
  image: object | null;
  /** @example null */
  stockBadge: object | null;
  price: string;
  /** @example null */
  rating: object | null;
  /** @example null */
  reviewCount: object | null;
  ctaText: string;
  /** @example null */
  ctaHref: object | null;
  provider: CategoryProviderRefDto;
}

export interface ServiceCategoryCreateDto {
  /** @minLength 1 */
  name: string;
  /** @minLength 1 */
  slug: string;
  /** @example null */
  parentId?: object | null;
  /** @example null */
  sortOrder?: object | null;
  placements?: ServiceCategoryCreateDtoPlacementsEnum[];
}

export interface ServiceCategoryPatchDto {
  /** @minLength 1 */
  name?: string;
  /** @minLength 1 */
  slug?: string;
  /** @example null */
  parentId?: object | null;
  /** @example null */
  sortOrder?: object | null;
  placements?: ServiceCategoryPatchDtoPlacementsEnum[];
}

export interface RequestUnlinkedCreateDto {
  /**
   * @minLength 10
   * @example null
   */
  message?: object | null;
  /**
   * @minLength 2
   * @example null
   */
  location?: object | null;
  /**
   * @minLength 7
   * @example null
   */
  customerPhone?: object | null;
  /** @format uuid */
  requestCityId?: string;
}

export interface RequestCustomerOfferDto {
  /** @format uuid */
  providerId: string;
  status: RequestCustomerOfferDtoStatusEnum;
}

export interface RequestCustomerDto {
  /** @format uuid */
  id: string;
  subjectType: RequestCustomerDtoSubjectTypeEnum;
  status: RequestCustomerDtoStatusEnum;
  /** @format uuid */
  serviceId: object | null;
  /** @format uuid */
  categoryId: object | null;
  /** @format uuid */
  providerId: object | null;
  selectedProviderIds: string[];
  declinedProviderIds: string[];
  /** @example null */
  lastSelectionAt: object | null;
  offers: RequestCustomerOfferDto[];
  /** @format uuid */
  requestCityId: object | null;
  /** @example null */
  message: object | null;
  /** @example null */
  location: object | null;
  /** @example null */
  lockedAt: object | null;
  /** @example null */
  dealTerms: object | null;
  /** @example null */
  offerVersion: object | null;
  /** @example null */
  termsVersion: object | null;
  /** @example null */
  contractAcceptedAt: object | null;
  /** @example null */
  acceptanceRequestedAt: object | null;
  /** @example null */
  autoAcceptAt: object | null;
  /** @example null */
  acceptedAt: object | null;
  /** @example null */
  serviceTitle: object | null;
  /** @example null */
  providerName: object | null;
  /** @example null */
  customerName: object | null;
  /** @example null */
  customerEmail: object | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestCategoryCreateDto {
  /**
   * @minLength 3
   * @example null
   */
  message?: object | null;
  /**
   * @minLength 7
   * @example null
   */
  customerPhone?: object | null;
  /** @format uuid */
  requestCityId?: string;
}

export interface RequestServiceCreateDto {
  /** @example null */
  customerName?: object | null;
  /** @example null */
  customerEmail?: object | null;
  /** @example null */
  customerPhone?: object | null;
  /**
   * @minLength 3
   * @example null
   */
  message?: object | null;
  /** @format uuid */
  requestCityId?: string;
}

export interface RequestRemarkDto {
  /** @format uuid */
  id: string;
  /** @format uuid */
  requestId: string;
  authorSide: RequestRemarkDtoAuthorSideEnum;
  status: RequestRemarkDtoStatusEnum;
  text: string;
  createdAt: string;
  doneAt?: object | null;
  /** Когда замечание стало видимым другой стороне (null = черновик). */
  sentAt?: object | null;
}

export interface RequestRemarkCreateDto {
  /** @minLength 3 */
  text: string;
}

export interface RequestProDto {
  /** @format uuid */
  id: string;
  subjectType: RequestProDtoSubjectTypeEnum;
  status: RequestProDtoStatusEnum;
  /** @format uuid */
  serviceId: object | null;
  /** @example null */
  serviceTitle: object | null;
  /** @format uuid */
  categoryId: object | null;
  /** @example null */
  categoryName: object | null;
  /** @format uuid */
  providerId: object | null;
  /** @example null */
  offerStatus: RequestProDtoOfferStatusEnum | null;
  /** @example null */
  offerSelectedAt: object | null;
  /** @example null */
  offerDeclinedAt: object | null;
  /** @format uuid */
  requestCityId: object | null;
  /** @example null */
  message: object | null;
  /** @example null */
  location: object | null;
  /** @example null */
  lockedAt: object | null;
  /** @example null */
  dealTerms: object | null;
  /** @example null */
  offerVersion: object | null;
  /** @example null */
  termsVersion: object | null;
  /** @example null */
  contractAcceptedAt: object | null;
  /** @example null */
  acceptanceRequestedAt: object | null;
  /** @example null */
  autoAcceptAt: object | null;
  /** @example null */
  acceptedAt: object | null;
  conversationsCount: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProEligibleCategoryDto {
  /** @format uuid */
  id: string;
  name: string;
  slug: string;
}

export interface ProInboxSettingsDto {
  status: ProInboxSettingsDtoStatusEnum;
  /**
   * @format uuid
   * @example null
   */
  categoryId: object | null;
  dialogScope: ProInboxSettingsDtoDialogScopeEnum;
}

export interface ProInboxSettingsUpdateDto {
  status?: ProInboxSettingsUpdateDtoStatusEnum;
  /**
   * @format uuid
   * @example null
   */
  categoryId?: object | null;
  dialogScope?: ProInboxSettingsUpdateDtoDialogScopeEnum;
}

export interface UserListItemDto {
  /** @format uuid */
  id: string;
  /** @example "user@example.com" */
  email: string;
  /** @example null */
  name: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface CreateUserDto {
  /** @example "user@example.com" */
  email: string;
  /**
   * @minLength 1
   * @example "Alice"
   */
  name?: string;
}

export interface UserMeProfileDto {
  /** @format uuid */
  id: string;
  /**
   * @format uuid
   * @example null
   */
  customerCityId: object | null;
  customerCity: AuthCityDto | null;
  /** @format date-time */
  updatedAt: string;
}

export interface UserImageDto {
  /** @format uuid */
  id: string;
  /** @example null */
  image: object | null;
  /** @format date-time */
  updatedAt: string;
}

export interface CreateProviderDto {
  /**
   * @minLength 2
   * @example "ACME Services"
   */
  name: string;
  /**
   * @minLength 2
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   * @example "acme-services"
   */
  slug?: string;
  type: CreateProviderDtoTypeEnum;
  /** @format uuid */
  cityId?: string;
  /**
   * @pattern ^\d{4}-\d{2}-\d{2}$
   * @example "2026-08-04"
   */
  offerVersion: string;
}

export interface ProviderSlugCheckDto {
  available: boolean;
}

export interface ProviderDto {
  /** @format uuid */
  id: string;
  name: string;
  slug: string;
  type: ProviderDtoTypeEnum;
  /** @format uuid */
  ownerUserId: string;
  /**
   * @format uuid
   * @example null
   */
  cityId: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface ProviderMembershipListItemDto {
  role: ProviderMembershipListItemDtoRoleEnum;
  status: ProviderMembershipListItemDtoStatusEnum;
  provider: ProviderDto;
}

export interface ProviderActivateResponseDto {
  /** @format uuid */
  id: string;
  /** @example "user@example.com" */
  email: string;
  /** @example null */
  name: object | null;
  /** @example null */
  image: object | null;
  systemRole: ProviderActivateResponseDtoSystemRoleEnum;
  /**
   * @format uuid
   * @example null
   */
  activeProviderId: object | null;
  customerCity: AuthCityDto | null;
  memberships: AuthMembershipDto[];
  linkedAuthProviders: ProviderActivateResponseDtoLinkedAuthProvidersEnum[];
  /** @example {"GOSUSLUGI":"2026-06-14T12:00:00.000Z"} */
  stepUpVerifiedAt: Record<string, string>;
}

export interface ProviderMemberUserDto {
  /** @format uuid */
  id: string;
  /** @example "user@example.com" */
  email: string;
  /** @example null */
  name: object | null;
  /** @example null */
  image: object | null;
}

export interface ProviderMemberDto {
  /** @format uuid */
  id: string;
  role: ProviderMemberDtoRoleEnum;
  status: ProviderMemberDtoStatusEnum;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
  user: ProviderMemberUserDto;
}

export interface ProviderMembersResponseDto {
  /** @format uuid */
  id: string;
  name: string;
  slug: string;
  type: ProviderMembersResponseDtoTypeEnum;
  members: ProviderMemberDto[];
}

export interface AddProviderManagerDto {
  /** @example "manager@example.com" */
  email: string;
}

export interface ProviderSlugUpdateResponseDto {
  /** @format uuid */
  id: string;
  slug: string;
}

export interface ProviderCityUpdateResponseDto {
  /** @format uuid */
  id: string;
  /**
   * @format uuid
   * @example null
   */
  cityId: object | null;
  city: AuthCityDto | null;
  /** @format date-time */
  updatedAt: string;
}

export interface ServiceRequestConversationListItemDto {
  /** @format uuid */
  conversationId: string;
  /** @format uuid */
  providerId: string;
  providerName: string;
  /**
   * @format date-time
   * @example null
   */
  lastMessageAt: object | null;
  /** @example null */
  lastSnippet: object | null;
}

export interface ChatEnsureBodyDto {
  /** @format uuid */
  serviceRequestId?: string;
}

export interface ChatRepliedToDto {
  /** @format uuid */
  id: string;
  /** @format uuid */
  senderUserId: string;
  /** @example null */
  senderName: object | null;
  bodySnippet: string;
}

export interface ChatMessageDto {
  /** @format uuid */
  id: string;
  /** @format uuid */
  conversationId: string;
  /** @format uuid */
  senderUserId: string;
  /** @example null */
  senderName: object | null;
  body: string;
  /** @format uuid */
  clientMessageId: string;
  /** @format date-time */
  createdAt: string;
  repliedTo?: ChatRepliedToDto;
}

export interface ChatEnsureResponseDto {
  /** @format uuid */
  conversationId: string;
  messages: ChatMessageDto[];
}

export interface ChatConversationAccessDto {
  /** @example true */
  canRead: boolean;
  canWrite: boolean;
  reason?: string;
}

export interface ChatPostMessageBodyDto {
  /**
   * @minLength 1
   * @example "Hello!"
   */
  body: string;
  /** @format uuid */
  clientMessageId: string;
  /** @format uuid */
  replyToMessageId?: string;
}

export interface ChatPostMessageResponseDto {
  message: ChatMessageDto;
  alreadyExisted: boolean;
}

export interface ChatMarkReadResponseDto {
  /** @example true */
  ok: boolean;
  /** @format date-time */
  lastReadAt: string;
}

export interface CitySuggestItemDto {
  /** @format uuid */
  id: string;
  name: string;
  /** @example "77" */
  regionCode: string;
  /** @example "Moscow" */
  regionName: string;
  /** @example "Moscow, 77" */
  displayName: string;
}

export interface PassportDto {
  /**
   * @pattern ^\d{4}$
   * @example "1234"
   */
  series: string;
  /**
   * @pattern ^\d{6}$
   * @example "567890"
   */
  number: string;
  /** @example null */
  issuedBy: object | null;
  /**
   * @format date
   * @example null
   */
  issuedAt: object | null;
  /** @example null */
  departmentCode: object | null;
  /** @example null */
  registrationAddress: object | null;
  /** @example null */
  fullName: object | null;
  /**
   * @format date
   * @example null
   */
  birthDate: object | null;
}

export interface ContractFileItemDto {
  /** @format uuid */
  id: string;
  status: ContractFileItemDtoStatusEnum;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** @example null */
  sha256: object | null;
  /** @example null */
  revisionMessage: object | null;
  /**
   * @format date-time
   * @example null
   */
  decidedAt: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface ContractFilesUploadResponseDto {
  created: {
    /** @format uuid */
    id: string;
  }[];
}

export interface ContractBundleFileDto {
  /** @format uuid */
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** @example null */
  sha256: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface ContractBundleItemDto {
  /** @format uuid */
  bundleId: string;
  status: ContractBundleItemDtoStatusEnum;
  /** @example null */
  revisionMessage: object | null;
  /**
   * @format date-time
   * @example null
   */
  decidedAt: object | null;
  document: ContractBundleFileDto;
  signature: ContractBundleFileDto | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface RequestDocumentRequestItemDto {
  /** @format uuid */
  id: string;
  /** @example "Паспорт (скан)" */
  title: string;
  status: RequestDocumentRequestItemDtoStatusEnum;
  /** @example null */
  originalName: object | null;
  /** @example null */
  mimeType: object | null;
  /** @example null */
  sizeBytes: object | null;
  /** @example null */
  sha256: object | null;
  /**
   * @format date-time
   * @example null
   */
  uploadedAt: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export interface CreateRequestDocumentRequestDto {
  /** @example "Паспорт (скан)" */
  title: string;
}

export interface ReminderServiceTitleDto {
  title: string;
}

export interface ReminderCategoryNameDto {
  name: string;
}

export interface ReminderRequestSummaryDto {
  /** @format uuid */
  id: string;
  /** @example null */
  message: object | null;
  /** @example null */
  location: object | null;
  service: ReminderServiceTitleDto | null;
  category: ReminderCategoryNameDto | null;
}

export interface ReminderDto {
  /** @format uuid */
  id: string;
  /** @format uuid */
  requestId: string;
  /** @format uuid */
  providerId: string;
  text: string;
  /** @format date-time */
  remindAt: string;
  isDone: boolean;
  /**
   * @format date-time
   * @example null
   */
  doneAt: object | null;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
  request: ReminderRequestSummaryDto;
}

export interface CreateReminderDto {
  /**
   * @minLength 1
   * @maxLength 500
   * @example "Call the provider"
   */
  text: string;
  /**
   * @format date-time
   * @example "2026-06-14T12:00:00.000Z"
   */
  remindAt: string;
}

export interface UpdateReminderDto {
  /**
   * @minLength 1
   * @maxLength 500
   * @example "Call the provider"
   */
  text?: string;
  /**
   * @format date-time
   * @example "2026-06-14T12:00:00.000Z"
   */
  remindAt?: string;
  /** @example true */
  isDone?: boolean;
}

export enum AuthMembershipDtoProviderTypeEnum {
  SELF_EMPLOYED = "SELF_EMPLOYED",
  COMPANY = "COMPANY",
}

export enum AuthMembershipDtoRoleEnum {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
}

export enum AuthMembershipDtoStatusEnum {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum AuthorizedUserDtoSystemRoleEnum {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  CUSTOMER = "CUSTOMER",
}

export enum AuthorizedUserDtoLinkedAuthProvidersEnum {
  GOSUSLUGI = "GOSUSLUGI",
}

export enum LinkedAuthProvidersDtoLinkedEnum {
  GOSUSLUGI = "GOSUSLUGI",
}

export enum ServiceCategoryDtoPlacementsEnum {
  HOME = "HOME",
}

export enum ServiceDtoStatusEnum {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

/** @example null */
export enum ServiceDtoPaletteColorEnum {
  Primary = "primary",
  Secondary = "secondary",
  Info = "info",
  Success = "success",
  Warning = "warning",
  Error = "error",
}

/** @example null */
export enum ServiceDtoIconEnum {
  Map = "map",
  Electric = "electric",
  Architecture = "architecture",
}

export enum ServiceCreateDtoStatusEnum {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

/** @example null */
export enum ServiceCreateDtoPaletteColorEnum {
  Primary = "primary",
  Secondary = "secondary",
  Info = "info",
  Success = "success",
  Warning = "warning",
  Error = "error",
}

/** @example null */
export enum ServiceCreateDtoIconEnum {
  Map = "map",
  Electric = "electric",
  Architecture = "architecture",
}

export enum ServicePatchDtoStatusEnum {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

/** @example null */
export enum ServicePatchDtoPaletteColorEnum {
  Primary = "primary",
  Secondary = "secondary",
  Info = "info",
  Success = "success",
  Warning = "warning",
  Error = "error",
}

/** @example null */
export enum ServicePatchDtoIconEnum {
  Map = "map",
  Electric = "electric",
  Architecture = "architecture",
}

export enum ServiceCategoryCreateDtoPlacementsEnum {
  HOME = "HOME",
}

export enum ServiceCategoryPatchDtoPlacementsEnum {
  HOME = "HOME",
}

export enum RequestCustomerOfferDtoStatusEnum {
  SELECTED = "SELECTED",
  DECLINED = "DECLINED",
}

export enum RequestCustomerDtoSubjectTypeEnum {
  FREEFORM = "FREEFORM",
  CATEGORY = "CATEGORY",
  SERVICE = "SERVICE",
}

export enum RequestCustomerDtoStatusEnum {
  NEW = "NEW",
  DISCUSSING = "DISCUSSING",
  TERMS_AGREED = "TERMS_AGREED",
  ACTIVE = "ACTIVE",
  ACCEPTANCE_PENDING = "ACCEPTANCE_PENDING",
  ACCEPTED = "ACCEPTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED",
}

export enum RequestRemarkDtoAuthorSideEnum {
  CUSTOMER = "CUSTOMER",
  PROVIDER = "PROVIDER",
}

export enum RequestRemarkDtoStatusEnum {
  OPEN = "OPEN",
  DONE = "DONE",
}

export enum RequestProDtoSubjectTypeEnum {
  FREEFORM = "FREEFORM",
  CATEGORY = "CATEGORY",
  SERVICE = "SERVICE",
}

export enum RequestProDtoStatusEnum {
  NEW = "NEW",
  DISCUSSING = "DISCUSSING",
  TERMS_AGREED = "TERMS_AGREED",
  ACTIVE = "ACTIVE",
  ACCEPTANCE_PENDING = "ACCEPTANCE_PENDING",
  ACCEPTED = "ACCEPTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED",
}

/** @example null */
export enum RequestProDtoOfferStatusEnum {
  SELECTED = "SELECTED",
  DECLINED = "DECLINED",
}

export enum ProInboxSettingsDtoStatusEnum {
  NEW = "NEW",
  DISCUSSING = "DISCUSSING",
}

export enum ProInboxSettingsDtoDialogScopeEnum {
  ACTIVE = "ACTIVE",
  ARCHIVE = "ARCHIVE",
}

export enum ProInboxSettingsUpdateDtoStatusEnum {
  NEW = "NEW",
  DISCUSSING = "DISCUSSING",
}

export enum ProInboxSettingsUpdateDtoDialogScopeEnum {
  ACTIVE = "ACTIVE",
  ARCHIVE = "ARCHIVE",
}

export enum CreateProviderDtoTypeEnum {
  SELF_EMPLOYED = "SELF_EMPLOYED",
  COMPANY = "COMPANY",
}

export enum ProviderDtoTypeEnum {
  SELF_EMPLOYED = "SELF_EMPLOYED",
  COMPANY = "COMPANY",
}

export enum ProviderMembershipListItemDtoRoleEnum {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
}

export enum ProviderMembershipListItemDtoStatusEnum {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum ProviderActivateResponseDtoSystemRoleEnum {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  CUSTOMER = "CUSTOMER",
}

export enum ProviderActivateResponseDtoLinkedAuthProvidersEnum {
  GOSUSLUGI = "GOSUSLUGI",
}

export enum ProviderMemberDtoRoleEnum {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
}

export enum ProviderMemberDtoStatusEnum {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum ProviderMembersResponseDtoTypeEnum {
  SELF_EMPLOYED = "SELF_EMPLOYED",
  COMPANY = "COMPANY",
}

export enum ContractFileItemDtoStatusEnum {
  PENDING_CUSTOMER = "PENDING_CUSTOMER",
  APPROVED = "APPROVED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
}

export enum ContractBundleItemDtoStatusEnum {
  PENDING_CUSTOMER = "PENDING_CUSTOMER",
  APPROVED = "APPROVED",
  REVISION_REQUESTED = "REVISION_REQUESTED",
}

export enum RequestDocumentRequestItemDtoStatusEnum {
  REQUESTED = "REQUESTED",
  UPLOADED = "UPLOADED",
}

export enum ServiceCategoriesControllerGetPublicCategoriesParamsPlacementEnum {
  HOME = "HOME",
}

export namespace LegalDocs {
  /**
 * No description
 * @tags legal-docs
 * @name LegalDocsControllerGetCurrent
 * @request GET:/legal-docs/{docId}/current
 * @response `200` `{
    id: string,
    version: string,
    title: string,
    markdown: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
*/
  export namespace LegalDocsControllerGetCurrent {
    export type RequestParams = {
      docId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = {
      id: string;
      version: string;
      title: string;
      markdown: string;
    };
  }
}

export namespace Auth {
  /**
   * No description
   * @tags auth
   * @name AuthControllerLogin
   * @request POST:/auth/login
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerLogin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LoginDto;
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerSignup
   * @request POST:/auth/signup
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerSignup {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SignupDto;
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerGetContext
   * @request GET:/auth/context
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerGetContext {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerListLinkedProviders
   * @request GET:/auth/providers
   * @response `200` `LinkedAuthProvidersDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerListLinkedProviders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LinkedAuthProvidersDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerLinkGosuslugi
   * @request POST:/auth/providers/gosuslugi/link
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerLinkGosuslugi {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      externalSubject: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerUnlinkGosuslugi
   * @request POST:/auth/providers/gosuslugi/unlink
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerUnlinkGosuslugi {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }

  /**
   * No description
   * @tags auth
   * @name AuthControllerVerifyGosuslugiStepUp
   * @request POST:/auth/step-up/gosuslugi/verify
   * @response `200` `AuthorizedUserDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace AuthControllerVerifyGosuslugiStepUp {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      externalSubject: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = AuthorizedUserDto;
  }
}

export namespace Services {
  /**
   * No description
   * @tags services
   * @name ServicesControllerGetPublicServices
   * @request GET:/services
   * @response `200` `(ServiceDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetPublicServices {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto[];
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerGetPublicServiceById
   * @request GET:/services/{id}
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Service not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetPublicServiceById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCreateFromService
   * @request POST:/services/{id}/requests
   * @response `201` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCreateFromService {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RequestServiceCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }
}

export namespace Admin {
  /**
   * No description
   * @tags services
   * @name ServicesControllerGetAdminServices
   * @request GET:/admin/services
   * @response `200` `(ServiceDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetAdminServices {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto[];
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerCreateAdminService
   * @request POST:/admin/services
   * @response `201` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerCreateAdminService {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ServiceCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerGetAdminServiceById
   * @request GET:/admin/services/{id}
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Service not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetAdminServiceById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerUpdateAdminService
   * @request PATCH:/admin/services/{id}
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerUpdateAdminService {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ServicePatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerDeleteAdminService
   * @request DELETE:/admin/services/{id}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerDeleteAdminService {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerGetAdminCategories
   * @request GET:/admin/service-categories
   * @response `200` `(ServiceCategoryDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerGetAdminCategories {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceCategoryDto[];
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerCreateAdminCategory
   * @request POST:/admin/service-categories
   * @response `201` `ServiceCategoryDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerCreateAdminCategory {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ServiceCategoryCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceCategoryDto;
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerPatchAdminCategory
   * @request PATCH:/admin/service-categories/{id}
   * @response `200` `ServiceCategoryDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Category not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerPatchAdminCategory {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ServiceCategoryPatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceCategoryDto;
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerDeleteAdminCategory
   * @request DELETE:/admin/service-categories/{id}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerDeleteAdminCategory {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerGetAdminRequests
   * @request GET:/admin/requests
   * @response `200` `(RequestCustomerDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerGetAdminRequests {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto[];
  }
}

export namespace Pro {
  /**
   * No description
   * @tags services
   * @name ServicesControllerGetProServices
   * @request GET:/pro/services
   * @response `200` `(ServiceDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetProServices {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto[];
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerCreateProService
   * @request POST:/pro/services
   * @response `201` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerCreateProService {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ServiceCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerGetProServiceById
   * @request GET:/pro/services/{id}
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Service not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerGetProServiceById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerUpdateProService
   * @request PATCH:/pro/services/{id}
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerUpdateProService {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ServicePatchDto;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerDeleteProService
   * @request DELETE:/pro/services/{id}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerDeleteProService {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerUploadProServiceImage
   * @request POST:/pro/services/{id}/image
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerUploadProServiceImage {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format binary */
      file: File;
    };
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags services
   * @name ServicesControllerDeleteProServiceImage
   * @request DELETE:/pro/services/{id}/image
   * @response `200` `ServiceDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServicesControllerDeleteProServiceImage {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProFeed
   * @request GET:/pro/requests/feed
   * @response `200` `(RequestProDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProFeed {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestProDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProInbox
   * @request GET:/pro/requests/inbox
   * @response `200` `(RequestProDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProInbox {
    export type RequestParams = {};
    export type RequestQuery = {
      dialogScope?: string;
      categoryId?: string;
      status?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestProDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerEligibleCategories
   * @request GET:/pro/requests/eligible-categories
   * @response `200` `(ProEligibleCategoryDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerEligibleCategories {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProEligibleCategoryDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerGetInboxSettings
   * @request GET:/pro/inbox-settings
   * @response `200` `ProInboxSettingsDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerGetInboxSettings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProInboxSettingsDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerSetInboxSettings
   * @request PUT:/pro/inbox-settings
   * @response `200` `ProInboxSettingsDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerSetInboxSettings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ProInboxSettingsUpdateDto;
    export type RequestHeaders = {};
    export type ResponseBody = ProInboxSettingsDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProById
   * @request GET:/pro/requests/{id}
   * @response `200` `RequestProDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Request not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestProDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProSetTerms
   * @request POST:/pro/requests/{id}/set-terms
   * @response `200` `RequestProDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProSetTerms {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      dealTerms: Record<string, any>;
    };
    export type RequestHeaders = {};
    export type ResponseBody = RequestProDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProDeclineOffer
   * @request POST:/pro/requests/{id}/decline-offer
   * @response `200` `RequestProDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProDeclineOffer {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestProDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerListProRemarks
   * @request GET:/pro/requests/{id}/remarks
   * @response `200` `(RequestRemarkDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerListProRemarks {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCreateProRemark
   * @request POST:/pro/requests/{id}/remarks
   * @response `200` `RequestRemarkDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCreateProRemark {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RequestRemarkCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCompleteProRemark
   * @request POST:/pro/requests/{id}/remarks/{remarkId}/complete
   * @response `200` `RequestRemarkDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCompleteProRemark {
    export type RequestParams = {
      id: string;
      remarkId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerGetProOrders
   * @request GET:/pro/requests
   * @response `200` `(RequestCustomerDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerGetProOrders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerGetProOrderById
   * @request GET:/pro/requests/by-id/{id}
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerGetProOrderById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProStartWork
   * @request POST:/pro/requests/{id}/start-work
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProStartWork {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProMarkRendered
   * @request POST:/pro/requests/{id}/mark-rendered
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProMarkRendered {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProRequestAcceptance
   * @request POST:/pro/requests/{id}/request-acceptance
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProRequestAcceptance {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerProComplete
   * @request POST:/pro/requests/{id}/complete
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerProComplete {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags documents
   * @name DocumentsControllerGetPassportForProvider
   * @request GET:/pro/requests/{id}/passport
   * @response `200` `PassportDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace DocumentsControllerGetPassportForProvider {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PassportDto;
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerListForProvider
   * @request GET:/pro/requests/{requestId}/contract-files
   * @response `200` `(ContractFileItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerListForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ContractFileItemDto[];
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerUploadForProvider
   * @request POST:/pro/requests/{requestId}/contract-files
   * @response `200` `ContractFilesUploadResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerUploadForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      files: File[];
    };
    export type RequestHeaders = {};
    export type ResponseBody = ContractFilesUploadResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerListMiscForProvider
   * @request GET:/pro/requests/{requestId}/provider-misc
   * @response `200` `(ContractFileItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerListMiscForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ContractFileItemDto[];
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerUploadMiscForProvider
   * @request POST:/pro/requests/{requestId}/provider-misc
   * @response `200` `ContractFilesUploadResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerUploadMiscForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      files: File[];
    };
    export type RequestHeaders = {};
    export type ResponseBody = ContractFilesUploadResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerListBundlesForProvider
   * @request GET:/pro/requests/{requestId}/contract-bundles
   * @response `200` `(ContractBundleItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerListBundlesForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ContractBundleItemDto[];
  }

  /**
 * No description
 * @tags ContractFiles, contract-files
 * @name ContractFilesControllerUploadBundleForProvider
 * @request POST:/pro/requests/{requestId}/contract-bundles
 * @response `200` `{
  /** @format uuid *\/
    bundleId: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
*/
  export namespace ContractFilesControllerUploadBundleForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format binary */
      document: File;
      /** @format binary */
      signature: File;
    };
    export type RequestHeaders = {};
    export type ResponseBody = {
      /** @format uuid */
      bundleId: string;
    };
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerDeleteBundleForProvider
   * @request DELETE:/pro/requests/{requestId}/contract-bundles/{bundleId}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerDeleteBundleForProvider {
    export type RequestParams = {
      requestId: string;
      bundleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerDownloadProvider
   * @request GET:/pro/contract-files/{fileId}/download
   * @response `200` `File`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerDownloadProvider {
    export type RequestParams = {
      fileId: string;
    };
    export type RequestQuery = {
      inline?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerDeleteProvider
   * @request DELETE:/pro/contract-files/{fileId}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerDeleteProvider {
    export type RequestParams = {
      fileId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerListForProvider
   * @request GET:/pro/requests/{requestId}/document-requests
   * @response `200` `(RequestDocumentRequestItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerListForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestDocumentRequestItemDto[];
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerCreateForProvider
   * @request POST:/pro/requests/{requestId}/document-requests
   * @response `200` `RequestDocumentRequestItemDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerCreateForProvider {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CreateRequestDocumentRequestDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestDocumentRequestItemDto;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerDeleteForProvider
   * @request DELETE:/pro/requests/{requestId}/document-requests/{docRequestId}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerDeleteForProvider {
    export type RequestParams = {
      requestId: string;
      docRequestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerDownloadProvider
   * @request GET:/pro/document-requests/{docRequestId}/download
   * @response `200` `File`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerDownloadProvider {
    export type RequestParams = {
      docRequestId: string;
    };
    export type RequestQuery = {
      inline?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerListAll
   * @request GET:/pro/reminders
   * @response `200` `(ReminderDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerListAll {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto[];
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerListToday
   * @request GET:/pro/reminders/today
   * @response `200` `(ReminderDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerListToday {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto[];
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerListWorkday
   * @request GET:/pro/reminders/workday
   * @response `200` `(ReminderDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerListWorkday {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto[];
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerListForRequest
   * @request GET:/pro/requests/{requestId}/reminders
   * @response `200` `(ReminderDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerListForRequest {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto[];
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerCreate
   * @request POST:/pro/requests/{requestId}/reminders
   * @response `200` `ReminderDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerCreate {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = CreateReminderDto;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto;
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerUpdate
   * @request PATCH:/pro/reminders/{id}
   * @response `200` `ReminderDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerUpdate {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateReminderDto;
    export type RequestHeaders = {};
    export type ResponseBody = ReminderDto;
  }

  /**
   * No description
   * @tags reminders
   * @name RemindersControllerDelete
   * @request DELETE:/pro/reminders/{id}
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RemindersControllerDelete {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }
}

export namespace ServiceCategories {
  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerGetPublicCategories
   * @request GET:/service-categories
   * @response `200` `(ServiceCategoryDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerGetPublicCategories {
    export type RequestParams = {};
    export type RequestQuery = {
      placement?: ServiceCategoriesControllerGetPublicCategoriesParamsPlacementEnum;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceCategoryDto[];
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerGetPublicCategoryById
   * @request GET:/service-categories/{id}
   * @response `200` `ServiceCategoryDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Category not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerGetPublicCategoryById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceCategoryDto;
  }

  /**
   * No description
   * @tags service-categories
   * @name ServiceCategoriesControllerGetProvidersForCategory
   * @request GET:/service-categories/{id}/providers
   * @response `200` `(CategoryProviderServiceDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Category not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ServiceCategoriesControllerGetProvidersForCategory {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CategoryProviderServiceDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCreateFromCategory
   * @request POST:/service-categories/{id}/requests
   * @response `201` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCreateFromCategory {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RequestCategoryCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }
}

export namespace Requests {
  /**
   * No description
   * @tags requests
   * @name RequestsControllerCreateUnlinked
   * @request POST:/requests
   * @response `201` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCreateUnlinked {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = RequestUnlinkedCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerListMine
   * @request GET:/requests/mine
   * @response `200` `(RequestCustomerDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerListMine {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerMineById
   * @request GET:/requests/mine/{id}
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Request not found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerMineById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCustomerInitiateOrder
   * @request POST:/requests/mine/{id}/initiate-order
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCustomerInitiateOrder {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      conversationId: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCustomerAcceptTerms
   * @request POST:/requests/mine/{id}/accept-terms
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCustomerAcceptTerms {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCustomerSelectProvider
   * @request POST:/requests/mine/{id}/select-provider
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCustomerSelectProvider {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format uuid */
      providerId: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCustomerAcceptContract
   * @request POST:/requests/mine/{id}/accept-contract
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCustomerAcceptContract {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      termsVersion: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerAcceptResult
   * @request POST:/requests/mine/{id}/accept-result
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerAcceptResult {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerSendRemarks
   * @request POST:/requests/mine/{id}/send-remarks
   * @response `200` `RequestCustomerDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerSendRemarks {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @minLength 3 */
      remarks?: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = RequestCustomerDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerListMineRemarks
   * @request GET:/requests/mine/{id}/remarks
   * @response `200` `(RequestRemarkDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerListMineRemarks {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto[];
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCreateMineRemark
   * @request POST:/requests/mine/{id}/remarks
   * @response `200` `RequestRemarkDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCreateMineRemark {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RequestRemarkCreateDto;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto;
  }

  /**
   * No description
   * @tags requests
   * @name RequestsControllerCompleteMineRemark
   * @request POST:/requests/mine/{id}/remarks/{remarkId}/complete
   * @response `200` `RequestRemarkDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestsControllerCompleteMineRemark {
    export type RequestParams = {
      id: string;
      remarkId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestRemarkDto;
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerListBundlesForCustomer
   * @request GET:/requests/mine/{requestId}/contract-bundles
   * @response `200` `(ContractBundleItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerListBundlesForCustomer {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ContractBundleItemDto[];
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerApproveBundle
   * @request POST:/requests/mine/{requestId}/contract-bundles/{bundleId}/approve
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerApproveBundle {
    export type RequestParams = {
      requestId: string;
      bundleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles, contract-files
   * @name ContractFilesControllerRequestBundleRevision
   * @request POST:/requests/mine/{requestId}/contract-bundles/{bundleId}/revision
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerRequestBundleRevision {
    export type RequestParams = {
      requestId: string;
      bundleId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @minLength 3 */
      message: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerListForCustomer
   * @request GET:/requests/mine/{requestId}/contract-files
   * @response `200` `(ContractFileItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerListForCustomer {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ContractFileItemDto[];
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerApprove
   * @request POST:/requests/mine/{requestId}/contract-files/{fileId}/approve
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerApprove {
    export type RequestParams = {
      requestId: string;
      fileId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerRequestRevision
   * @request POST:/requests/mine/{requestId}/contract-files/{fileId}/revision
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerRequestRevision {
    export type RequestParams = {
      requestId: string;
      fileId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @minLength 3 */
      message: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags ContractFiles
   * @name ContractFilesControllerDownloadCustomer
   * @request GET:/requests/mine/{requestId}/contract-files/{fileId}/download
   * @response `200` `File`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ContractFilesControllerDownloadCustomer {
    export type RequestParams = {
      requestId: string;
      fileId: string;
    };
    export type RequestQuery = {
      inline?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerListForCustomer
   * @request GET:/requests/mine/{requestId}/document-requests
   * @response `200` `(RequestDocumentRequestItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerListForCustomer {
    export type RequestParams = {
      requestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RequestDocumentRequestItemDto[];
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerUploadForCustomer
   * @request POST:/requests/mine/{requestId}/document-requests/{docRequestId}/upload
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerUploadForCustomer {
    export type RequestParams = {
      requestId: string;
      docRequestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format binary */
      file: File;
    };
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerDeleteFileForCustomer
   * @request DELETE:/requests/mine/{requestId}/document-requests/{docRequestId}/file
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerDeleteFileForCustomer {
    export type RequestParams = {
      requestId: string;
      docRequestId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
  }

  /**
   * No description
   * @tags request-document-requests
   * @name RequestDocumentRequestsControllerDownloadCustomer
   * @request GET:/requests/mine/{requestId}/document-requests/{docRequestId}/download
   * @response `200` `File`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace RequestDocumentRequestsControllerDownloadCustomer {
    export type RequestParams = {
      requestId: string;
      docRequestId: string;
    };
    export type RequestQuery = {
      inline?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }
}

export namespace Users {
  /**
   * No description
   * @tags users
   * @name UsersControllerGetUsers
   * @request GET:/users
   * @response `200` `(UserListItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace UsersControllerGetUsers {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UserListItemDto[];
  }

  /**
   * No description
   * @tags users
   * @name UsersControllerCreateUser
   * @request POST:/users
   * @response `201` `UserListItemDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace UsersControllerCreateUser {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateUserDto;
    export type RequestHeaders = {};
    export type ResponseBody = UserListItemDto;
  }

  /**
   * No description
   * @tags users
   * @name UsersControllerUpdateMe
   * @request PATCH:/users/me
   * @response `200` `UserMeProfileDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace UsersControllerUpdateMe {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format uuid */
      customerCityId?: string | null;
    };
    export type RequestHeaders = {};
    export type ResponseBody = UserMeProfileDto;
  }

  /**
   * No description
   * @tags users
   * @name UsersControllerUploadMyImage
   * @request POST:/users/me/image
   * @response `200` `UserImageDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace UsersControllerUploadMyImage {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format binary */
      file: File;
    };
    export type RequestHeaders = {};
    export type ResponseBody = UserImageDto;
  }

  /**
   * No description
   * @tags users
   * @name UsersControllerDeleteMyImage
   * @request DELETE:/users/me/image
   * @response `200` `UserImageDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace UsersControllerDeleteMyImage {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UserImageDto;
  }
}

export namespace Providers {
  /**
 * No description
 * @tags providers
 * @name ProvidersControllerCreateProvider
 * @request POST:/providers
 * @response `201` `{
    provider: ProviderDto,
    authContext: AuthorizedUserDto,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
*/
  export namespace ProvidersControllerCreateProvider {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateProviderDto;
    export type RequestHeaders = {};
    export type ResponseBody = {
      provider: ProviderDto;
      authContext: AuthorizedUserDto;
    };
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerCheckSlugAvailability
   * @request GET:/providers/slug-check
   * @response `200` `ProviderSlugCheckDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerCheckSlugAvailability {
    export type RequestParams = {};
    export type RequestQuery = {
      slug: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProviderSlugCheckDto;
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerGetMyProviders
   * @request GET:/providers/mine
   * @response `200` `(ProviderMembershipListItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerGetMyProviders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProviderMembershipListItemDto[];
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerActivateProvider
   * @request POST:/providers/{providerId}/activate
   * @response `200` `ProviderActivateResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerActivateProvider {
    export type RequestParams = {
      providerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProviderActivateResponseDto;
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerGetProviderMembers
   * @request GET:/providers/{providerId}/members
   * @response `200` `ProviderMembersResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerGetProviderMembers {
    export type RequestParams = {
      providerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProviderMembersResponseDto;
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerAddProviderManager
   * @request POST:/providers/{providerId}/members
   * @response `201` `ProviderMemberDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerAddProviderManager {
    export type RequestParams = {
      providerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AddProviderManagerDto;
    export type RequestHeaders = {};
    export type ResponseBody = ProviderMemberDto;
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerUpdateProviderSlug
   * @request PATCH:/providers/{providerId}/slug
   * @response `200` `ProviderSlugUpdateResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerUpdateProviderSlug {
    export type RequestParams = {
      providerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      slug: string;
    };
    export type RequestHeaders = {};
    export type ResponseBody = ProviderSlugUpdateResponseDto;
  }

  /**
   * No description
   * @tags providers
   * @name ProvidersControllerUpdateProviderCity
   * @request PATCH:/providers/{providerId}/city
   * @response `200` `ProviderCityUpdateResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ProvidersControllerUpdateProviderCity {
    export type RequestParams = {
      providerId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = {
      /** @format uuid */
      cityId?: string | null;
    };
    export type RequestHeaders = {};
    export type ResponseBody = ProviderCityUpdateResponseDto;
  }
}

export namespace Chat {
  /**
   * No description
   * @tags chat
   * @name ChatControllerListRequestConversations
   * @request GET:/chat/requests/{id}/conversations
   * @response `200` `(ServiceRequestConversationListItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerListRequestConversations {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceRequestConversationListItemDto[];
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerEnsure
   * @request POST:/chat/ensure
   * @response `200` `ChatEnsureResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerEnsure {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ChatEnsureBodyDto;
    export type RequestHeaders = {};
    export type ResponseBody = ChatEnsureResponseDto;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerListMessages
   * @request GET:/chat/conversations/{conversationId}/messages
   * @response `200` `(ChatMessageDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerListMessages {
    export type RequestParams = {
      conversationId: string;
    };
    export type RequestQuery = {
      before?: string;
      after?: string;
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ChatMessageDto[];
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerPostMessage
   * @request POST:/chat/conversations/{conversationId}/messages
   * @response `200` `ChatPostMessageResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerPostMessage {
    export type RequestParams = {
      conversationId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ChatPostMessageBodyDto;
    export type RequestHeaders = {};
    export type ResponseBody = ChatPostMessageResponseDto;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerGetConversationAccess
   * @request GET:/chat/conversations/{conversationId}/access
   * @response `200` `ChatConversationAccessDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerGetConversationAccess {
    export type RequestParams = {
      conversationId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ChatConversationAccessDto;
  }

  /**
   * No description
   * @tags chat
   * @name ChatControllerMarkRead
   * @request POST:/chat/conversations/{conversationId}/read
   * @response `200` `ChatMarkReadResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace ChatControllerMarkRead {
    export type RequestParams = {
      conversationId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ChatMarkReadResponseDto;
  }
}

export namespace Cities {
  /**
   * No description
   * @tags cities
   * @name CitiesControllerSuggest
   * @request GET:/cities/suggest
   * @response `200` `(CitySuggestItemDto)[]`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace CitiesControllerSuggest {
    export type RequestParams = {};
    export type RequestQuery = {
      limit?: number;
      q?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CitySuggestItemDto[];
  }
}

export namespace PublicOffer {
  /**
 * No description
 * @tags public-offer
 * @name PublicOfferControllerGetCurrent
 * @request GET:/public-offer/current
 * @response `200` `{
    version: string,
    markdown: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
*/
  export namespace PublicOfferControllerGetCurrent {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = {
      version: string;
      markdown: string;
    };
  }
}

export namespace Documents {
  /**
   * No description
   * @tags documents
   * @name DocumentsControllerGetMyPassport
   * @request GET:/documents/passport/mine
   * @response `200` `PassportDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace DocumentsControllerGetMyPassport {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PassportDto;
  }

  /**
   * No description
   * @tags documents
   * @name DocumentsControllerUpsertMyPassport
   * @request PUT:/documents/passport/mine
   * @response `200` `PassportDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace DocumentsControllerUpsertMyPassport {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PassportDto;
    export type RequestHeaders = {};
    export type ResponseBody = PassportDto;
  }

  /**
   * No description
   * @tags documents
   * @name DocumentsControllerDeleteMyPassport
   * @request DELETE:/documents/passport/mine
   * @response `200` `OkResponseDto`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  export namespace DocumentsControllerDeleteMyPassport {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OkResponseDto;
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
 * @title Zemledel PRO API
 * @version 0.0.1
 * @contact
 *
 * API documentation for Zemledel PRO backend
 */
export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags app
   * @name AppControllerGetHello
   * @request GET:/
   * @response `200` `string`
   * @response `400` `ApiBadRequestErrorDto` Bad Request
   * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
   * @response `403` `ApiForbiddenErrorDto` Forbidden
   * @response `404` `ApiNotFoundErrorDto` Not Found
   * @response `409` `ApiConflictErrorDto` Conflict
   * @response `422` `ApiValidationErrorResponseDto` Validation failed
   * @response `500` `ApiInternalServerErrorDto` Internal Server Error
   */
  appControllerGetHello = (params: RequestParams = {}) =>
    this.http.request<
      string,
      | ApiBadRequestErrorDto
      | ApiUnauthorizedErrorDto
      | ApiForbiddenErrorDto
      | ApiNotFoundErrorDto
      | ApiConflictErrorDto
      | ApiValidationErrorResponseDto
      | ApiInternalServerErrorDto
    >({
      path: `/`,
      method: "GET",
      format: "json",
      ...params,
    });

  legalDocs = {
    /**
 * No description
 *
 * @tags legal-docs
 * @name LegalDocsControllerGetCurrent
 * @request GET:/legal-docs/{docId}/current
 * @response `200` `{
    id: string,
    version: string,
    title: string,
    markdown: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
 */
    legalDocsControllerGetCurrent: (
      docId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          id: string;
          version: string;
          title: string;
          markdown: string;
        },
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/legal-docs/${docId}/current`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  auth = {
    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerLogin
     * @request POST:/auth/login
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerLogin: (data: LoginDto, params: RequestParams = {}) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerSignup
     * @request POST:/auth/signup
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerSignup: (data: SignupDto, params: RequestParams = {}) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/signup`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerGetContext
     * @request GET:/auth/context
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerGetContext: (params: RequestParams = {}) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/context`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerListLinkedProviders
     * @request GET:/auth/providers
     * @response `200` `LinkedAuthProvidersDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerListLinkedProviders: (params: RequestParams = {}) =>
      this.http.request<
        LinkedAuthProvidersDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/providers`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerLinkGosuslugi
     * @request POST:/auth/providers/gosuslugi/link
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerLinkGosuslugi: (
      data: {
        externalSubject: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/providers/gosuslugi/link`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerUnlinkGosuslugi
     * @request POST:/auth/providers/gosuslugi/unlink
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerUnlinkGosuslugi: (params: RequestParams = {}) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/providers/gosuslugi/unlink`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name AuthControllerVerifyGosuslugiStepUp
     * @request POST:/auth/step-up/gosuslugi/verify
     * @response `200` `AuthorizedUserDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    authControllerVerifyGosuslugiStepUp: (
      data: {
        externalSubject: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        AuthorizedUserDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/auth/step-up/gosuslugi/verify`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  services = {
    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetPublicServices
     * @request GET:/services
     * @response `200` `(ServiceDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetPublicServices: (params: RequestParams = {}) =>
      this.http.request<
        ServiceDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/services`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetPublicServiceById
     * @request GET:/services/{id}
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Service not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetPublicServiceById: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/services/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCreateFromService
     * @request POST:/services/{id}/requests
     * @response `201` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCreateFromService: (
      id: string,
      data: RequestServiceCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/services/${id}/requests`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  admin = {
    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetAdminServices
     * @request GET:/admin/services
     * @response `200` `(ServiceDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetAdminServices: (params: RequestParams = {}) =>
      this.http.request<
        ServiceDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/services`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerCreateAdminService
     * @request POST:/admin/services
     * @response `201` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerCreateAdminService: (
      data: ServiceCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/services`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetAdminServiceById
     * @request GET:/admin/services/{id}
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Service not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetAdminServiceById: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/services/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerUpdateAdminService
     * @request PATCH:/admin/services/{id}
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerUpdateAdminService: (
      id: string,
      data: ServicePatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/services/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerDeleteAdminService
     * @request DELETE:/admin/services/{id}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerDeleteAdminService: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/services/${id}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerGetAdminCategories
     * @request GET:/admin/service-categories
     * @response `200` `(ServiceCategoryDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerGetAdminCategories: (
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceCategoryDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/service-categories`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerCreateAdminCategory
     * @request POST:/admin/service-categories
     * @response `201` `ServiceCategoryDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerCreateAdminCategory: (
      data: ServiceCategoryCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceCategoryDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/service-categories`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerPatchAdminCategory
     * @request PATCH:/admin/service-categories/{id}
     * @response `200` `ServiceCategoryDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Category not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerPatchAdminCategory: (
      id: string,
      data: ServiceCategoryPatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceCategoryDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/service-categories/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerDeleteAdminCategory
     * @request DELETE:/admin/service-categories/{id}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerDeleteAdminCategory: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/service-categories/${id}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerGetAdminRequests
     * @request GET:/admin/requests
     * @response `200` `(RequestCustomerDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerGetAdminRequests: (params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/admin/requests`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  pro = {
    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetProServices
     * @request GET:/pro/services
     * @response `200` `(ServiceDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetProServices: (params: RequestParams = {}) =>
      this.http.request<
        ServiceDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerCreateProService
     * @request POST:/pro/services
     * @response `201` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerCreateProService: (
      data: ServiceCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerGetProServiceById
     * @request GET:/pro/services/{id}
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Service not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerGetProServiceById: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerUpdateProService
     * @request PATCH:/pro/services/{id}
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerUpdateProService: (
      id: string,
      data: ServicePatchDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerDeleteProService
     * @request DELETE:/pro/services/{id}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerDeleteProService: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services/${id}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerUploadProServiceImage
     * @request POST:/pro/services/{id}/image
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerUploadProServiceImage: (
      id: string,
      data: {
        /** @format binary */
        file: File;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services/${id}/image`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesControllerDeleteProServiceImage
     * @request DELETE:/pro/services/{id}/image
     * @response `200` `ServiceDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    servicesControllerDeleteProServiceImage: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/services/${id}/image`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProFeed
     * @request GET:/pro/requests/feed
     * @response `200` `(RequestProDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProFeed: (params: RequestParams = {}) =>
      this.http.request<
        RequestProDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/feed`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProInbox
     * @request GET:/pro/requests/inbox
     * @response `200` `(RequestProDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProInbox: (
      query?: {
        dialogScope?: string;
        categoryId?: string;
        status?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestProDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/inbox`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerEligibleCategories
     * @request GET:/pro/requests/eligible-categories
     * @response `200` `(ProEligibleCategoryDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerEligibleCategories: (params: RequestParams = {}) =>
      this.http.request<
        ProEligibleCategoryDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/eligible-categories`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerGetInboxSettings
     * @request GET:/pro/inbox-settings
     * @response `200` `ProInboxSettingsDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerGetInboxSettings: (params: RequestParams = {}) =>
      this.http.request<
        ProInboxSettingsDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/inbox-settings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerSetInboxSettings
     * @request PUT:/pro/inbox-settings
     * @response `200` `ProInboxSettingsDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerSetInboxSettings: (
      data: ProInboxSettingsUpdateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProInboxSettingsDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/inbox-settings`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProById
     * @request GET:/pro/requests/{id}
     * @response `200` `RequestProDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Request not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProById: (id: string, params: RequestParams = {}) =>
      this.http.request<
        RequestProDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProSetTerms
     * @request POST:/pro/requests/{id}/set-terms
     * @response `200` `RequestProDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProSetTerms: (
      id: string,
      data: {
        dealTerms: Record<string, any>;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestProDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/set-terms`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProDeclineOffer
     * @request POST:/pro/requests/{id}/decline-offer
     * @response `200` `RequestProDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProDeclineOffer: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestProDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/decline-offer`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerListProRemarks
     * @request GET:/pro/requests/{id}/remarks
     * @response `200` `(RequestRemarkDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerListProRemarks: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/remarks`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCreateProRemark
     * @request POST:/pro/requests/{id}/remarks
     * @response `200` `RequestRemarkDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCreateProRemark: (
      id: string,
      data: RequestRemarkCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/remarks`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCompleteProRemark
     * @request POST:/pro/requests/{id}/remarks/{remarkId}/complete
     * @response `200` `RequestRemarkDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCompleteProRemark: (
      id: string,
      remarkId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/remarks/${remarkId}/complete`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerGetProOrders
     * @request GET:/pro/requests
     * @response `200` `(RequestCustomerDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerGetProOrders: (params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerGetProOrderById
     * @request GET:/pro/requests/by-id/{id}
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerGetProOrderById: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/by-id/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProStartWork
     * @request POST:/pro/requests/{id}/start-work
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProStartWork: (id: string, params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/start-work`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProMarkRendered
     * @request POST:/pro/requests/{id}/mark-rendered
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProMarkRendered: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/mark-rendered`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProRequestAcceptance
     * @request POST:/pro/requests/{id}/request-acceptance
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProRequestAcceptance: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/request-acceptance`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerProComplete
     * @request POST:/pro/requests/{id}/complete
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerProComplete: (id: string, params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/complete`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags documents
     * @name DocumentsControllerGetPassportForProvider
     * @request GET:/pro/requests/{id}/passport
     * @response `200` `PassportDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    documentsControllerGetPassportForProvider: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        PassportDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${id}/passport`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerListForProvider
     * @request GET:/pro/requests/{requestId}/contract-files
     * @response `200` `(ContractFileItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerListForProvider: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractFileItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/contract-files`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerUploadForProvider
     * @request POST:/pro/requests/{requestId}/contract-files
     * @response `200` `ContractFilesUploadResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerUploadForProvider: (
      requestId: string,
      data: {
        files: File[];
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractFilesUploadResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/contract-files`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerListMiscForProvider
     * @request GET:/pro/requests/{requestId}/provider-misc
     * @response `200` `(ContractFileItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerListMiscForProvider: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractFileItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/provider-misc`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerUploadMiscForProvider
     * @request POST:/pro/requests/{requestId}/provider-misc
     * @response `200` `ContractFilesUploadResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerUploadMiscForProvider: (
      requestId: string,
      data: {
        files: File[];
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractFilesUploadResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/provider-misc`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerListBundlesForProvider
     * @request GET:/pro/requests/{requestId}/contract-bundles
     * @response `200` `(ContractBundleItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerListBundlesForProvider: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractBundleItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/contract-bundles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
 * No description
 *
 * @tags ContractFiles, contract-files
 * @name ContractFilesControllerUploadBundleForProvider
 * @request POST:/pro/requests/{requestId}/contract-bundles
 * @response `200` `{
  /** @format uuid *\/
    bundleId: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
 */
    contractFilesControllerUploadBundleForProvider: (
      requestId: string,
      data: {
        /** @format binary */
        document: File;
        /** @format binary */
        signature: File;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          /** @format uuid */
          bundleId: string;
        },
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/contract-bundles`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerDeleteBundleForProvider
     * @request DELETE:/pro/requests/{requestId}/contract-bundles/{bundleId}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerDeleteBundleForProvider: (
      requestId: string,
      bundleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/contract-bundles/${bundleId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerDownloadProvider
     * @request GET:/pro/contract-files/{fileId}/download
     * @response `200` `File`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerDownloadProvider: (
      fileId: string,
      query?: {
        inline?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        Blob,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/contract-files/${fileId}/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerDeleteProvider
     * @request DELETE:/pro/contract-files/{fileId}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerDeleteProvider: (
      fileId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/contract-files/${fileId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerListForProvider
     * @request GET:/pro/requests/{requestId}/document-requests
     * @response `200` `(RequestDocumentRequestItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerListForProvider: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestDocumentRequestItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/document-requests`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerCreateForProvider
     * @request POST:/pro/requests/{requestId}/document-requests
     * @response `200` `RequestDocumentRequestItemDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerCreateForProvider: (
      requestId: string,
      data: CreateRequestDocumentRequestDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestDocumentRequestItemDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/document-requests`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerDeleteForProvider
     * @request DELETE:/pro/requests/{requestId}/document-requests/{docRequestId}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerDeleteForProvider: (
      requestId: string,
      docRequestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/document-requests/${docRequestId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerDownloadProvider
     * @request GET:/pro/document-requests/{docRequestId}/download
     * @response `200` `File`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerDownloadProvider: (
      docRequestId: string,
      query?: {
        inline?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        Blob,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/document-requests/${docRequestId}/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerListAll
     * @request GET:/pro/reminders
     * @response `200` `(ReminderDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerListAll: (params: RequestParams = {}) =>
      this.http.request<
        ReminderDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/reminders`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerListToday
     * @request GET:/pro/reminders/today
     * @response `200` `(ReminderDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerListToday: (params: RequestParams = {}) =>
      this.http.request<
        ReminderDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/reminders/today`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerListWorkday
     * @request GET:/pro/reminders/workday
     * @response `200` `(ReminderDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerListWorkday: (params: RequestParams = {}) =>
      this.http.request<
        ReminderDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/reminders/workday`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerListForRequest
     * @request GET:/pro/requests/{requestId}/reminders
     * @response `200` `(ReminderDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerListForRequest: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ReminderDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/reminders`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerCreate
     * @request POST:/pro/requests/{requestId}/reminders
     * @response `200` `ReminderDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerCreate: (
      requestId: string,
      data: CreateReminderDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ReminderDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/requests/${requestId}/reminders`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerUpdate
     * @request PATCH:/pro/reminders/{id}
     * @response `200` `ReminderDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerUpdate: (
      id: string,
      data: UpdateReminderDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ReminderDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/reminders/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags reminders
     * @name RemindersControllerDelete
     * @request DELETE:/pro/reminders/{id}
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    remindersControllerDelete: (id: string, params: RequestParams = {}) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/pro/reminders/${id}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),
  };
  serviceCategories = {
    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerGetPublicCategories
     * @request GET:/service-categories
     * @response `200` `(ServiceCategoryDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerGetPublicCategories: (
      query?: {
        placement?: ServiceCategoriesControllerGetPublicCategoriesParamsPlacementEnum;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceCategoryDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/service-categories`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerGetPublicCategoryById
     * @request GET:/service-categories/{id}
     * @response `200` `ServiceCategoryDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Category not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerGetPublicCategoryById: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceCategoryDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/service-categories/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-categories
     * @name ServiceCategoriesControllerGetProvidersForCategory
     * @request GET:/service-categories/{id}/providers
     * @response `200` `(CategoryProviderServiceDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Category not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    serviceCategoriesControllerGetProvidersForCategory: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        CategoryProviderServiceDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/service-categories/${id}/providers`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCreateFromCategory
     * @request POST:/service-categories/{id}/requests
     * @response `201` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCreateFromCategory: (
      id: string,
      data: RequestCategoryCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/service-categories/${id}/requests`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  requests = {
    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCreateUnlinked
     * @request POST:/requests
     * @response `201` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCreateUnlinked: (
      data: RequestUnlinkedCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerListMine
     * @request GET:/requests/mine
     * @response `200` `(RequestCustomerDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerListMine: (params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerMineById
     * @request GET:/requests/mine/{id}
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Request not found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerMineById: (id: string, params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCustomerInitiateOrder
     * @request POST:/requests/mine/{id}/initiate-order
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCustomerInitiateOrder: (
      id: string,
      data: {
        conversationId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/initiate-order`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCustomerAcceptTerms
     * @request POST:/requests/mine/{id}/accept-terms
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCustomerAcceptTerms: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/accept-terms`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCustomerSelectProvider
     * @request POST:/requests/mine/{id}/select-provider
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCustomerSelectProvider: (
      id: string,
      data: {
        /** @format uuid */
        providerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/select-provider`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCustomerAcceptContract
     * @request POST:/requests/mine/{id}/accept-contract
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCustomerAcceptContract: (
      id: string,
      data: {
        termsVersion: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/accept-contract`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerAcceptResult
     * @request POST:/requests/mine/{id}/accept-result
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerAcceptResult: (id: string, params: RequestParams = {}) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/accept-result`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerSendRemarks
     * @request POST:/requests/mine/{id}/send-remarks
     * @response `200` `RequestCustomerDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerSendRemarks: (
      id: string,
      data: {
        /** @minLength 3 */
        remarks?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestCustomerDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/send-remarks`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerListMineRemarks
     * @request GET:/requests/mine/{id}/remarks
     * @response `200` `(RequestRemarkDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerListMineRemarks: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/remarks`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCreateMineRemark
     * @request POST:/requests/mine/{id}/remarks
     * @response `200` `RequestRemarkDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCreateMineRemark: (
      id: string,
      data: RequestRemarkCreateDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/remarks`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags requests
     * @name RequestsControllerCompleteMineRemark
     * @request POST:/requests/mine/{id}/remarks/{remarkId}/complete
     * @response `200` `RequestRemarkDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestsControllerCompleteMineRemark: (
      id: string,
      remarkId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestRemarkDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${id}/remarks/${remarkId}/complete`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerListBundlesForCustomer
     * @request GET:/requests/mine/{requestId}/contract-bundles
     * @response `200` `(ContractBundleItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerListBundlesForCustomer: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractBundleItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-bundles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerApproveBundle
     * @request POST:/requests/mine/{requestId}/contract-bundles/{bundleId}/approve
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerApproveBundle: (
      requestId: string,
      bundleId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-bundles/${bundleId}/approve`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles, contract-files
     * @name ContractFilesControllerRequestBundleRevision
     * @request POST:/requests/mine/{requestId}/contract-bundles/{bundleId}/revision
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerRequestBundleRevision: (
      requestId: string,
      bundleId: string,
      data: {
        /** @minLength 3 */
        message: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-bundles/${bundleId}/revision`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerListForCustomer
     * @request GET:/requests/mine/{requestId}/contract-files
     * @response `200` `(ContractFileItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerListForCustomer: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ContractFileItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-files`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerApprove
     * @request POST:/requests/mine/{requestId}/contract-files/{fileId}/approve
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerApprove: (
      requestId: string,
      fileId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-files/${fileId}/approve`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerRequestRevision
     * @request POST:/requests/mine/{requestId}/contract-files/{fileId}/revision
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerRequestRevision: (
      requestId: string,
      fileId: string,
      data: {
        /** @minLength 3 */
        message: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-files/${fileId}/revision`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ContractFiles
     * @name ContractFilesControllerDownloadCustomer
     * @request GET:/requests/mine/{requestId}/contract-files/{fileId}/download
     * @response `200` `File`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    contractFilesControllerDownloadCustomer: (
      requestId: string,
      fileId: string,
      query?: {
        inline?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        Blob,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/contract-files/${fileId}/download`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerListForCustomer
     * @request GET:/requests/mine/{requestId}/document-requests
     * @response `200` `(RequestDocumentRequestItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerListForCustomer: (
      requestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        RequestDocumentRequestItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/document-requests`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerUploadForCustomer
     * @request POST:/requests/mine/{requestId}/document-requests/{docRequestId}/upload
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerUploadForCustomer: (
      requestId: string,
      docRequestId: string,
      data: {
        /** @format binary */
        file: File;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/document-requests/${docRequestId}/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerDeleteFileForCustomer
     * @request DELETE:/requests/mine/{requestId}/document-requests/{docRequestId}/file
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerDeleteFileForCustomer: (
      requestId: string,
      docRequestId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/document-requests/${docRequestId}/file`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags request-document-requests
     * @name RequestDocumentRequestsControllerDownloadCustomer
     * @request GET:/requests/mine/{requestId}/document-requests/{docRequestId}/download
     * @response `200` `File`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    requestDocumentRequestsControllerDownloadCustomer: (
      requestId: string,
      docRequestId: string,
      query?: {
        inline?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        Blob,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/requests/mine/${requestId}/document-requests/${docRequestId}/download`,
        method: "GET",
        query: query,
        ...params,
      }),
  };
  users = {
    /**
     * No description
     *
     * @tags users
     * @name UsersControllerGetUsers
     * @request GET:/users
     * @response `200` `(UserListItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    usersControllerGetUsers: (params: RequestParams = {}) =>
      this.http.request<
        UserListItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/users`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags users
     * @name UsersControllerCreateUser
     * @request POST:/users
     * @response `201` `UserListItemDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    usersControllerCreateUser: (
      data: CreateUserDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        UserListItemDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/users`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags users
     * @name UsersControllerUpdateMe
     * @request PATCH:/users/me
     * @response `200` `UserMeProfileDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    usersControllerUpdateMe: (
      data: {
        /** @format uuid */
        customerCityId?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        UserMeProfileDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/users/me`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags users
     * @name UsersControllerUploadMyImage
     * @request POST:/users/me/image
     * @response `200` `UserImageDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    usersControllerUploadMyImage: (
      data: {
        /** @format binary */
        file: File;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        UserImageDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/users/me/image`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags users
     * @name UsersControllerDeleteMyImage
     * @request DELETE:/users/me/image
     * @response `200` `UserImageDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    usersControllerDeleteMyImage: (params: RequestParams = {}) =>
      this.http.request<
        UserImageDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/users/me/image`,
        method: "DELETE",
        format: "json",
        ...params,
      }),
  };
  providers = {
    /**
 * No description
 *
 * @tags providers
 * @name ProvidersControllerCreateProvider
 * @request POST:/providers
 * @response `201` `{
    provider: ProviderDto,
    authContext: AuthorizedUserDto,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
 */
    providersControllerCreateProvider: (
      data: CreateProviderDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        {
          provider: ProviderDto;
          authContext: AuthorizedUserDto;
        },
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerCheckSlugAvailability
     * @request GET:/providers/slug-check
     * @response `200` `ProviderSlugCheckDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerCheckSlugAvailability: (
      query: {
        slug: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderSlugCheckDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/slug-check`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerGetMyProviders
     * @request GET:/providers/mine
     * @response `200` `(ProviderMembershipListItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerGetMyProviders: (params: RequestParams = {}) =>
      this.http.request<
        ProviderMembershipListItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/mine`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerActivateProvider
     * @request POST:/providers/{providerId}/activate
     * @response `200` `ProviderActivateResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerActivateProvider: (
      providerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderActivateResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/${providerId}/activate`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerGetProviderMembers
     * @request GET:/providers/{providerId}/members
     * @response `200` `ProviderMembersResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerGetProviderMembers: (
      providerId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderMembersResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/${providerId}/members`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerAddProviderManager
     * @request POST:/providers/{providerId}/members
     * @response `201` `ProviderMemberDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerAddProviderManager: (
      providerId: string,
      data: AddProviderManagerDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderMemberDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/${providerId}/members`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerUpdateProviderSlug
     * @request PATCH:/providers/{providerId}/slug
     * @response `200` `ProviderSlugUpdateResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerUpdateProviderSlug: (
      providerId: string,
      data: {
        slug: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderSlugUpdateResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/${providerId}/slug`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags providers
     * @name ProvidersControllerUpdateProviderCity
     * @request PATCH:/providers/{providerId}/city
     * @response `200` `ProviderCityUpdateResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    providersControllerUpdateProviderCity: (
      providerId: string,
      data: {
        /** @format uuid */
        cityId?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ProviderCityUpdateResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/providers/${providerId}/city`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  chat = {
    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerListRequestConversations
     * @request GET:/chat/requests/{id}/conversations
     * @response `200` `(ServiceRequestConversationListItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerListRequestConversations: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ServiceRequestConversationListItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/requests/${id}/conversations`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerEnsure
     * @request POST:/chat/ensure
     * @response `200` `ChatEnsureResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerEnsure: (
      data: ChatEnsureBodyDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ChatEnsureResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/ensure`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerListMessages
     * @request GET:/chat/conversations/{conversationId}/messages
     * @response `200` `(ChatMessageDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerListMessages: (
      conversationId: string,
      query?: {
        before?: string;
        after?: string;
        limit?: number;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        ChatMessageDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/conversations/${conversationId}/messages`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerPostMessage
     * @request POST:/chat/conversations/{conversationId}/messages
     * @response `200` `ChatPostMessageResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerPostMessage: (
      conversationId: string,
      data: ChatPostMessageBodyDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ChatPostMessageResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/conversations/${conversationId}/messages`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerGetConversationAccess
     * @request GET:/chat/conversations/{conversationId}/access
     * @response `200` `ChatConversationAccessDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerGetConversationAccess: (
      conversationId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ChatConversationAccessDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/conversations/${conversationId}/access`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags chat
     * @name ChatControllerMarkRead
     * @request POST:/chat/conversations/{conversationId}/read
     * @response `200` `ChatMarkReadResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    chatControllerMarkRead: (
      conversationId: string,
      params: RequestParams = {},
    ) =>
      this.http.request<
        ChatMarkReadResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/chat/conversations/${conversationId}/read`,
        method: "POST",
        format: "json",
        ...params,
      }),
  };
  cities = {
    /**
     * No description
     *
     * @tags cities
     * @name CitiesControllerSuggest
     * @request GET:/cities/suggest
     * @response `200` `(CitySuggestItemDto)[]`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    citiesControllerSuggest: (
      query?: {
        limit?: number;
        q?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<
        CitySuggestItemDto[],
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/cities/suggest`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
  publicOffer = {
    /**
 * No description
 *
 * @tags public-offer
 * @name PublicOfferControllerGetCurrent
 * @request GET:/public-offer/current
 * @response `200` `{
    version: string,
    markdown: string,

}`
 * @response `400` `ApiBadRequestErrorDto` Bad Request
 * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
 * @response `403` `ApiForbiddenErrorDto` Forbidden
 * @response `404` `ApiNotFoundErrorDto` Not Found
 * @response `409` `ApiConflictErrorDto` Conflict
 * @response `422` `ApiValidationErrorResponseDto` Validation failed
 * @response `500` `ApiInternalServerErrorDto` Internal Server Error
 */
    publicOfferControllerGetCurrent: (params: RequestParams = {}) =>
      this.http.request<
        {
          version: string;
          markdown: string;
        },
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/public-offer/current`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  documents = {
    /**
     * No description
     *
     * @tags documents
     * @name DocumentsControllerGetMyPassport
     * @request GET:/documents/passport/mine
     * @response `200` `PassportDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    documentsControllerGetMyPassport: (params: RequestParams = {}) =>
      this.http.request<
        PassportDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/documents/passport/mine`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags documents
     * @name DocumentsControllerUpsertMyPassport
     * @request PUT:/documents/passport/mine
     * @response `200` `PassportDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    documentsControllerUpsertMyPassport: (
      data: PassportDto,
      params: RequestParams = {},
    ) =>
      this.http.request<
        PassportDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/documents/passport/mine`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags documents
     * @name DocumentsControllerDeleteMyPassport
     * @request DELETE:/documents/passport/mine
     * @response `200` `OkResponseDto`
     * @response `400` `ApiBadRequestErrorDto` Bad Request
     * @response `401` `ApiUnauthorizedErrorDto` Unauthorized
     * @response `403` `ApiForbiddenErrorDto` Forbidden
     * @response `404` `ApiNotFoundErrorDto` Not Found
     * @response `409` `ApiConflictErrorDto` Conflict
     * @response `422` `ApiValidationErrorResponseDto` Validation failed
     * @response `500` `ApiInternalServerErrorDto` Internal Server Error
     */
    documentsControllerDeleteMyPassport: (params: RequestParams = {}) =>
      this.http.request<
        OkResponseDto,
        | ApiBadRequestErrorDto
        | ApiUnauthorizedErrorDto
        | ApiForbiddenErrorDto
        | ApiNotFoundErrorDto
        | ApiConflictErrorDto
        | ApiValidationErrorResponseDto
        | ApiInternalServerErrorDto
      >({
        path: `/documents/passport/mine`,
        method: "DELETE",
        format: "json",
        ...params,
      }),
  };
}
