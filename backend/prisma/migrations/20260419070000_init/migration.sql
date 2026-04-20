-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PLATFORM_ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('SELF_EMPLOYED', 'COMPANY');

-- CreateEnum
CREATE TYPE "ProviderMemberRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "ProviderMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'DISCUSSING', 'TERMS_AGREED', 'PROVIDER_SELECTED', 'CONTRACT_ACCEPTED', 'LOCKED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'ACTIVE', 'SERVICE_RENDERED', 'ACCEPTANCE_PENDING', 'ACCEPTED', 'PAID', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ServiceRequestProviderOfferStatus" AS ENUM ('SELECTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ServiceCategoryPlacement" AS ENUM ('HOME');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'CUSTOMER',
    "passwordHash" TEXT,
    "phone" TEXT,
    "activeProviderId" UUID,
    "customerCityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderUserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER,
    "placements" "ServiceCategoryPlacement"[] DEFAULT ARRAY[]::"ServiceCategoryPlacement"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" UUID NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
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
    "lockedAt" TIMESTAMP(3),
    "dealTerms" JSONB,
    "offerVersion" TEXT,
    "contractAcceptedAt" TIMESTAMP(3),
    "contractAcceptedByUserId" UUID,
    "acceptanceRequestedAt" TIMESTAMP(3),
    "autoAcceptAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEvent" (
    "id" UUID NOT NULL,
    "serviceRequestId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorProviderId" UUID,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestProviderOffer" (
    "id" UUID NOT NULL,
    "serviceRequestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "ServiceRequestProviderOfferStatus" NOT NULL DEFAULT 'SELECTED',
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequestProviderOffer_pkey" PRIMARY KEY ("id")
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
    "reviewCount" INTEGER,
    "ctaText" TEXT NOT NULL,
    "ctaHref" TEXT,
    "description" TEXT,
    "highlight" TEXT,
    "badge" TEXT,
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
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "serviceRequestId" UUID NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "City_garObjectId_key" ON "City"("garObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "City_objectGuid_key" ON "City"("objectGuid");

-- CreateIndex
CREATE INDEX "City_regionCode_idx" ON "City"("regionCode");

-- CreateIndex
CREATE INDEX "City_regionCode_name_idx" ON "City"("regionCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- CreateIndex
CREATE INDEX "User_activeProviderId_idx" ON "User"("activeProviderId");

-- CreateIndex
CREATE INDEX "User_customerCityId_idx" ON "User"("customerCityId");

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
CREATE INDEX "ServiceRequest_customerUserId_status_idx" ON "ServiceRequest"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_providerId_status_idx" ON "ServiceRequest"("providerId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_categoryId_status_idx" ON "ServiceRequest"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_serviceId_status_idx" ON "ServiceRequest"("serviceId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_requestCityId_status_idx" ON "ServiceRequest"("requestCityId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_serviceRequestId_createdAt_idx" ON "ServiceRequestEvent"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_type_createdAt_idx" ON "ServiceRequestEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_actorUserId_createdAt_idx" ON "ServiceRequestEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_actorProviderId_createdAt_idx" ON "ServiceRequestEvent"("actorProviderId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestProviderOffer_serviceRequestId_status_idx" ON "ServiceRequestProviderOffer"("serviceRequestId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequestProviderOffer_providerId_status_idx" ON "ServiceRequestProviderOffer"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestProviderOffer_serviceRequestId_providerId_key" ON "ServiceRequestProviderOffer"("serviceRequestId", "providerId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE INDEX "Service_providerId_status_idx" ON "Service"("providerId", "status");

-- CreateIndex
CREATE INDEX "Conversation_providerId_idx" ON "Conversation"("providerId");

-- CreateIndex
CREATE INDEX "Conversation_customerUserId_idx" ON "Conversation"("customerUserId");

-- CreateIndex
CREATE INDEX "Conversation_serviceRequestId_idx" ON "Conversation"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_serviceRequestId_providerId_key" ON "Conversation"("serviceRequestId", "providerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_senderUserId_clientMessageId_key" ON "Message"("conversationId", "senderUserId", "clientMessageId");

-- CreateIndex
CREATE INDEX "ConversationReadState_userId_idx" ON "ConversationReadState"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeProviderId_fkey" FOREIGN KEY ("activeProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerCityId_fkey" FOREIGN KEY ("customerCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requestCityId_fkey" FOREIGN KEY ("requestCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestProviderOffer" ADD CONSTRAINT "ServiceRequestProviderOffer_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestProviderOffer" ADD CONSTRAINT "ServiceRequestProviderOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
