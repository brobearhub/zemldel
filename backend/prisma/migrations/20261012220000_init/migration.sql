-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PLATFORM_ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('SELF_EMPLOYED', 'COMPANY');

-- CreateEnum
CREATE TYPE "ProviderMemberRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "ProviderMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'DISCUSSING', 'TERMS_AGREED', 'ACTIVE', 'ACCEPTANCE_PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestProviderOfferStatus" AS ENUM ('SELECTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuthProviderKey" AS ENUM ('GOSUSLUGI');

-- CreateEnum
CREATE TYPE "RequestContractFileStatus" AS ENUM ('PENDING_CUSTOMER', 'APPROVED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "RequestContractFileRole" AS ENUM ('CONTRACT_DOCUMENT', 'CONTRACT_SIGNATURE', 'PROVIDER_MISC');

-- CreateEnum
CREATE TYPE "RequestDocumentRequestStatus" AS ENUM ('REQUESTED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "RequestRemarkStatus" AS ENUM ('OPEN', 'DONE');

-- CreateEnum
CREATE TYPE "RequestRemarkAuthorSide" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "ReviewDirection" AS ENUM ('CUSTOMER_TO_PROVIDER', 'PROVIDER_TO_CUSTOMER');

-- CreateEnum
CREATE TYPE "StoryAuthorType" AS ENUM ('USER', 'PROVIDER');

-- CreateEnum
CREATE TYPE "WorkStageLifecycle" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "WorkStageDocSlotStatus" AS ENUM ('REQUESTED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "LegalDocId" AS ENUM ('TERMS', 'PRIVACY', 'CONSENT', 'OFFER');

-- CreateEnum
CREATE TYPE "LegalAcceptanceContext" AS ENUM ('SIGNUP', 'PROVIDER_ONBOARDING', 'CONTRACT');

-- CreateEnum
CREATE TYPE "CityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CityImportEventType" AS ENUM ('ADDED', 'DEACTIVATED', 'REACTIVATED', 'UPDATED');

-- CreateEnum
CREATE TYPE "RequestPaymentType" AS ENUM ('CONTRACT', 'OTHER');

-- CreateTable
CREATE TABLE "City" (
    "id" UUID NOT NULL,
    "garObjectId" BIGINT NOT NULL,
    "objectGuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "status" "CityStatus" NOT NULL DEFAULT 'ACTIVE',
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalCapital" (
    "cityId" UUID NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RegionalCapital_pkey" PRIMARY KEY ("cityId")
);

-- CreateTable
CREATE TABLE "CityImportRun" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "snapshotCount" INTEGER NOT NULL,
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "deactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "reactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CityImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityImportEvent" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "cityId" UUID,
    "garObjectId" BIGINT NOT NULL,
    "eventType" "CityImportEventType" NOT NULL,
    "name" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "previousStatus" "CityStatus",
    "newStatus" "CityStatus" NOT NULL,

    CONSTRAINT "CityImportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'CUSTOMER',
    "accountKind" "AccountKind" NOT NULL DEFAULT 'CUSTOMER',
    "passwordHash" TEXT,
    "phone" TEXT,
    "activeProviderId" UUID,
    "customerCityId" UUID,
    "profilePublic" BOOLEAN NOT NULL DEFAULT false,
    "customerRating" DOUBLE PRECISION,
    "customerReviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "docId" "LegalDocId" NOT NULL,
    "version" TEXT NOT NULL,
    "context" "LegalAcceptanceContext" NOT NULL,
    "requestId" UUID,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "ownerUserId" UUID,
    "cityId" UUID,
    "image" TEXT,
    "subtitle" TEXT,
    "about" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "useOwnEmail" BOOLEAN NOT NULL DEFAULT false,
    "stats" JSONB,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderLegalProfile" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "legalName" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "legalAddress" TEXT,
    "postalAddress" TEXT,
    "bankName" TEXT,
    "bankBik" TEXT,
    "bankAccount" TEXT,
    "correspondentAccount" TEXT,
    "signerName" TEXT,
    "signerTitle" TEXT,
    "signerBasis" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLegalProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT,
    "inn" TEXT,
    "registrationAddress" TEXT,
    "postalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMember" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ProviderMemberRole" NOT NULL,
    "status" "ProviderMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUserSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "proInboxFilters" JSONB,
    "workStageStatuses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderUserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "serviceId" UUID,
    "categoryId" UUID,
    "providerId" UUID,
    "customerUserId" UUID,
    "requestCityId" UUID,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "message" TEXT,
    "location" TEXT,
    "cadastralNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lockedAt" TIMESTAMP(3),
    "dealTerms" JSONB,
    "offerVersion" TEXT,
    "termsVersion" TEXT,
    "contractAcceptedAt" TIMESTAMP(3),
    "contractAcceptedByUserId" UUID,
    "acceptanceRequestedAt" TIMESTAMP(3),
    "autoAcceptAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" UUID,
    "totalAmountRubles" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWorkStage" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "statusKey" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "lifecycle" "WorkStageLifecycle" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWorkStageFile" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageRelPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStageFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWorkStageDocSlot" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkStageDocSlotStatus" NOT NULL DEFAULT 'REQUESTED',
    "uploadedByUserId" UUID,
    "uploadedAt" TIMESTAMP(3),
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageRelPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStageDocSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestRemark" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "authorSide" "RequestRemarkAuthorSide" NOT NULL,
    "status" "RequestRemarkStatus" NOT NULL DEFAULT 'OPEN',
    "text" TEXT NOT NULL,
    "createdByUserId" UUID,
    "createdByProviderId" UUID,
    "doneByUserId" UUID,
    "doneByProviderId" UUID,
    "doneAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestPayment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "type" "RequestPaymentType" NOT NULL DEFAULT 'CONTRACT',
    "amountRubles" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorProviderId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestProviderOffer" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "RequestProviderOfferStatus" NOT NULL DEFAULT 'SELECTED',
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestProviderOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "image" TEXT,
    "stockBadge" TEXT,
    "price" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingSortScore" DOUBLE PRECISION,
    "ctaText" TEXT NOT NULL,
    "ctaHref" TEXT,
    "description" TEXT,
    "paletteColor" TEXT,
    "icon" TEXT,
    "providerId" UUID NOT NULL,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "direction" "ReviewDirection" NOT NULL,
    "providerId" UUID NOT NULL,
    "serviceId" UUID,
    "authorUserId" UUID NOT NULL,
    "subjectUserId" UUID,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" UUID NOT NULL,
    "authorType" "StoryAuthorType" NOT NULL,
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "cityId" UUID,
    "sourceStoryId" UUID,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "durationDays" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryViewEvent" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID,
    "providerId" UUID,
    "cityId" UUID,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorySave" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerId" UUID,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "StorySave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReply" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "authorType" "StoryAuthorType" NOT NULL DEFAULT 'USER',
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryComment" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "authorType" "StoryAuthorType" NOT NULL,
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCommentLike" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReplyMessage" (
    "id" UUID NOT NULL,
    "storyReplyId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReplyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryConversationRead" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "inboxKey" TEXT NOT NULL,
    "counterpartKey" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryConversationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryProfileOpen" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID,
    "providerId" UUID,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryProfileOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAuthorFollow" (
    "id" UUID NOT NULL,
    "followerUserId" UUID NOT NULL,
    "followerProviderId" UUID,
    "targetUserId" UUID,
    "targetProviderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "StoryAuthorFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAuthorUnfollow" (
    "id" UUID NOT NULL,
    "followerUserId" UUID NOT NULL,
    "followerProviderId" UUID,
    "targetUserId" UUID,
    "targetProviderId" UUID,
    "unfollowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAuthorUnfollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "clientMessageId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "replyToMessageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationReadState" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReadState_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "UserAuthProviderLink" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerKey" "AuthProviderKey" NOT NULL,
    "externalSubject" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserAuthProviderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStepUpVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerKey" "AuthProviderKey" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStepUpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "alg" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "iv" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportAccessAudit" (
    "id" UUID NOT NULL,
    "passportUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorProviderId" UUID,
    "requestId" UUID,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassportAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestContractFile" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "status" "RequestContractFileStatus" NOT NULL DEFAULT 'PENDING_CUSTOMER',
    "revisionMessage" TEXT,
    "role" "RequestContractFileRole" NOT NULL DEFAULT 'CONTRACT_DOCUMENT',
    "bundleId" UUID,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageRelPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestContractFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDocumentRequest" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "uploadedAt" TIMESTAMP(3),
    "status" "RequestDocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "title" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageRelPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestDocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestReminder" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_garObjectId_key" ON "City"("garObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "City_objectGuid_key" ON "City"("objectGuid");

-- CreateIndex
CREATE INDEX "City_regionCode_idx" ON "City"("regionCode");

-- CreateIndex
CREATE INDEX "City_regionCode_name_idx" ON "City"("regionCode", "name");

-- CreateIndex
CREATE INDEX "City_status_idx" ON "City"("status");

-- CreateIndex
CREATE INDEX "CityImportEvent_runId_eventType_idx" ON "CityImportEvent"("runId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- CreateIndex
CREATE INDEX "User_activeProviderId_idx" ON "User"("activeProviderId");

-- CreateIndex
CREATE INDEX "User_customerCityId_idx" ON "User"("customerCityId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_docId_idx" ON "LegalAcceptance"("userId", "docId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_requestId_idx" ON "LegalAcceptance"("requestId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_context_docId_idx" ON "LegalAcceptance"("context", "docId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "Provider_ownerUserId_idx" ON "Provider"("ownerUserId");

-- CreateIndex
CREATE INDEX "Provider_type_idx" ON "Provider"("type");

-- CreateIndex
CREATE INDEX "Provider_cityId_idx" ON "Provider"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderLegalProfile_providerId_key" ON "ProviderLegalProfile"("providerId");

-- CreateIndex
CREATE INDEX "ProviderLegalProfile_providerId_idx" ON "ProviderLegalProfile"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLegalProfile_userId_key" ON "CustomerLegalProfile"("userId");

-- CreateIndex
CREATE INDEX "CustomerLegalProfile_userId_idx" ON "CustomerLegalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProviderMember_userId_idx" ON "ProviderMember"("userId");

-- CreateIndex
CREATE INDEX "ProviderMember_providerId_role_status_idx" ON "ProviderMember"("providerId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMember_providerId_userId_key" ON "ProviderMember"("providerId", "userId");

-- CreateIndex
CREATE INDEX "ProviderUserSettings_userId_idx" ON "ProviderUserSettings"("userId");

-- CreateIndex
CREATE INDEX "ProviderUserSettings_providerId_idx" ON "ProviderUserSettings"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUserSettings_userId_providerId_key" ON "ProviderUserSettings"("userId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_parentId_idx" ON "ServiceCategory"("parentId");

-- CreateIndex
CREATE INDEX "ServiceCategory_slug_idx" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "Request_customerUserId_status_idx" ON "Request"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "Request_providerId_status_idx" ON "Request"("providerId", "status");

-- CreateIndex
CREATE INDEX "Request_categoryId_status_idx" ON "Request"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Request_serviceId_status_idx" ON "Request"("serviceId", "status");

-- CreateIndex
CREATE INDEX "Request_requestCityId_status_idx" ON "Request"("requestCityId", "status");

-- CreateIndex
CREATE INDEX "RequestWorkStage_requestId_sortOrder_idx" ON "RequestWorkStage"("requestId", "sortOrder");

-- CreateIndex
CREATE INDEX "RequestWorkStage_providerId_statusKey_idx" ON "RequestWorkStage"("providerId", "statusKey");

-- CreateIndex
CREATE INDEX "RequestWorkStage_requestId_lifecycle_idx" ON "RequestWorkStage"("requestId", "lifecycle");

-- CreateIndex
CREATE INDEX "RequestWorkStageFile_stageId_createdAt_idx" ON "RequestWorkStageFile"("stageId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestWorkStageDocSlot_stageId_createdAt_idx" ON "RequestWorkStageDocSlot"("stageId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestWorkStageDocSlot_stageId_status_idx" ON "RequestWorkStageDocSlot"("stageId", "status");

-- CreateIndex
CREATE INDEX "RequestRemark_requestId_createdAt_idx" ON "RequestRemark"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestRemark_requestId_status_idx" ON "RequestRemark"("requestId", "status");

-- CreateIndex
CREATE INDEX "RequestRemark_authorSide_status_idx" ON "RequestRemark"("authorSide", "status");

-- CreateIndex
CREATE INDEX "RequestPayment_requestId_paidAt_idx" ON "RequestPayment"("requestId", "paidAt");

-- CreateIndex
CREATE INDEX "RequestPayment_providerId_paidAt_idx" ON "RequestPayment"("providerId", "paidAt");

-- CreateIndex
CREATE INDEX "RequestEvent_requestId_createdAt_idx" ON "RequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestEvent_type_createdAt_idx" ON "RequestEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "RequestEvent_actorUserId_createdAt_idx" ON "RequestEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestEvent_actorProviderId_createdAt_idx" ON "RequestEvent"("actorProviderId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestProviderOffer_requestId_status_idx" ON "RequestProviderOffer"("requestId", "status");

-- CreateIndex
CREATE INDEX "RequestProviderOffer_providerId_status_idx" ON "RequestProviderOffer"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RequestProviderOffer_requestId_providerId_key" ON "RequestProviderOffer"("requestId", "providerId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE INDEX "Service_providerId_status_idx" ON "Service"("providerId", "status");

-- CreateIndex
CREATE INDEX "Service_ratingSortScore_idx" ON "Service"("ratingSortScore");

-- CreateIndex
CREATE INDEX "Review_serviceId_direction_createdAt_idx" ON "Review"("serviceId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "Review_providerId_direction_createdAt_idx" ON "Review"("providerId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "Review_subjectUserId_direction_idx" ON "Review"("subjectUserId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "Review_requestId_direction_key" ON "Review"("requestId", "direction");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "Story_cityId_publishedAt_idx" ON "Story"("cityId", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_publishedAt_idx" ON "Story"("publishedAt");

-- CreateIndex
CREATE INDEX "Story_authorUserId_publishedAt_idx" ON "Story"("authorUserId", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_providerId_publishedAt_idx" ON "Story"("providerId", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_sourceStoryId_idx" ON "Story"("sourceStoryId");

-- CreateIndex
CREATE INDEX "Story_withdrawnAt_idx" ON "Story"("withdrawnAt");

-- CreateIndex
CREATE INDEX "StoryViewEvent_storyId_viewedAt_idx" ON "StoryViewEvent"("storyId", "viewedAt");

-- CreateIndex
CREATE INDEX "StoryViewEvent_storyId_userId_idx" ON "StoryViewEvent"("storyId", "userId");

-- CreateIndex
CREATE INDEX "StoryViewEvent_userId_storyId_idx" ON "StoryViewEvent"("userId", "storyId");

-- CreateIndex
CREATE INDEX "StorySave_userId_removedAt_idx" ON "StorySave"("userId", "removedAt");

-- CreateIndex
CREATE INDEX "StorySave_providerId_removedAt_idx" ON "StorySave"("providerId", "removedAt");

-- CreateIndex
CREATE INDEX "StorySave_storyId_removedAt_idx" ON "StorySave"("storyId", "removedAt");

-- CreateIndex
CREATE INDEX "StoryReply_storyId_createdAt_idx" ON "StoryReply"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryComment_storyId_createdAt_idx" ON "StoryComment"("storyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryCommentLike_commentId_userId_key" ON "StoryCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "StoryReplyMessage_storyReplyId_createdAt_idx" ON "StoryReplyMessage"("storyReplyId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryConversationRead_userId_inboxKey_idx" ON "StoryConversationRead"("userId", "inboxKey");

-- CreateIndex
CREATE UNIQUE INDEX "StoryConversationRead_userId_inboxKey_counterpartKey_key" ON "StoryConversationRead"("userId", "inboxKey", "counterpartKey");

-- CreateIndex
CREATE INDEX "StoryProfileOpen_storyId_openedAt_idx" ON "StoryProfileOpen"("storyId", "openedAt");

-- CreateIndex
CREATE INDEX "StoryAuthorFollow_followerUserId_removedAt_idx" ON "StoryAuthorFollow"("followerUserId", "removedAt");

-- CreateIndex
CREATE INDEX "StoryAuthorFollow_targetUserId_removedAt_idx" ON "StoryAuthorFollow"("targetUserId", "removedAt");

-- CreateIndex
CREATE INDEX "StoryAuthorFollow_targetProviderId_removedAt_idx" ON "StoryAuthorFollow"("targetProviderId", "removedAt");

-- CreateIndex
CREATE INDEX "StoryAuthorUnfollow_targetUserId_unfollowedAt_idx" ON "StoryAuthorUnfollow"("targetUserId", "unfollowedAt");

-- CreateIndex
CREATE INDEX "StoryAuthorUnfollow_targetProviderId_unfollowedAt_idx" ON "StoryAuthorUnfollow"("targetProviderId", "unfollowedAt");

-- CreateIndex
CREATE INDEX "Conversation_providerId_idx" ON "Conversation"("providerId");

-- CreateIndex
CREATE INDEX "Conversation_customerUserId_idx" ON "Conversation"("customerUserId");

-- CreateIndex
CREATE INDEX "Conversation_requestId_idx" ON "Conversation"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_requestId_providerId_key" ON "Conversation"("requestId", "providerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_senderUserId_clientMessageId_key" ON "Message"("conversationId", "senderUserId", "clientMessageId");

-- CreateIndex
CREATE INDEX "ConversationReadState_userId_idx" ON "ConversationReadState"("userId");

-- CreateIndex
CREATE INDEX "UserAuthProviderLink_userId_providerKey_idx" ON "UserAuthProviderLink"("userId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthProviderLink_userId_providerKey_key" ON "UserAuthProviderLink"("userId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthProviderLink_providerKey_externalSubject_key" ON "UserAuthProviderLink"("providerKey", "externalSubject");

-- CreateIndex
CREATE INDEX "UserStepUpVerification_userId_providerKey_verifiedAt_idx" ON "UserStepUpVerification"("userId", "providerKey", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserStepUpVerification_userId_providerKey_key" ON "UserStepUpVerification"("userId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "PassportDocument_userId_key" ON "PassportDocument"("userId");

-- CreateIndex
CREATE INDEX "PassportDocument_userId_idx" ON "PassportDocument"("userId");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_passportUserId_createdAt_idx" ON "PassportAccessAudit"("passportUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_actorUserId_createdAt_idx" ON "PassportAccessAudit"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_actorProviderId_createdAt_idx" ON "PassportAccessAudit"("actorProviderId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_requestId_createdAt_idx" ON "PassportAccessAudit"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestContractFile_requestId_updatedAt_idx" ON "RequestContractFile"("requestId", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestContractFile_providerId_updatedAt_idx" ON "RequestContractFile"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestContractFile_status_updatedAt_idx" ON "RequestContractFile"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestContractFile_bundleId_updatedAt_idx" ON "RequestContractFile"("bundleId", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_requestId_createdAt_idx" ON "RequestDocumentRequest"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_requestId_status_idx" ON "RequestDocumentRequest"("requestId", "status");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_providerId_updatedAt_idx" ON "RequestDocumentRequest"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_status_updatedAt_idx" ON "RequestDocumentRequest"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestReminder_requestId_remindAt_idx" ON "RequestReminder"("requestId", "remindAt");

-- CreateIndex
CREATE INDEX "RequestReminder_providerId_remindAt_idx" ON "RequestReminder"("providerId", "remindAt");

-- CreateIndex
CREATE INDEX "RequestReminder_providerId_isDone_remindAt_idx" ON "RequestReminder"("providerId", "isDone", "remindAt");

-- AddForeignKey
ALTER TABLE "RegionalCapital" ADD CONSTRAINT "RegionalCapital_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityImportEvent" ADD CONSTRAINT "CityImportEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CityImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityImportEvent" ADD CONSTRAINT "CityImportEvent_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeProviderId_fkey" FOREIGN KEY ("activeProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerCityId_fkey" FOREIGN KEY ("customerCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderLegalProfile" ADD CONSTRAINT "ProviderLegalProfile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLegalProfile" ADD CONSTRAINT "CustomerLegalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMember" ADD CONSTRAINT "ProviderMember_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMember" ADD CONSTRAINT "ProviderMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserSettings" ADD CONSTRAINT "ProviderUserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserSettings" ADD CONSTRAINT "ProviderUserSettings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requestCityId_fkey" FOREIGN KEY ("requestCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStage" ADD CONSTRAINT "RequestWorkStage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStage" ADD CONSTRAINT "RequestWorkStage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStageFile" ADD CONSTRAINT "RequestWorkStageFile_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RequestWorkStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStageDocSlot" ADD CONSTRAINT "RequestWorkStageDocSlot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RequestWorkStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_doneByUserId_fkey" FOREIGN KEY ("doneByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_createdByProviderId_fkey" FOREIGN KEY ("createdByProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_doneByProviderId_fkey" FOREIGN KEY ("doneByProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestProviderOffer" ADD CONSTRAINT "RequestProviderOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestProviderOffer" ADD CONSTRAINT "RequestProviderOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_repliedByUserId_fkey" FOREIGN KEY ("repliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_sourceStoryId_fkey" FOREIGN KEY ("sourceStoryId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCommentLike" ADD CONSTRAINT "StoryCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "StoryComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCommentLike" ADD CONSTRAINT "StoryCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReplyMessage" ADD CONSTRAINT "StoryReplyMessage_storyReplyId_fkey" FOREIGN KEY ("storyReplyId") REFERENCES "StoryReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReplyMessage" ADD CONSTRAINT "StoryReplyMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryConversationRead" ADD CONSTRAINT "StoryConversationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_followerProviderId_fkey" FOREIGN KEY ("followerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_followerProviderId_fkey" FOREIGN KEY ("followerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReadState" ADD CONSTRAINT "ConversationReadState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReadState" ADD CONSTRAINT "ConversationReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuthProviderLink" ADD CONSTRAINT "UserAuthProviderLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStepUpVerification" ADD CONSTRAINT "UserStepUpVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportDocument" ADD CONSTRAINT "PassportDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportAccessAudit" ADD CONSTRAINT "PassportAccessAudit_passportUserId_fkey" FOREIGN KEY ("passportUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestReminder" ADD CONSTRAINT "RequestReminder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestReminder" ADD CONSTRAINT "RequestReminder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
